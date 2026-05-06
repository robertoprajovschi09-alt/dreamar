
# AI Action Approval System

Sistem dedicat de propunere → aprobare → execuție pentru orice acțiune pe care AI-ul vrea să o facă, cu nivele de risc și reguli stricte de cine poate aproba ce. Coexistă cu vechiul `ai_actions` (rămâne intact pentru compat); tot codul nou folosește `ai_action_requests`.

## 1. Bază de date — migrație nouă

```sql
CREATE TYPE ai_action_risk AS ENUM ('low','medium','high','critical');
CREATE TYPE ai_action_request_status AS ENUM (
  'pending','approved','rejected','executed','failed','auto_executed','cancelled'
);

CREATE TABLE public.ai_action_requests (
  id uuid PK default gen_random_uuid(),
  agency_id uuid,                      -- nullable (admin-level critical)
  client_id uuid,
  requested_by_ai_output_id uuid REFERENCES ai_outputs(id) ON DELETE SET NULL,
  requested_by_user_id uuid,           -- if user-triggered
  action_type text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}',
  edited_payload jsonb,                -- for "edit before approve"
  reasoning text,                      -- AI explanation
  risk_level ai_action_risk NOT NULL DEFAULT 'medium',
  status ai_action_request_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid, approved_at timestamptz,
  rejected_by uuid, rejected_at timestamptz, rejection_reason text,
  executed_at timestamptz, execution_result jsonb, execution_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_action_requests (agency_id, status, created_at DESC);
CREATE INDEX ON ai_action_requests (status, risk_level);
```

RLS:
- `select`: saas_admin OR membru al agency_id (sau record cu agency_id NULL → doar saas_admin).
- `insert`: saas_admin OR membru al agency. Edge function folosește service role pentru AI-generated.
- `update`: saas_admin OR membru al agency (validările pentru cine poate aproba ce risk se fac în edge function — RLS lasă doar ownership-ul).
- fără `delete`.

Trigger `tg_set_updated_at` pe `updated_at`.

Setting nou pe agency pentru auto-execute low-risk: adăugăm coloana `agencies.ai_auto_execute_low boolean default false`.

## 2. Edge function: `supabase/functions/ai-action-decide/index.ts`

Un singur endpoint pentru `approve | reject | execute | auto`.

**Body**:
```ts
{ action_id: string, decision: 'approve'|'reject'|'execute', edited_payload?: any, rejection_reason?: string }
```

**Flow**:
1. Auth + load profile (role, is_saas_admin) + load action_request via service role.
2. Validare matrice risk → role (în cod):
   - `low`: orice membru agency. Dacă `agencies.ai_auto_execute_low=true` și request creat de AI, `auto` permis.
   - `medium`: membru agency.
   - `high`: doar `agency_owner` sau `saas_admin`.
   - `critical`: doar `saas_admin`.
3. Pe `approve`: setează `status='approved'`, `approved_by`, `approved_at`. Dacă `edited_payload` trimis, salvează-l.
4. Pe `reject`: `status='rejected'`, `rejected_*`, `rejection_reason`.
5. Pe `execute` (după aprobare):
   - Re-validează rolul; verifică `status='approved'`.
   - Dispatch pe `action_type` (lista sub) folosind clientul user-scoped (RLS).
   - `suggest_*` și `lovable_fix_prompt_generator` → no-op care marchează `executed_at` (review-only).
   - `update_prompt_version` și orice `*_security_change`/`*_database_change`/`*_pricing_change` → execuție blocată dacă risk≠critical sau approver nu e saas_admin → 403.
   - `send_report_to_client`, `update_prompt_version` setează `executed_at` și salvează `execution_result`.
6. Pe failure: `status='failed'`, `execution_error`.
7. Log în `ai_audit_events`.

**Action types acceptate**: `create_task`, `update_task`, `create_content_idea`, `create_calendar_item`, `generate_report`, `send_report_to_client`, `create_strategy`, `update_prompt_version`, `create_lovable_prompt`, `suggest_database_change`, `suggest_ui_change`, `suggest_pricing_change`, `suggest_security_change`. Orice action_type necunoscut → 400.

**Default risk per type** (folosit la INSERT dacă apelantul nu specifică, helper SQL `default_risk_for(text)`):
- low: `create_content_idea`, `suggest_ui_change`
- medium: `create_task`, `update_task`, `create_calendar_item`, `create_strategy`, `create_lovable_prompt`, `generate_report`
- high: `send_report_to_client`, `update_prompt_version`
- critical: `suggest_database_change`, `suggest_pricing_change`, `suggest_security_change`

## 3. Helper frontend

`src/lib/aiActionRequests.ts`:
- `requestAiAction({...})` → insert via service-role NU; folosim `supabase.from('ai_action_requests').insert(...)` (e ok, RLS permite membrilor).
- `decideAiAction(id, decision, opts)` → invoke `ai-action-decide`.

## 4. UI — Admin AI Actions

Pagină nouă `src/pages/admin/AiActionsApprovalQueue.tsx`, rută `/admin/ai-actions`, cu link în AdminLayout. Conținut:

- Filtre: `status` (pending default), `risk_level`, `agency_id` (saas_admin).
- Card per request: `title`, `risk_level` (badge color-coded), `action_type`, `description`, `reasoning` (AI), payload preview JSON colapsabil, sursa (`ai_output` link), agency/client.
- Acțiuni:
  - **Approve** (disabled dacă rolul nu permite risk-ul respectiv);
  - **Approve & Execute** (one-click);
  - **Edit & Approve** (deschide dialog cu textarea JSON pentru `edited_payload`);
  - **Reject** (dialog pentru `rejection_reason`);
  - **Execute** (apare doar pe `approved`);
- Tab „History” pentru `executed | rejected | failed`.

Și pagina existentă `src/pages/agency/AiActions.tsx` o actualizăm să folosească noul tabel `ai_action_requests` în paralel cu vechiul (fallback grațios), fără regresie.

## 5. Securitate

- AI-ul (server-side) nu execută niciodată direct; toate rutele de execuție merg prin `ai-action-decide` care necesită JWT user.
- Critical actions necesită `is_saas_admin=true` la approve ȘI la execute.
- High actions necesită `agency_owner` (verificat prin `is_owner_of`).
- Low/medium pot fi aprobate de orice agency member; auto-execute doar dacă agency a activat explicit.
- Niciun action type nu permite ștergere de date nici acum (toate handlerele fac doar insert/update controlate; suggest_* sunt review-only).
- `RLS` previne cross-agency leakage.

## Files
- create `supabase/migrations/<ts>_ai_action_requests.sql`
- create `supabase/functions/ai-action-decide/index.ts`
- create `src/lib/aiActionRequests.ts`
- create `src/pages/admin/AiActionsApprovalQueue.tsx`
- edit `src/App.tsx` (rută)
- edit `src/components/AdminLayout.tsx` (link)
- edit `src/pages/agency/AiActions.tsx` (citire din noul tabel + butoane decide)
