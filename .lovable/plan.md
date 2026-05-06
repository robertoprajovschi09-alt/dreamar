## Obiectiv

Înlocuim layout-ul actual al `ClientDashboard.tsx` cu o structură simplă, orientată pe client: top bar cu identitate + status, apoi 6 secțiuni clare. Eliminăm tot ce ține de "admin agenție" (risk detector, swipe, notes, costuri, comparații, strategii neaprobate, task-uri interne, schema KPI tehnică).

## Structură nouă

**Top Section (card hero compact)**
- Nume client + luna curentă + badge nișă
- Health Score compact (cerc mic + status label, doar `total_score` + `score_status`)
- Satisfaction status (din ultimul `client_checkins.satisfaction_score`)
- "Last check-in completed" (dată sau buton "Start check-in")

**Section 1 — This Month Snapshot** (3-4 carduri mari)
- Main Goal (din `client_goals` activ pe luna curentă, sau din `ai_strategy_base.main_goal`)
- Main Result (KPI #1 din `personalization.priority_metrics` cu valoare + delta)
- Business Impact (suma `revenue_estimate` / leads / sales luna curentă)
- Pending Approvals (count `content_posts.status = sent_for_approval` + buton "Aprobă")

**Section 2 — What's Working**
- Top 3 content pieces (`content_posts` published, sortate după engagement / impressions din `content_metrics` sau `analytics_entries`)
- Pentru fiecare: thumbnail/title + metric scurt + 1 linie AI explicație (din `personalization.insight_cards` severity=good)
- "Ce trebuie repetat" — bullet scurt din AI

**Section 3 — What Needs Attention**
- Date lipsă (din `client_dashboard_contexts.missing_data`)
- Approvals pending (link)
- Scăderi importante (insight_cards severity=warning)
- Obiective în urmă (`client_goals` cu progress < expected pentru luna)

**Section 4 — Next Actions**
- Ce face agenția (din `personalization.next_actions` / `ai_priorities` filtrate `audience=client`)
- Ce trebuie să facă clientul (approvals, check-in, business impact missing)
- Deadline-uri (date din `next_actions.deadline` dacă există)

**Section 5 — Calendar Preview**
- Următoarele 5 postări din `content_posts` cu `scheduled_for >= now()`, sortate ASC
- Pentru fiecare: dată, platformă (icon), titlu scurt, badge status approval
- Buton "View Calendar" → `/client/calendar` (sau tab existent)

**Section 6 — Report / Strategy**
- Ultimul raport (`reports` cu `client_visible=true`) — titlu + summary scurt + buton "View Report"
- Strategia lunii (din `ai_strategy_base.monthly_strategy` sau `client_dashboard_contexts.generated_summary`) — text scurt

## Ce eliminăm din dashboard-ul curent

- Secțiunea generică `BusinessImpactQuickForm` mare (mutăm într-un dialog accesibil din "Pending Approvals" sau check-in)
- `RealEstateDashboardSection` / `NicheDashboardSection` / `CustomNicheDashboardSection` ca rendering principal — păstrăm doar **niche-aware KPI labels** prin `nicheDashboardConfigs` în Section 1 (Main Result) și Section 2 (top content metric)
- Rendering KPI schema brut, info insights generice, refresh button vizibil (mutăm într-un meniu discret)
- Orice referință la cost intern, notes, risk detector, swipe file

## Fișiere

**Refactor (rewrite complet):**
- `src/components/client/ClientDashboard.tsx` — noul layout pe 6 secțiuni

**Componente noi (în `src/components/client/dashboard/`):**
- `DashboardTopBar.tsx` — nume + lună + nișă + health compact + satisfaction + check-in status
- `MonthSnapshotCards.tsx` — 4 carduri (goal, result, impact, approvals)
- `WhatsWorkingCard.tsx` — top 3 content + AI good insights
- `NeedsAttentionCard.tsx` — missing data + warnings + obiective în urmă
- `NextActionsCard.tsx` — agenție / client / deadline-uri
- `CalendarPreviewCard.tsx` — următoarele 5 postări + buton
- `ReportStrategyCard.tsx` — ultimul raport + strategia lunii

**Neschimbate** (rămân disponibile dacă agenția le accesează în alt context, dar nu mai sunt importate de `ClientDashboard`):
- `RealEstateDashboardSection`, `NicheDashboardSection`, `CustomNicheDashboardSection`, `PriorityKpiCard`, `BusinessImpactQuickForm` (ultimul devine accesibil prin buton "Adaugă rezultate" din Section 3 când e nevoie)

## Date / queries

Toate query-urile rămân în `ClientDashboard.tsx` (sau extrase într-un hook `useClientDashboardData`). Adăugăm:
- `client_health_scores` — ultimul (luna curentă) pentru top bar
- `client_goals` — active pe luna curentă pentru Main Goal + obiective în urmă
- `content_posts` cu join pe `content_metrics` pentru top 3 + următoarele 5 scheduled
- `client_checkins` — ultimul pentru satisfaction + dată check-in

RLS rămâne intact (toate aceste tabele au deja policies per `client_id` / `agency_id`).

## Niche awareness

Folosim `getNicheDashboardCopy(niche)` doar pentru:
- Label-ul cardului "Main Result" (ex: "Leads generate" pt real_estate, "Rezervări" pt restaurant)
- Microcopy pentru hero eyebrow și titluri secțiuni

Fără logică divergentă pe nișă în layout — același 6-secțiuni pentru toți, doar copy-ul se schimbă.

## Out of scope

- Modificări de schema DB
- Edge functions noi (folosim datele existente din `client_dashboard_contexts`)
- Pagina `/client/calendar` separată — butonul navighează la tab-ul calendar existent în `ClientPortal`
