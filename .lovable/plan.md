# Traducere completă în română (100%)

Aplicația devine Romanian-only. Înlocuiesc textele englezești direct inline, fără librărie i18n. Nu modific logică, chei DB, enum-uri, nume de rute sau variabile.

## 1. Hărți centrale de etichete (sursa unică)

Extind `src/lib/i18nLabels.ts` (există deja parțial) cu toate hărțile cerute și adaug funcții ajutătoare:

- `GOAL_STATUS_RO`, `CONTENT_STATUS_RO`, `APPROVAL_STATUS_RO`, `HEALTH_STATUS_RO`, `METRIC_RO`, `NICHE_RO` (completate conform brief-ului)
- `AGENCY_NAV_RO` — mapare pentru sidebar
- helpers: `contentStatusLabel`, `approvalStatusLabel`, `metricLabel` (deja există)
- păstrez `MONTHS_RO`, `WEEKDAYS_RO_*`, `fmtMonthYearRO`, `fmtDayShortRO`, `fmtDateRO`
- adaug `fmtNumberRO`, `fmtCurrencyRO` (locale `ro-RO`) pentru numere/sume

Actualizez `src/lib/operations.ts` (TASK_STATUSES, TASK_PRIORITIES, CAMPAIGN_STATUSES, DOCUMENT_FOLDERS) — sunt deja în RO, completez ce lipsește (ex. folderele de documente).

## 2. Zone de tradus (checklist complet)

### A. Landing (`src/pages/Index.tsx`)
Tot textul rescris în română cu tonul cerut: hero, sub-hero, badges, CTA, secțiunea „Everything in one place", carduri module, pricing (păstrez prețurile și numele de plan rămân în formă scurtă RO: „Starter", „Creștere", „Nelimitat", „White Label Pro"), CTA final, footer.

### B. Auth & invitații
- `src/pages/Auth.tsx`, `src/pages/AdminLogin.tsx`
- `src/pages/AcceptInvite.tsx`, `src/pages/AcceptTeamInvite.tsx`
- Toate label-urile, butoanele, mesajele de eroare/zod, toast-urile.

### C. Layout agenție + sidebar
- `src/components/AgencyLayout.tsx` — etichetele din meniu folosesc `AGENCY_NAV_RO`.
- `src/components/PageHeader.tsx`, `NavLink.tsx`, `Logo.tsx` (dacă au text).

### D. Pagini agenție (toate fișierele din `src/pages/agency/*`)
AgencyDashboard, Clients, ClientProfile, Calendar, Content, Approvals, Analytics, Campaigns, Reports, ReportPrint, Strategies, StrategyDetail, StrategyPrint, Documents, Tasks, SwipeLibrary, Competitors, Assistant, Team, Billing, Settings, AiActions, AiMemory, InviteClientDialog.
Titluri, subtitluri, butoane, coloane de tabel, filtre, empty states, tab-uri.

### E. Pagini admin (`src/pages/admin/*`)
AdminDashboard, AiActionsApprovalQueue, AiLogs, AiMaintainer, AiPrompts, AiSafety, ContinuousImprovement.

### F. Client portal
- `src/pages/client/ClientPortal.tsx` și componente `client/*` (DashboardContextCard, BriefWizard, BusinessImpact*, ClientDashboard, ClientQuickCheckIn, EditPortalPermissionsDialog, LatestCheckInCard, NicheDashboardSection, NicheSummaryCard, PortalSettingsCard, PriorityKpiCard, QuickAddClientDialog, QuickClientOnboarding, RealEstateDashboardSection, CustomNicheDashboardSection, AddClientWizard).

### G. Componente shared
`src/components/`:
- analytics/*, approvals/*, ai/*, competitors/*, content/*, health/*, operations/*, performance/*, reports/*, risk/*, strategies/*, swipe/*, team/*, EmptyState, ScrollToTop, MetricCard, RoleRoute, AdminRoute.
- Badge-uri/status pills folosesc hărțile centrale.
- `error-state.tsx` (deja RO).

### H. Toast-uri, validări, mesaje
Caut `toast.success(`, `toast.error(`, `toast(`, `z.string(`, `.min(`, `message:`, `placeholder=`, `aria-label=`, `title=` în toată baza de cod și traduc tot ce e vizibil.

### I. Emailuri (edge functions)
- `supabase/functions/send-client-invite/index.ts`
- `supabase/functions/send-team-invite/index.ts`
Subject + corp HTML/text 100% RO. (Nu ating funcțiile AI/Gemini.)

### J. `index.html`
`<title>`, `<meta name="description">`, `og:title`, `og:description` în română. Lang `ro`.

## 3. Formatare date/numere
Înlocuiesc orice `toLocaleDateString()` / `toLocaleString()` fără locale, sau cu `en-*`, cu varianta `ro-RO` sau cu helperele din `i18nLabels.ts`. Lunile/zilele afișate manual folosesc `MONTHS_RO` / `WEEKDAYS_RO_*`.

## 4. Verificare finală
Grep global după cuvintele tipice EN cerute în brief (`Save`, `Cancel`, `Delete`, `Add`, `Edit`, `Create`, `Search`, `Loading`, `Success`, `Error`, `Settings`, `Client`, `Report`, `Pending`, `Approved`, `Draft`, `This month`, `No data`, `Get started`, `Sign in`, `Upgrade`, `Health`, `Month`, `Week`, `Today`, `Yesterday`, `New`, `IN PROGRESS`, `June`, etc.) — orice apariție vizibilă se traduce. Identificatorii din cod / chei DB rămân neschimbați.

## Ce NU modific
- Logică, nume de funcții/variabile, scheme, RLS, rute.
- Valori enum din DB.
- Funcții AI/Gemini (prompturi rămân cum sunt).
- Brand: Dreamar, drea.mar, DR.DREAM; platforme: Instagram/TikTok/Facebook/YouTube; termeni tehnici: ROAS, CTR, CPM, AI.

## Livrare
Lucrare amplă (zeci de fișiere). O fac într-o singură rundă de build, grupat pe zonele de mai sus, cu hărțile centrale reutilizate ca să rămână consecvent.
