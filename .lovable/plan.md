# Plan — Reparații Client Portal

Schimbările sunt limitate la `/client` și la hărțile de etichete partajate. NU se atinge AI/Gemini, NU se atinge zona de agenție (cu o singură excepție punctuală: generatorul de titlu pentru obiective, ca să nu reapară "Mai mulți roas").

## 1. Brand roșu peste tot (scoatere verde)

**Cauză:** `src/lib/brandTheme.ts` → `brandStyle()` setează `--accent` și `--accent-foreground` pe baza `client.brand_color`. Dacă un client are brand_color verde (default vechi pentru mulți clienți), tot subarborele portalului devine verde.

**Fix:**
- În `brandStyle`: păstrează doar `--brand`, `--brand-foreground`, `--brand-soft`. **Eliminăm overrides pentru `--accent` / `--accent-foreground`.** Astfel portalul moștenește signal-red din `index.css`.
- Verificare vizuală: chip selectat în check-in, numerele de pas, "QUICK CHECK-IN", ziua curentă din calendar = roșii.

## 2. Totul în română (hartă centrală de etichete)

**Fișier nou:** `src/lib/i18nLabels.ts` cu hărți + helpere:

```ts
GOAL_STATUS_RO   // in_progress→"În desfășurare", not_started→"Neînceput",
                 // done/completed→"Finalizat", at_risk→"În risc", behind→"În urmă"
HEALTH_STATUS_RO // excellent→"Excelent", healthy→"Sănătos",
                 // at_risk→"În risc", critical→"Critic"
METRIC_RO        // roas→"ROAS", revenue→"Venit", sales→"Vânzări", orders→"Comenzi",
                 // leads→"Lead-uri", calls→"Apeluri", dms→"Mesaje",
                 // bookings→"Rezervări", appointments→"Programări",
                 // viewings→"Vizionări", contracts→"Contracte",
                 // reach→"Acoperire", views→"Vizualizări", impressions→"Afișări",
                 // followers→"Urmăritori", engagement→"Interacțiune"
GOAL_TITLE_RO    // roas→"ROAS mai mare", revenue→"Venituri mai mari",
                 // sales→"Mai multe vânzări", orders→"Mai multe comenzi",
                 // leads→"Mai multe lead-uri", bookings→"Mai multe rezervări",
                 // appointments→"Mai multe programări", viewings→"Mai multe vizionări"
NICHE_RO         // hospitality→"Hoteluri", custom→"Personalizat" (restul rămân)
MONTHS_RO        // ["ianuarie",…,"decembrie"]
WEEKDAYS_RO_SHORT// ["Lun","Mar","Mie","Joi","Vin","Sâm","Dum"]
fmtMonthYearRO(d) → "iunie 2026"
fmtDateRO(d)      → "ro-RO" locale
goalTitleFor(metricKey)  // fallback: "Mai multe " + (METRIC_RO[k] || k).toLowerCase()
metricLabel(metricKey)
```

**Aplicare:**
- `src/pages/client/ClientPortal.tsx`: tab labels (Overview→Sumar, Approvals→Aprobări, Reports→Rapoarte, Results→Rezultate, Objectives→Obiective, Documents→Documente); header "CLIENT PORTAL"→"PORTAL CLIENT", "managed by"→"administrat de"; "Monthly feedback & business impact"→"Feedback lunar și impact business"; "Month"→"Luna"; "Submit"→"Trimite"; toate `toLocaleDateString(undefined,…)` → `fmtMonthYearRO` / `fmtDateRO`; subtext obiectiv: `metricLabel(g.metric)` + `· target X` → `· țintă X` + `· ${fmtMonthYearRO(g.month)}`.
- `src/components/client/ClientDashboard.tsx`: `NICHE_LABEL` din local (`hospitality:"Hotels"`) → `NICHE_RO`; `health.score_status.replace("_"," ")` → `HEALTH_STATUS_RO[…]`; label "Health" → "Sănătate"; status obiective afișate via `GOAL_STATUS_RO` (capitalizare normală, nu UPPERCASE); date `toLocaleDateString("ro-RO",…)` păstrate dar lunile prin `MONTHS_RO` unde apar luna completă.
- `src/components/client/LatestCheckInCard.tsx`: month label via `fmtMonthYearRO`.
- `src/components/client/ClientQuickCheckIn.tsx`: chip-uri — "Mai mult awareness"→"Mai multă notorietate"; "Mai mult engagement"→"Mai multă interacțiune"; "...personal/behind the scenes"→"...personal / din culise"; subtitlu "Quick check-in · sub 2 minute"→ înlocuit (vezi §4).
- `src/lib/operations.ts`: STATUS labels EN ("In progress", "Not started"…) → folosesc `GOAL_STATUS_RO` (sau înlocuite direct cu valori RO).
- `src/lib/nicheDashboard.ts` `hero_eyebrow: "Luna aceasta în hospitality"` etc. — traduse cu `NICHE_RO`.
- **Generare titlu obiectiv (apare la agenție, dar e cauza "Mai mulți roas" în portal):**
  - `src/components/client/QuickClientOnboarding.tsx` linia 124: `objective: \`Mai mulți ${k.label.toLowerCase()}\`` → `goalTitleFor(k.key)`.
  - `src/components/client/AddClientWizard.tsx` (insert `monthly_goals`, ~l.470): aceeași înlocuire dacă generează titlu din cheie.

