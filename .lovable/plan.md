# Module 2 — AI Client Risk Detector

Internal-only module for agency. Detects clients at risk of churn using deterministic signals + AI narrative. Reuses the Module 1 pattern (deterministic edge function + AI edge function + premium gate).

## 1. Database (new migration)

### Table `client_risk_alerts`
```
id              uuid pk
agency_id       uuid not null
client_id       uuid not null
risk_level      text not null   -- 'low' | 'medium' | 'high' | 'critical'
risk_score      numeric(5,2) not null   -- 0-100, higher = riskier
risk_reasons    jsonb not null default '[]'   -- [{code, label, severity, value}]
ai_summary      text
recommended_actions jsonb default '[]'   -- [{title, description, priority}]
ai_generated_at timestamptz
status          text not null default 'active'  -- active|acknowledged|resolved|ignored
detected_at     timestamptz not null default now()
resolved_at     timestamptz
resolved_by     uuid
created_at, updated_at timestamptz
unique (client_id, status) WHERE status = 'active'  -- partial unique: only one active alert per client
```

Index `(agency_id, status, risk_score desc)`. Trigger `tg_set_updated_at`.

### RLS — agency-only (no client_viewer access)
- read/insert/update/delete: `is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid())`

### Plans flag
Add `risk_detector boolean default false` to `plans`. Enable on Growth+, Unlimited, White Label.

## 2. Deterministic detector — edge function `detect-client-risk`

Input: `{ client_id }` or `{ agency_id }` (batch all active clients).

Reads, for current month + previous month:
- `client_health_scores` (latest)
- `videos` (engagement delta MoM)
- `monthly_goals` (avg progress, count missed)
- `content_approvals` (pending count, avg response hours, rejection rate)
- `business_impact_entries` (presence + sum delta)
- `reports` (most recent created_at)
- `tasks` (overdue count for client)
- `client_feedback` / brief (last activity)
- `campaigns` (active without metrics)

Scoring — sum of weighted signal points (cap 100):

```
performance_drop      MoM engagement < -15%      +20
goals_missed          avg progress < 50%          +15
no_client_feedback    no entry in 30d             +8
late_approvals        avg response > 72h OR ≥3 pending  +10
high_rejection        rejection rate > 30%        +10
no_business_impact    0 entries in last 30d       +8
stale_reports         no report in 45d            +7
overdue_tasks         ≥3 overdue                  +7
campaign_no_results   active campaign, no goal progress  +5
low_health            health_score < 50           +15
engagement_drop       likes+comments MoM < -20%   +10
no_monthly_progress   all goals at 0 progress     +10
```

Levels: 0-19 low, 20-44 medium, 45-69 high, 70+ critical.

Each triggered signal pushed to `risk_reasons` with `{code, label, severity, value}`. `summary` (deterministic, short) auto-generated from top 3 reasons.

Behavior:
- If active alert exists for client → update score/reasons (idempotent)
- If no signals → if active alert exists, mark it `resolved` with `resolved_at = now()`
- Batch mode: iterate all `clients` rows for the agency

## 3. AI edge function `risk-analysis`

Input: `{ alert_id }`. Reads alert + signal context + last month's health breakdown + recent videos snippet.

Lovable AI Gateway, model `google/gemini-3-flash-preview`, with tool-calling for structured output:
```
{
  why_at_risk: string,
  whats_changed: string,
  warning_signals: string[],
  urgency: 'low'|'medium'|'high'|'critical',
  agency_actions: string[],
  recovery_plan: [{ title, description, priority }]
}
```

System prompt: use only provided data, never invent numbers, mention missing data explicitly. Save into `ai_summary` + `recommended_actions` + `ai_generated_at`. Handle 429/402.

## 4. Recovery tasks — edge function `generate-recovery-tasks`

Input: `{ alert_id }`. Reads `recommended_actions`. Inserts into `tasks` (one row per action) with:
- `agency_id`, `client_id` from alert
- `title` from action
- `description` from action description
- `task_type = 'recovery'`
- `priority = 'high'` for critical/high alerts, else 'medium'
- `deadline = now() + 7 days`
- `created_by = auth.uid()`

If action list empty, falls back to a fixed default set (Schedule strategic call, Analyze 5 worst videos, Propose 10 new hooks, Request business impact feedback, Build next-month strategy).

Returns inserted task IDs. UI shows toast "X recovery tasks created" with link to /agency/tasks.

## 5. Frontend

### Helper `src/lib/risk.ts`
Types + functions: `fetchAgencyAlerts(agencyId, statusFilter?)`, `detectForClient(clientId)`, `detectForAgency(agencyId)`, `runRiskAnalysis(alertId)`, `generateRecoveryTasks(alertId)`, `updateAlertStatus(id, status)`.

### Components
- `src/components/risk/RiskBadge.tsx` — color-coded pill (low=slate, medium=amber, high=orange, critical=rose)
- `src/components/risk/RiskAlertCard.tsx` — compact card: client name, level, score, top reason, last report date, mini health score, buttons "View Risk Analysis" + "Create Recovery Plan"
- `src/components/risk/RiskAnalysisDialog.tsx` — modal showing reasons list, AI sections (why / what changed / warnings / urgency / actions / recovery plan), buttons to generate AI (if missing), "Generate Recovery Tasks", "Acknowledge", "Resolve", "Ignore"
- `src/pages/agency/Risk.tsx` — full page `/agency/risk` listing all alerts with filters by status + level, "Run detection now" button (calls `detectForAgency`)

### Integrations
- **AgencyDashboard**: new "Clients at Risk" section above Client Health, shows top 4 active alerts sorted by score desc, with "View all" → `/agency/risk`
- **AgencyLayout**: nav link "Risk" with `AlertTriangle` icon (visible only to agency members; gated by plan)
- **ClientProfile**: small banner if active alert exists, link to open analysis dialog
- **Auto-detection**: on dashboard mount, call `detectForAgency` if last detection > 24h (stored as `last_risk_detection_at` in `localStorage` per agency to avoid hammering)
- **Client Portal**: NOT exposed — module fully internal, RLS already blocks client_viewer

### Premium gating
Reusable `<PremiumGate feature="risk_detector">` wraps the page and dashboard section. If plan lacks it, show upgrade overlay.

## 6. Files

**New:**
- `supabase/migrations/<ts>_client_risk_alerts.sql`
- `supabase/functions/detect-client-risk/index.ts`
- `supabase/functions/risk-analysis/index.ts`
- `supabase/functions/generate-recovery-tasks/index.ts`
- `src/lib/risk.ts`
- `src/components/risk/RiskBadge.tsx`
- `src/components/risk/RiskAlertCard.tsx`
- `src/components/risk/RiskAnalysisDialog.tsx`
- `src/pages/agency/Risk.tsx`

**Modified:**
- `src/App.tsx` — route `/agency/risk`
- `src/components/AgencyLayout.tsx` — nav link
- `src/pages/agency/AgencyDashboard.tsx` — "Clients at Risk" section
- `src/pages/agency/ClientProfile.tsx` — risk banner

## 7. Edge cases

- New client (<30 days, no data): no signals → no alert created
- Detection idempotent: re-running updates same active alert; resolves alerts when signals clear
- AI failure (402/429): toast clear error, alert keeps deterministic data intact
- Recovery task generation idempotent per click (no dedup — agency may want multiple rounds)
- Agency Owner / Team / SaaS Admin all see; Client User blocked by RLS

Approve and I implement end-to-end (migration + 3 edge functions + UI + dashboard integration).