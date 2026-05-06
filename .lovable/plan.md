# Modul 1 — Client Health Score

Sistem de scoring 0-100 per client/lună, calculat din 5 componente, cu AI recommendation on-demand. Calculul rulează server-side într-un edge function (deterministic, reproducibil), AI-ul produce doar explicația narativă.

## 1. Schema DB (migration nouă)

### Tabel `client_health_scores`
```
id              uuid pk
agency_id       uuid not null
client_id       uuid not null
month           int  not null   -- 1-12
year            int  not null
period_start    date not null   -- prima zi din lună (pt. query rapid + index)
period_end      date not null
total_score                 numeric(5,2) not null
content_consistency_score   numeric(5,2)
performance_score           numeric(5,2)
goal_progress_score         numeric(5,2)
client_engagement_score     numeric(5,2)
business_impact_score       numeric(5,2)
score_status    text not null  -- 'critical' | 'at_risk' | 'healthy' | 'excellent'
summary         text           -- explicație scurtă auto-generată (deterministic)
ai_recommendation text        -- text lung de la AI, on-demand
ai_generated_at timestamptz
missing_data    jsonb default '[]'  -- lista de componente fără date
breakdown       jsonb default '{}'  -- raw inputs: planned/published, MoM deltas, etc.
created_at, updated_at timestamptz
unique (client_id, year, month)
```

Trigger `tg_set_updated_at`. Index pe `(agency_id, client_id, period_start desc)`.

### RLS (4 policies, pattern existent)
- read: `is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid())`
- insert/update/delete: `is_member_of(auth.uid(), agency_id)` (edge function rulează cu service role oricum)

## 2. Logica de calcul (deterministic, în edge function)

Edge function: `compute-health-score` (verify_jwt în cod, accept agency member token).
Input: `{ client_id, month, year }`.

Pentru fiecare componentă, dacă lipsesc datele de bază → componenta marcată în `missing_data`, scor neutru `50`, nu intră în penalizare nedreaptă.

### a) Content Consistency (20%)
Sursă: `content_posts` în lună.
- planned = count(status in ('planned','scheduled','idea') OR scheduled_for în lună)
- published = count(status='published')
- late = count(status='published' AND published_at > scheduled_for) — dacă nu avem `published_at`, folosim `updated_at` ca proxy
- score = `100 * published/planned − 30 * (late/planned)`, clamp 0-100
- dacă planned=0 → missing_data

### b) Performance (25%)
Sursă: `videos` în luna curentă vs luna precedentă.
- agregăm: views, reach, likes+comments+shares+saves (engagement), apoi calculăm engagement_rate
- delta% per metric față de luna trecută
- score = `50 + media(delta%)` clamp 0-100 (creștere 50% → 100, scădere 50% → 0)
- dacă 0 videos în ambele luni → missing_data

### c) Goal Progress (25%)
Sursă: `monthly_goals` luna curentă.
- per goal: `progress/target * 100`
- score = media goalurilor, clamp 0-100
- dacă 0 goals → missing_data

### d) Client Engagement (15%)
Sursă: `content_approvals` în lună.
- approval_rate = approved / total_decided
- avg_response_time = avg(decided_at - created_at) în ore — folosim `updated_at` când `decision != 'pending'`
- score = `60 * approval_rate + 40 * (1 - clamp(avg_hours/72, 0, 1))`
- dacă 0 approvals → missing_data

### e) Business Impact (15%)
Sursă: `business_impact_entries` în lună.
- sum metrics (calls, dms, sales, bookings, etc.) vs luna trecută
- score = `50 + delta%`, clamp 0-100
- dacă 0 entries → missing_data, score neutru 50

### Total
`total = 0.20*A + 0.25*B + 0.25*C + 0.15*D + 0.15*E` (componentele missing intră ca 50).
Status mapping: 0-39 critical, 40-59 at_risk, 60-79 healthy, 80-100 excellent.

`summary` = string scurt generat în cod: ex. *"Healthy — content publicat la timp, performanță în creștere, dar 2 obiective în urmă."* (template-uri pe baza componentelor).

