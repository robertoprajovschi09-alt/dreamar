## AI Core Engine — integrare OpenAI prin backend securizat

Construim un sistem complet „AI Core Engine" peste arhitectura existentă (Lovable + Supabase). Toate apelurile către OpenAI se fac **doar din edge functions**; cheia trăiește exclusiv în secrets, niciodată în frontend.

---

### 0. Securitate cheie API (înainte de orice cod)

- Rotești cheia OpenAI pe care ai postat (e publică acum).
- În build mode, voi cere prin tool-ul de secrets:
  - `OPENAI_API_KEY` (cheia nouă)
  - `OPENAI_MODEL` (default `gpt-5.2`; configurabil; fallback pe `gpt-5-mini`)
  - `OPENAI_BASE_URL` (opțional, default `https://api.openai.com/v1`)
- Edge functions citesc `Deno.env.get(...)`. Frontend nu vede niciodată cheia.

> Notă: păstrăm și `LOVABLE_API_KEY` pentru funcțiile actuale (Gemini etc.); migrăm progresiv. Coexistă curat.

---

### 1. Tabele noi în Supabase (toate cu RLS strict pe `agency_id`)

```text
ai_prompts                # versionare prompts de sistem
  id, agency_id (nullable=global), key, version, content, model,
  temperature, is_active, created_by, created_at

ai_prompt_runs            # fiecare apel OpenAI
  id, agency_id, client_id (nullable), user_id, prompt_key,
  prompt_version, model, input_messages jsonb, output_text,
  tool_calls jsonb, tokens_in, tokens_out, latency_ms,
  cost_usd numeric, status (success|error|blocked),
  error_text, safety_flags jsonb, created_at

ai_feedback               # feedback uman pe un run
  id, run_id, agency_id, user_id, rating (-1|0|1),
  category text, comment text, created_at

ai_evaluations            # evaluări automate / golden set
  id, agency_id, prompt_key, prompt_version, dataset_name,
  score numeric, metrics jsonb, created_at

ai_actions                # action approval queue
  id, agency_id, client_id, requested_by_user_id, action_type,
  payload jsonb (ce vrea AI să facă), reasoning text, run_id,
  status (pending|approved|rejected|executed|failed),
  decided_by, decided_at, executed_at, result jsonb, created_at

ai_memory                 # knowledge base / long-term memory
  id, agency_id, client_id (nullable), scope (agency|client|global),
  kind (fact|preference|playbook|doc_chunk),
  title, content text, embedding vector(1536) nullable,
  source text, created_by, created_at, updated_at

ai_audit_events           # monitoring & site/app maintainer
  id, agency_id (nullable), source (frontend|edge|cron|maintainer),
  level (info|warn|error|critical), event text, payload jsonb,
  user_id (nullable), created_at

ai_safety_rules           # guardrails configurabile
  id, agency_id (nullable=global), rule_key, description,
  pattern text, action (block|warn|require_approval),
  enabled boolean, created_at
```

RLS: pattern-ul existent — `is_member_of(auth.uid(), agency_id)` pentru CRUD agenție, `is_saas_admin` peste tot, `is_client_viewer_of` doar pentru read pe înregistrările marcate vizibile (memory cu scope client). `ai_prompt_runs`/`ai_audit_events` nu sunt vizibile clientului.

Pentru `ai_memory` cu embeddings activăm extensia `vector` (pgvector).

---

### 2. Edge functions noi (toate folosesc OpenAI)

```text
ai-core-chat             # AI Assistant agency-wide (înlocuiește treptat ai-assistant)
ai-core-complete         # one-shot completion cu prompt versionat
ai-core-embed            # creează embeddings pentru ai_memory
ai-core-rag-query        # caută în ai_memory + răspunde
ai-feedback-submit       # salvează feedback + leagă de run
ai-action-execute        # execută o ai_actions aprobată (server-side, cu RLS user)
ai-evaluate-prompt       # rulează un prompt pe golden dataset, salvează scor
ai-maintainer-scan       # cron: citește ai_audit_events + erori recente, propune fix-uri
ai-safety-check          # helper intern: rulează ai_safety_rules pe input/output
```

Toate:
- validează JWT prin `getClaims`,
- verifică `is_member_of(user, agency_id)`,
- aplică `ai-safety-check` pe input și output,
- înregistrează rezultatul în `ai_prompt_runs` + `ai_audit_events`,
- suportă streaming SSE unde e cazul,
- folosesc `OPENAI_MODEL` din env, override per request permis doar pentru saas_admin.

Apelul OpenAI:
```ts
fetch(`${BASE}/chat/completions`, {
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: JSON.stringify({ model, messages, stream, temperature })
})
```

---

### 3. Cele 10 module ale AI Core Engine

1. **AI Assistant pentru agenție** — refactor `Assistant.tsx` să cheme `ai-core-chat`. Context grounding existent (clienți, briefs, analytics, strategy) păstrat. Adăugăm tool-calling: `create_task`, `draft_strategy`, `flag_at_risk_client` — fiecare devine o cerere în `ai_actions` (nu execută direct).

2. **AI Website/App Maintainer** — pagină `/admin/ai-maintainer` (doar saas_admin):
   - listează `ai_audit_events` level ≥ warn,
   - cron `ai-maintainer-scan` (rulat manual din UI sau planificat) care trimite la OpenAI logurile recente + erorile din `supabase.edge_function_logs` (proxy via edge) și produce: cauze probabile, fix-uri propuse, prioritate.
   - rezultatele → `ai_actions` cu `action_type='code_suggestion'` (nu modifică cod, doar sugerează — codul real îl scrie omul / Lovable).

