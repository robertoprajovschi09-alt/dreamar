
# OpenAI AI Core — Edge Function unificat

Construim un singur entry-point backend pentru toate feature-urile AI, cu output JSON strict, control de rol și logging complet. Toate apelurile la OpenAI rămân pe server; cheia nu ajunge niciodată în frontend.

## 1. Bază de date — migrație nouă

Tabela nouă `ai_outputs` (separată de `ai_prompt_runs`, dedicată output-urilor structurate per feature):

```text
ai_outputs
  id uuid PK
  agency_id uuid (nullable pentru saas_admin global)
  client_id uuid nullable
  user_id uuid not null
  feature text not null            -- ex: monthly_report_generation
  context_type text                -- ex: client_dashboard, agency_overview, admin_panel
  prompt_key text
  prompt_version int
  prompt_version_id uuid FK ai_prompts(id) on delete set null
  model text
  input_payload jsonb              -- ce a trimis caller-ul (sanitizat)
  output_json jsonb                -- răspunsul structurat
  output_text text                 -- generated_text
  tokens_in int, tokens_out int
  cost_usd numeric
  latency_ms int
  status text default 'success'    -- success | blocked | error | missing_data
  error_text text
  safety_flags jsonb default '[]'
  confidence_score numeric
  missing_data jsonb default '[]'
  warnings jsonb default '[]'
  created_at timestamptz default now()
```

RLS:
- `select`: `is_saas_admin(uid) OR is_member_of(uid, agency_id) OR (client_id IS NOT NULL AND is_client_viewer_of(uid, client_id))`
- `insert`: `user_id = auth.uid()` AND (saas_admin OR membru al agency_id-ului scris)
- fără `delete` / `update` (append-only); doar saas_admin poate update pentru audit.

Index pe `(agency_id, feature, created_at desc)`, `(client_id, created_at desc)`, `(user_id)`.

## 2. Edge function nouă: `supabase/functions/openai-ai-core/index.ts`

Reutilizează helperele din `_shared/openai.ts` (deja avem `userClient`, `serviceClient`, `requireUser`, `getActivePrompt`, `runSafety`, `estimateCost`, `OPENAI_*`).

**Request body**:
```ts
{
  feature: string,            // obligatoriu, din whitelist
  agency_id?: string,         // obligatoriu (excepție: super_admin features)
  client_id?: string | null,
  input: Record<string, unknown> | string,
  context_type?: string,      // 'client_dashboard' | 'agency_overview' | 'admin_panel' | ...
  prompt_version_id?: string  // override versiune
}
```
(`user_id` îl ia din JWT, nu din body — anti-spoofing.)

**Flow**:
1. CORS preflight.
2. `requireUser` → JWT valid; `userId` din claims.
3. Citește `profiles` (role, agency_id, client_id, is_saas_admin).
4. **Whitelist feature** + maparea `feature → required_role_scope`:
   - admin-only: `lovable_fix_prompt_generator`, `website_audit` (la nivel super) → doar `saas_admin`.
   - agency-level: `monthly_report_generation`, `next_month_strategy`, `content_idea_generation`, `video_performance_analysis`, `health_score_explanation`, `risk_detector_analysis`, `competitor_insights`, `swipe_file_variations`, `analytics_interpretation`, `document_summary` → `agency_owner` / `agency_member` din agency_id-ul cerut.
   - client-visible: dacă userul e `client_viewer`, permitem doar `health_score_explanation`, `monthly_report_generation` și doar pentru `client_id`-ul de care aparține; restul → 403.
5. **Cross-agency guard**: dacă userul nu e saas_admin și `agency_id` ≠ profil/membership → 403. Dacă `client_id` setat, verifică `clients.agency_id = agency_id`.
6. Încarcă promptul:
   - dacă `prompt_version_id` → fetch by id;
   - altfel `getActivePrompt(svc, feature, agency_id)` (cheia = `feature`).
   - 404 dacă lipsește, cu hint clar.
7. Construiește **context permis** prin helper intern `loadContext(feature, role, agency_id, client_id)`:
   - client_viewer: doar date despre `client_id` propriu (KPI-uri publice ale clientului).
   - agency: date din `agency_id` (clienti, KPI agregat).
   - saas_admin: agregat global / metadata sistem.
   - dacă o sursă lipsește, adaugă în `missing_data`.
