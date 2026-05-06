## Obiectiv

Refacem Business Impact ca **secțiune dinamică pe nișă** integrată în Quick Check-In, înlocuind formularul lung separat (`BusinessImpactQuickForm`). Fiecare câmp permite 4 moduri de input: **exact / aproximativ / nu știu / nu se aplică**. „Nu știu" marchează missing data dar nu blochează submit-ul.

## Field configs per nișă

Toate definițiile centralizate în `src/lib/businessImpactByNiche.ts`:

- **Real Estate**: lead-uri primite, vizionări programate, proprietăți rezervate/vândute, calitatea lead-urilor (chips)
- **Restaurants**: rezervări, comenzi, trafic în locație, evenimente, feedback clienți (text)
- **Beauty**: programări, cereri de preț, servicii cerute (text), clienți noi, before/after (număr)
- **E-commerce**: vânzări, revenue, produse vândute, campanii active (text), stocuri (chips)
- **Fitness**: trial-uri, abonamente, înscrieri, testimoniale, transformări
- **Medical**: programări, apeluri, mesaje, pacienți noi
- **Custom**: câmpuri din `client_kpi_schemas.business_impact_fields`
- **Fallback**: lead-uri, apeluri, rezervări, vânzări, revenue

Fiecare câmp numeric mapează la o coloană din `business_impact_entries` (`db_field`) — dashboard-urile existente continuă să agrege fără modificări.

## Componentă nouă

`src/components/client/BusinessImpactSection.tsx`:
- Header cu titlu + intro nișă-specific + badge cu count „nu știu"
- Pentru fiecare câmp: label + 4 chips mod (Exact / Aprox. / Nu știu / N/A) + input adecvat (number / textarea / chips choice)
- Disclaimer jos: "„Nu știu" și „Nu se aplică" nu blochează trimiterea"

## Integrare în ClientQuickCheckIn

În `src/components/client/ClientQuickCheckIn.tsx`:

1. Înlocuim **Section 3** ("Ai observat rezultate reale...") cu noul `<BusinessImpactSection>` (devine Section 3 — Impact business).
2. Eliminăm vechile `RESULT_METRICS_BY_NICHE`, `GENERIC_METRICS`, `resultsMetrics`, `otherResults`, `resultsObserved`.
3. Eliminăm blocul Real Estate manual (proprietăți, lead quality etc.) — acum acoperit prin `BusinessImpactSection` + `nicheCfg.checkin_extras` rămas.
4. State nou: `impactValues: Record<string, { mode, value }>`.
5. La submit:
   - Fetch `client_kpi_schemas.business_impact_fields` pentru clienți custom.
   - Calculăm `impact_data` (toate valorile, inclusiv mode-urile) → salvat în `client_checkins.real_results_data.business_impact`.
   - `missing_fields[]` = chei cu `mode === "unknown"` → tot în `real_results_data.business_impact_missing`.
   - Pentru fiecare câmp `mode === "exact" | "approx"` cu `db_field` și valoare numerică validă → construim un `business_impact_entries` row (single insert pentru întreaga lună, agregat). `mode === "approx"` adaugă flag `qualitative_feedback: "approximate values"`.
   - `observed_real_results` derivat: dacă există valori cu mod exact/approx → `"yes"`; dacă tot ce există e unknown/N/A → `"unknown"`.

## Curățenie

- Component `BusinessImpactQuickForm` rămâne în repo (nu mai e importat din `ClientDashboard`, deja eliminat) — nu îl ștergem, în caz că agenția îl folosește în alt context (verific cu `rg`).
- Schema zod actualizată: scot `results_observed` enum hard, devine derivat.

## Fișiere

**Noi:**
- `src/lib/businessImpactByNiche.ts` — config + tipuri
- `src/components/client/BusinessImpactSection.tsx` — UI

**Editate:**
- `src/components/client/ClientQuickCheckIn.tsx` — înlocuire Section 3 + logică submit + curățenie state vechi

## Out of scope

- Modificări de schema DB (nu e nevoie — folosim `real_results_data` jsonb și `business_impact_entries` existent)
- Edge function changes (AI deja primește `real_results_data` + `missing_data`)