Edge function face `upsert` în `client_health_scores` pe `(client_id, year, month)`.

## 3. Edge function `health-score-recommendation` (AI)

- Input: `{ score_id }`
- Citește scorul + breakdown + missing_data + ultimele 30 zile relevante (videos top/flop, goals, briefuri)
- Lovable AI Gateway, model `google/gemini-3-flash-preview`
- System prompt clar: "Folosește DOAR datele din context. Dacă o componentă e în `missing_data`, spune explicit ce lipsește. Nu inventa numere."
- Tool calling pentru output structurat: `{ why_this_score, whats_working[], whats_broken[], next_month_actions[] }`
- Salvează rezultatul în `ai_recommendation` + `ai_generated_at`
- Handle 429/402 → eroare clară în UI

## 4. UI

### Lib helper `src/lib/healthScore.ts`
Tipuri + funcții: `getCurrentScore(clientId)`, `triggerCompute(clientId)`, `triggerAi(scoreId)`, `getHistory(clientId, n)`.

### Componentă reutilizabilă `src/components/health/HealthScoreCard.tsx`
- Card mare: progress ring (SVG simplu) cu scorul în mijloc
- Badge color-coded (critical=rose, at_risk=amber, healthy=emerald, excellent=indigo)
- Trend arrow vs luna trecută (Δ puncte)
- Breakdown: 5 mini progress bars (Content / Performance / Goals / Engagement / Impact)
- Toggle "Why this score?" → afișează `summary` + lista `missing_data` cu badge "Missing data"
- Buton "Generate AI recommendation" (loading state) → afișează 4 secțiuni (de ce / ce merge / ce nu / acțiuni)
- Buton "Recompute" (vizibil doar pentru agency members) → re-rulează edge function

### Integrare Agency
- **`/agency` (Dashboard)**: grid cu `HealthScoreCard` compact pentru fiecare client (top 6, sortate ascendent — cei în pericol primii)
- **`/agency/clients/:id` (ClientProfile)**: tab nou "Health" cu cardul full + istoric ultimele 6 luni (sparkline)
- Auto-trigger compute la deschidere dacă scorul lunii curente lipsește sau e mai vechi de 24h

### Integrare Client Portal
- Tab nou "Health" în `ClientPortal` cu același `HealthScoreCard` (read-only, fără butoane Recompute; AI recommendation visible doar dacă agency a generat-o — gating prin câmp `client_visible boolean default true` pe scor, sau by default visible)

## 5. Premium gating

Adăugăm coloană în `plans`: `health_score boolean default false`. Activăm pe `pro`+ via update SQL. În UI, dacă `agency.plan` nu o are, afișăm overlay "Upgrade to Pro" peste card (componentă `<PremiumGate feature="health_score">`).

## 6. Fișiere create/modificate

**Noi:**
- `supabase/migrations/<ts>_health_scores.sql`
- `supabase/functions/compute-health-score/index.ts`
- `supabase/functions/health-score-recommendation/index.ts`
- `src/lib/healthScore.ts`
- `src/components/health/HealthScoreCard.tsx`
- `src/components/health/HealthScoreRing.tsx`
- `src/components/PremiumGate.tsx` (reutilizabil pt. modulele următoare)

**Modificate:**
- `src/pages/agency/AgencyDashboard.tsx` — secțiune "Client Health"
- `src/pages/agency/ClientProfile.tsx` — tab "Health"
- `src/pages/client/ClientPortal.tsx` — tab "Health"

## 7. Edge cases

- Client nou (< 1 lună): toate missing_data → `total=50`, status `at_risk`, summary "Not enough data yet — log content and goals to see your score."
- Recompute idempotent (upsert pe unique constraint)
- AI recommendation poate fi regenerată (overwrite + nou `ai_generated_at`)
- Dacă AI returnează 402/429 → toast clar, fără să corupă scorul

Aprobă planul și implementez tot end-to-end (migration + 2 edge functions + UI + integrare în 3 dashboard-uri).