## 3. Calendar — mobile-first agendă

Refacem `ClientCalendarTab` din `ClientPortal.tsx`:
- Hook `useIsMobile` (există în `src/hooks/use-mobile.tsx`).
- **Mobile (default):** listă/agendă grupată pe zi cu postări existente; fiecare rând = data RO ("Lun, 10 iun"), titlu, platformă, badge status colorat (programat = neutru, de aprobat = ambră, aprobat = verde, publicat = roșu brand). Zilele cu postări fără punct (lista e deja densă). Header "iunie 2026" + chevron prev/next, locale RO.
- **Desktop:** păstrăm `MonthCalendar` existent, dar weekday header și luna prin `WEEKDAYS_RO_SHORT` / `fmtMonthYearRO`. Marker zile cu postări = punct roșu (`bg-accent`).
- **Empty state** (ambele): "Nicio postare programată în {luna}." centrat, icon Calendar mut.
- Verificare în `MonthCalendar` că weekday header e parametrizabil; altfel patch local cu prop opțional `weekdayLabels` și `monthLabel`.

## 4. Check-in: client nou vs. client existent

În `ClientQuickCheckIn.tsx`:
- Prop nou (sau detect intern) `isNewClient` calculat în `ClientPortal` înainte de render:
  ```
  newClient = (count(client_checkins WHERE client_id=…) === 0)
           && (count(content_posts WHERE client_id=… AND status='published') === 0)
  ```
- Două secțiuni cu sub-titluri:
  - **"Planul lunii"** (mereu): Q1 prioritate principală, Q2 ce promovăm, Q5 ceva important, Q7 reformulat pentru client nou în "Ce direcție preferi pentru conținut?" (existent: "Vrei să schimbăm ceva?").
  - **"Cum a mers până acum"** (doar `!isNewClient`): Q3 impact business, Q4 feedback de la clienți, Q6 mulțumire față de direcția conținutului.
- Titlu/subtitlu dinamice:
  - new: "Bine ai venit! Hai să pornim luna asta" / "Spune-ne ce ne dorim luna aceasta — sub 2 minute".
  - existing: "Check-in lunar" / "Cum a mers și ce facem luna asta — sub 2 minute".
- Validare: câmpurile din secțiunea ascunsă **nu** sunt required.

## 5. Restyle soft-UI

În `ClientPortal.tsx` + `ClientDashboard.tsx`:
- Wrapper conținut: `max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8`.
- Carduri: `rounded-2xl md:rounded-3xl shadow-sm border border-border/60` cu `p-6 md:p-8`.
- StatCards "Luna aceasta": grid de 3-4, fundal `bg-card`, eyebrow muted uppercase tracking-wide, valoare `text-3xl font-bold font-mono`, accent roșu doar pentru valoarea principală.
- Tabs ca segmented control: `TabsList` cu `rounded-full bg-muted p-1`, `TabsTrigger` `rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm`.
- Butoane primare = pill: `rounded-full bg-accent text-accent-foreground hover:bg-accent/90`.
- Dark mode păstrat (deja folosim semantic tokens).

## Fișiere atinse

**Noi:** `src/lib/i18nLabels.ts`.
**Editate:**
- `src/lib/brandTheme.ts` (drop override `--accent`).
- `src/pages/client/ClientPortal.tsx` (tabs RO, calendar mobile, header, detect newClient, restyle).
- `src/components/client/ClientQuickCheckIn.tsx` (secțiuni, titlu dinamic, RO).
- `src/components/client/ClientDashboard.tsx` (statusuri/sănătate/nișe RO, restyle).
- `src/components/client/LatestCheckInCard.tsx` (data RO).
- `src/components/client/QuickClientOnboarding.tsx` (titlu obiectiv via `goalTitleFor`).
- `src/components/client/AddClientWizard.tsx` (idem, doar generarea titlului).
- `src/lib/operations.ts` (status labels RO).
- `src/lib/nicheDashboard.ts` (eyebrow RO pentru hospitality/custom).
- Eventual `src/components/content/MonthCalendar.tsx` (props pentru weekday/month labels) — doar dacă header-ul nu e deja parametrizabil.

**Nu se atinge:** funcții AI/Gemini, edge functions, schema DB (nicio migrare necesară), zona `/agency` (cu excepția punctuală a generatorului de titlu).

## Test

- Client NOU (zero check-ins, zero posts published): check-in arată doar "Planul lunii", titlu de bun venit; accente roșii.
- Client cu istoric: ambele secțiuni, titlu "Check-in lunar".
- Calendar pe mobil = listă agendă RO; desktop = grilă cu zile RO + punct roșu.
- Tab-uri, statusuri, metrici, date — RO peste tot; niciun "IN PROGRESS", "June", "roas", "Health".