8. Safety pe input + context (`runSafety`). Dacă `block` → log status='blocked' și 422.
9. Compose messages:
   - system = `promptRow.developer_prompt || promptRow.content` + reguli globale (vezi mai jos).
   - user = JSON cu `{ feature, context_type, input, context, missing_data }`.
10. **Apel OpenAI** la `${OPENAI_BASE_URL}/chat/completions` cu:
    - `model = promptRow.model || OPENAI_MODEL || 'gpt-5.2'` (fallback in code, easy override via env).
    - `response_format: { type: 'json_object' }`.
    - `temperature = promptRow.temperature ?? 0.2`.
11. Parse JSON. Dacă fail → re-prompt cu mesaj de corecție o singură dată; dacă tot eșuează → status='error', salvează raw în `output_text`, return 502.
12. Validează cheile cerute (vezi schema mai jos); completează cu null/[] dacă lipsesc.
13. Safety pe output. Dacă `block` → status='blocked'.
14. Insert în `ai_outputs` (input sanitizat, output_json, tokens, cost via `estimateCost`, latency, status, safety_flags, confidence_score, missing_data, warnings).
15. Mirror minimal în `ai_prompt_runs` (compatibilitate cu Learning Loop existent).
16. Răspunde cu `{ output_id, output: <json structurat>, tokens, cost_usd, model, prompt_version }`.

**Reguli globale injectate în system prompt**:
- "Răspunde STRICT cu JSON valid în acest schema." + schema text.
- "Folosește doar datele primite. Dacă lipsesc, adaugă-le în `missing_data` și NU inventa cifre."
- "Nu menționa alte agenții sau date interne." (relevant când rolul e client_viewer).

**Schema răspuns enforced**:
```json
{
  "title": "string",
  "summary": "string",
  "insights": ["string"],
  "recommendations": ["string"],
  "missing_data": ["string"],
  "confidence_score": 0.0,
  "action_items": [{ "title": "string", "priority": "low|medium|high", "owner": "string|null" }],
  "warnings": ["string"],
  "generated_text": "string"
}
```

## 3. Securitate

- `OPENAI_API_KEY` rămâne secret Supabase (deja există). Nu e expus niciodată.
- Toate apelurile OpenAI se fac din această edge function.
- RLS pe `ai_outputs` + verificare aplicativă a rolului înainte de fetch context.
- Client viewer NU primește context intern (lista clienților agenției, KPI agency-wide, billing, etc.) — `loadContext` filtrează la sursă.
- Agency members NU pot citi date din alte agency_id (verificare explicită + RLS pe sursele de context).
- Saas admin nu primește date operaționale ale clienților decât prin features marcate „admin” (zonele administrative).

## 4. Frontend

- Nu modificăm UI-ul existent acum. Doar adăugăm un helper `src/lib/aiCore.ts` care invocă funcția:
```ts
supabase.functions.invoke("openai-ai-core", { body: {...} })
```
Componente existente (AiActions, AiAssistant, rapoarte) pot migra ulterior la acest endpoint unificat.

## 5. Whitelist features (constantă în function)

```ts
const FEATURES = [
  "monthly_report_generation","next_month_strategy","content_idea_generation",
  "video_performance_analysis","health_score_explanation","risk_detector_analysis",
  "website_audit","lovable_fix_prompt_generator","document_summary",
  "competitor_insights","swipe_file_variations","analytics_interpretation"
];
```
Orice `feature` în afara listei → 400.

## 6. Config

- `supabase/config.toml`: nu modificăm (deploy default `verify_jwt=false`, validăm în cod cu `getClaims`).
- Modelul se schimbă doar din env (`OPENAI_MODEL`), fallback hardcodat `gpt-5.2`.

## Files

- create `supabase/migrations/<ts>_ai_outputs.sql`
- create `supabase/functions/openai-ai-core/index.ts`
- create `src/lib/aiCore.ts`
- edit `src/integrations/supabase/types.ts` (auto-regenerate)
