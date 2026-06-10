# Plan: Optimizare mobile iPhone-first (țintă 390px)

Aplic schimbări doar la `md` și sub (mobil); desktop rămâne identic. Păstrăm dark mode, brand roșu, logica și DB neschimbate.

## 1. Fundație globală

**`index.html`**
- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover`.
- Meta `theme-color` aliniat cu fundalul.

**`src/index.css`**
- Reguli globale anti-zoom: `input, select, textarea { font-size: 16px; }` doar sub `md`.
- Utility classes noi:
  - `.safe-bottom` → `padding-bottom: env(safe-area-inset-bottom)`
  - `.safe-top` → `padding-top: env(safe-area-inset-top)`
  - `.no-scrollbar` → ascunde scrollbar pe x-scroll
  - `.h-touch` → `min-h-[44px] min-w-[44px]`
  - `.scroll-snap-x` → scroll orizontal cu snap
- `html, body { overflow-x: hidden; }` ca plasă de siguranță.
- Heading helper `.h-fluid` cu `clamp()` pentru titluri mari.

**`tailwind.config.ts`**
- Adaug `spacing: { 'safe-b': 'env(safe-area-inset-bottom)' }` și `minHeight.touch: '44px'`.

## 2. Client Portal — tab navigation (`src/pages/client/ClientPortal.tsx`)

Tab-urile (Sumar, Check-in, Calendar, Aprobări, Rapoarte, Rezultate, Obiective, Documente, Feedback) se rup pe 3 rânduri pe mobil.

- Sub `md`: segmented control orizontal — `flex overflow-x-auto no-scrollbar snap-x` cu `whitespace-nowrap`, fiecare tab `min-h-[44px] px-4`, indicator activ, `scrollIntoView({inline:'center'})` la schimbarea tab-ului.
- Peste `md`: layout actual neschimbat.
- Container sticky top sub header, fără wrap.

## 3. Calendar — agenție și client

**`src/components/content/MonthCalendar.tsx`** + **`src/pages/agency/Calendar.tsx`** + locuri unde apare în client portal:
- Sub `md`, forțat view = `list` (agendă): postări grupate pe zi (zi+dată RO via `Intl.DateTimeFormat('ro-RO')`), titlu, platformă (iconiță), badge status colorat.
- Empty state prietenos „Nicio postare planificată".
- Pe agenție: `ToggleGroup` Lună/Săpt/Listă rămâne, dar pe mobil ascund Lună/Săpt (doar Listă vizibil). Pe desktop neschimbat.
- `UpcomingList` reutilizat / extins pentru ambele.

## 4. Tabele → carduri pe mobil

Pattern: wrapper `<div className="hidden md:block">` pentru `<Table>`, `<div className="md:hidden space-y-2">` pentru carduri.

Fișiere afectate:
- `src/pages/agency/Clients.tsx`
- `src/pages/agency/Content.tsx` + `src/components/content/ContentList.tsx`
- `src/pages/agency/Tasks.tsx` (vezi #6 pentru kanban)
- `src/pages/agency/Approvals.tsx` + `ClientApprovalsTab.tsx`
- `src/pages/agency/Reports.tsx` + `ClientReportsTab.tsx`
- `src/pages/agency/Team.tsx`
- `src/components/competitors/CompetitorsTab.tsx`
- `src/components/operations/DocumentsList.tsx`
- `src/components/performance/VideosTable.tsx`
- `src/components/analytics/ContentRankingTable.tsx`

Cardul: titlu/nume bold, 2-3 câmpuri cheie pe linii, badge status, meniu „…" (`DropdownMenu`) pentru acțiuni. Click pe card = acțiunea principală.

## 5. Dialoguri/Wizard-uri → bottom sheet pe mobil

Strategie: creez un wrapper `<ResponsiveDialog>` care randează `Sheet` (side="bottom", `h-[95vh]`) sub `md` și `Dialog` peste. Conținut scrollabil, bara de acțiuni `sticky bottom-0 safe-bottom` cu butoane full-width.

Aplic la:
- `AddClientWizard`, `QuickAddClientDialog`, `QuickClientOnboarding`
- `BriefWizard`
- `ApprovalDetailDialog`, `SendForApprovalDialog`
- `AnalyticsEntryDialog`, `ContentMetricDialog`, `CsvImportDialog`
- `InviteClientDialog`, `InviteTeamMemberDialog`
- `EditPortalPermissionsDialog`, `PortalSettingsCard` modaluri
- `ContentEditor`, `QuickAddPopover`
- `CompetitorFormDialog`, `CompetitorInsightsDialog`, `ObservationFormDialog`, `ObservationDetailDialog`, `CompareDialog`
- `SwipeFormDialog`, `SwipeDetailDialog`, `UseInCalendarDialog`
- `GenerateStrategyDialog`, `RiskAnalysisDialog`, `ReportEditor`
- `TaskEditor`, `QuickEditTaskSheet` (deja sheet — doar verific safe area)
- `VideoEditor`

Wizard-urile: stepper compact sus, butoane „Înapoi/Înainte" sticky jos.

## 6. Kanban Sarcini (`src/pages/agency/Tasks.tsx`)

- Sub `md`: coloane în row cu `overflow-x-auto snap-x snap-mandatory`, fiecare coloană `w-[85vw] shrink-0 snap-center`. Indicator de paginare deasupra (puncte sau nume coloane scrollabile). Alternativ comutator listă pe status (preferă scroll-snap pentru parity cu desktop).
- Peste `md`: grid actual.

## 7. Grafice (`src/components/analytics/*`, `health/*`)

- `ResponsiveContainer` cu `height={220}` pe mobil, `300` pe desktop.
- Legendă sub grafic pe mobil.
- Axă X: `interval="preserveStartEnd"`, font 11, fără rotație extremă.
- Wrappers `overflow-hidden` ca să nu împingă layout-ul.

## 8. Formulare

- Toate `Input`/`Select`/`Textarea`: full-width pe mobil, label deasupra, `gap-4` între câmpuri.
- Adaug `inputMode`/`type` corecte unde lipsesc (numerice în Analytics, brief, business impact, KPI; email în invitații; tel unde aplicabil).
- Butoane formular `min-h-[44px]`, principalul full-width pe mobil.

## 9. Stat cards & carduri (`MetricCard`, `PriorityKpiCard`, `HealthScoreCard`, dashboards)

- Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
- Numere mari cu `truncate` + `clamp()` font.
- Padding `p-4 md:p-6`.

## 10. Layout & headere

**`AgencyLayout.tsx`**
- Sidebar deja drawer pe mobil — verific `safe-top` și că nu apare scroll-x.
- Header pagini (`PageHeader`): titlu mai mic pe mobil, acțiuni se mută într-un meniu `…` dacă sunt >1.
- Container principal: `px-4 md:px-8 pb-[calc(env(safe-area-inset-bottom)+1rem)]`.

**Client Portal**: header sticky compact, dacă alegem bottom-nav (alternativ tab-urilor) → fixed jos cu `safe-bottom`, conținut cu `padding-bottom` corespunzător.

## 11. Media

- Toate `<img>`/thumbnails: `max-w-full h-auto object-cover`.
- Carduri swipe / competitor / approval video: aspect-ratio fix.

## Decizie cerută (un singur punct)

Pentru tab-urile din client portal, prefer **segmented control orizontal cu scroll-snap** (păstrează pattern-ul existent, doar îl face scrollabil). Alternativa bottom-nav adaugă complexitate (icoane noi, decid ce intră în „Mai mult"). Merg pe segmented control cu scroll dacă nu spui altceva.

## QA (la 390px, dark mode)

Pentru fiecare rută verific în preview mobile:
- `/`, `/auth`, `/agency` (toate sub-paginile), `/client`, `/admin`.
- Checklist: zero overflow-x, taburi pe un rând, calendar = listă, tabelele = carduri, dialogurile = bottom sheet cu acțiuni sticky, butoane ≥44px, fără zoom la focus input, bottom nav respectă safe area.

## Ce NU se atinge

- Logica, RPC-uri, RLS, tipurile DB, AI/Gemini, rute, valori enum.
- Layout-ul desktop (peste `md`).
- Brand: roșu și dark mode rămân.