3. **AI Learning & Improvement Loop** — job nightly `ai-evaluate-prompt`:
   - rulează prompt-urile active pe un mic golden dataset stocat în `ai_evaluations.dataset_name`,
   - salvează scor + diff vs versiunea precedentă,
   - dacă scor scade → notificare în `ai_audit_events`.

4. **AI Feedback System** — buton 👍/👎 pe orice mesaj AI (chat, raport, strategy). `ai-feedback-submit` salvează în `ai_feedback` cu `run_id`. Pagină Settings → AI → Feedback Review pentru saas_admin.

5. **AI Prompt Versioning** — UI `/admin/ai-prompts` (saas_admin):
   - listă prompt-uri (`key`), versiuni, diff,
   - activare/dezactivare versiune,
   - test rapid în sandbox (cheamă `ai-core-complete` cu `prompt_version` explicit).
   - Toate edge functions citesc prompt-ul activ din `ai_prompts` în loc de string hardcodat.

6. **AI Evaluation System** — tab în `/admin/ai-prompts` cu rezultate `ai_evaluations`, grafic scor în timp, comparație versiuni.

7. **AI Memory / Knowledge Base** —
   - UI agenție `/agency/ai-memory`: adaugă fapte/playbook-uri (per agency sau per client),
   - upload doc → split + embed via `ai-core-embed`,
   - `ai-core-rag-query` injectează top-k bucăți în system prompt înainte de a chema OpenAI,
   - asistentul „își amintește" preferințele agenției/clientului între sesiuni.

8. **AI Action Approval System** — coadă `/agency/ai-actions`:
   - card per acțiune cu `action_type`, payload JSON pretty-printed, raționament AI, butoane Approve/Reject,
   - la Approve → `ai-action-execute` rulează acțiunea cu identitatea utilizatorului (insert content_post, create monthly_goal, send strategy etc.),
   - rezultat salvat în `ai_actions.result`.
   - Acțiuni „critice" (delete, send_to_client, modify billing) cer `is_owner_of`.

9. **AI Logs & Monitoring** — `/admin/ai-logs`:
   - tabel `ai_prompt_runs` (filtrare după agency, prompt_key, status, cost),
   - cost agregat lunar / per agency,
   - export CSV.
   - Pentru agency owner: vede doar runs din propria agenție.

10. **AI Safety Guardrails** —
    - `ai-safety-check` rulează `ai_safety_rules` (regex / keyword / lungime) pe input și output,
    - rule-uri default: PII (email/telefon clienți finali în output public), limbaj ofensator, încercări de prompt injection (`"ignore previous instructions"`),
    - `action=block` → 422 cu motiv; `warn` → log; `require_approval` → forțează intrare în `ai_actions`.
    - UI `/admin/ai-safety` pentru saas_admin.

---

### 4. Frontend nou / modificat

Pagini noi:
- `src/pages/admin/AiMaintainer.tsx`
- `src/pages/admin/AiPrompts.tsx`
- `src/pages/admin/AiEvaluations.tsx` (tab)
- `src/pages/admin/AiLogs.tsx`
- `src/pages/admin/AiSafety.tsx`
- `src/pages/agency/AiMemory.tsx`
- `src/pages/agency/AiActions.tsx`

Componente:
- `src/components/ai/FeedbackButtons.tsx` (👍/👎 + comentariu)
- `src/components/ai/ActionApprovalCard.tsx`
- `src/components/ai/MemoryEditor.tsx`
- `src/components/ai/PromptDiffViewer.tsx`
- `src/components/ai/RunDetailDrawer.tsx`

Modificate:
- `Assistant.tsx` → cheamă `ai-core-chat`, atașează `FeedbackButtons` pe răspunsuri.
- `AgencyLayout.tsx` → adaugă „AI Actions" + (pentru saas_admin) secțiune Admin (Prompts / Logs / Safety / Maintainer).
- Funcțiile existente care invocă `LOVABLE_API_KEY` (`generate-monthly-strategy`, `analytics-insights`, `health-score-recommendation` etc.) primesc opțiunea `provider: "openai" | "lovable"` și citesc prompt-ul din `ai_prompts` când există versiune activă. Migrare progresivă, nu big-bang.

---

### 5. Logging & cost

Fiecare apel OpenAI:
1. Înregistrează start în `ai_prompt_runs` (status `running`).
2. La răspuns: completează `tokens_in/out`, `cost_usd` (calculat după model rate hard-codat în edge), `latency_ms`, `status`.
3. Erorile OpenAI (rate limit, 5xx) → `ai_audit_events` level `error`.

---

### 6. Migrare & livrabile

Pași în build mode:
1. Cer secret `OPENAI_API_KEY` + `OPENAI_MODEL` (după ce rotezi cheia).
2. Migration SQL: cele 8 tabele noi + extensia `vector` + RLS + seed `ai_prompts` cu prompt-urile actuale extrase din funcții + seed `ai_safety_rules` default.
3. Creez 9 edge functions noi.
4. Refactor `ai-assistant` → `ai-core-chat` (păstrez vechea ca alias temporar).
5. Adaug pagini + componente UI.
6. Hook `useAiRun` pentru frontend (wrap chemările + atașează FeedbackButtons).
7. Update `AgencyLayout.tsx` cu intrările noi.
8. Documentez în `README.md` secțiunea „AI Core Engine".

---

### Out of scope (intenționat)

- Modificare automată de cod în repo (Maintainer doar sugerează).
- Fine-tuning OpenAI (folosim doar prompt versioning + RAG).
- Înlocuirea completă a Gemini imediat — coexistență controlată via `provider` flag.
- Plată per-token către clienți (avem doar cost tracking intern).
