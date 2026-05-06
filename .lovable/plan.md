## Obiectiv

Adăugăm nișa **Hotels / Hospitality / Tourism** ca o nișă completă, premium, integrată în întreg pipeline-ul: Add Client Wizard, Client Dashboard, Quick Check-In, Business Impact, Analytics, Reports și AI generators. Cheia canonică: **`hospitality`** (acoperă hoteluri, pensiuni, boutique hotels, resorturi, vile turistice, Airbnb/short-stay, glamping, retreat-uri, event venues cu cazare).

## Modificări per fișier

### 1. `src/lib/niches.ts`
- Adaug `{ value: "hospitality", label: "Hotels / Hospitality" }` în `NICHES` (înainte de `custom`).

### 2. `src/lib/nichePresets.ts`
- Adaug preset `hospitality` cu KPI fields complete:
  - `bookings`, `reservation_requests`, `direct_inquiries`, `occupancy_rate`, `booked_nights`, `room_inquiries`, `package_inquiries`, `booking_engine_clicks`, `website_clicks`, `whatsapp_inquiries`, `calls`, `messages`, `guest_reviews`, `review_score`, `revenue` (manual), `cost_per_booking` (when ad spend), `roas` (when ad spend).
- `business_impact_fields`: bookings, reservation_requests, calls, messages, revenue_estimate, contracts (pt event venues / nunți).
- `monthly_questions`: cele 7 întrebări din brief.
- Adaug în `NICHE_PRESET_OPTIONS`.

### 3. `src/lib/nicheDashboard.ts`
- Înlocuiesc cheia veche `hotel` (parțial folosită) cu `hospitality` care include:
  - `hero_eyebrow: "Luna aceasta în hospitality"`
  - `impact_section_title: "Rezervări & oaspeți"`
  - `primary_kpi_keys: ["bookings", "reservation_requests", "occupancy_rate"]`
  - `show_latest_report: true`

### 4. `src/lib/nicheDashboardConfigs.ts`
- Adaug `hospitality` în `NICHE_CONFIGS` cu **7 carduri principale** (engine generic le va randa):
  1. Bookings / Reservations (impact_sum: bookings + checkin viewing fallback)
  2. Reservation Requests (checkin: reservation_requests)
  3. Room / Package Interest (checkin_text: room_package_interest)
  4. Guest Messages & Inquiries (impact_sum: dms + calls)
  5. Best Performing Content (top_published_posts)
  6. Reviews / Guest Feedback (checkin_text: guest_reviews)
  7. Next Recommended Actions (AI next_actions)
- `checkin_extras`: cele 7 întrebări (reservation_received Y/N/?, promote_focus chips multi, low_availability_periods text, target_guest_type chips, important_reviews text long, best_package text, important_note text long).

### 5. `src/lib/businessImpactByNiche.ts`
- Adaug `hospitality` config cu câmpuri:
  - `bookings` (number → db `bookings`)
  - `reservation_requests` (number → db `dms`)
  - `direct_inquiries` (number → db `dms`)
  - `booked_nights` (number)
  - `revenue` (currency → db `revenue_estimate`)
  - `guest_reviews_count` (number)
  - `review_score` (number — average 1–5)
  - `occupancy_rate` (number — percent 0–100)
- Toate cu cele 4 moduri: exact / approx / unknown / N/A.

### 6. `src/components/client/ClientDashboard.tsx`
- Adaug `hospitality: "Hotels"` în `NICHE_BADGES`.
- Engine-ul generic `NicheDashboardSection` îl randează automat odată ce `hospitality` e în `NICHE_CONFIGS`. Nu trebuie listă specială.
- Verific check-list-ul `["real_estate", "restaurant", "beauty", "ecommerce", "fitness", "medical", "custom"]` din `ClientDashboard.tsx` — nu mai e folosit după refactor anterior, dar ascund duplicate approval cards dacă există.

### 7. `src/components/client/ClientQuickCheckIn.tsx`
- Nicio modificare directă — `nicheCfg` din `getNicheConfig("hospitality")` randează automat noile întrebări, iar `getImpactConfig("hospitality")` randează automat câmpurile Business Impact.

### 8. `supabase/functions/ai-assistant/index.ts` & `supabase/functions/ai-report/index.ts`
- Adaug în mapa `NICHE_LABELS`: `hospitality: "hotel / hospitality / tourism"` pentru ca AI-ul să folosească tonalitate și terminologie corectă (room rates, occupancy, ADR, RevPAR, seasonality, direct booking vs OTA).
- AI-ul folosește deja `client_dashboard_contexts` + `client_checkins.real_results_data` ca input → primește automat datele noi prin generator-ul existent (`client-dashboard-context-generate`). Nu sunt necesare modificări la edge functions noi.

### 9. AI Smart Dashboard Generator (`client-dashboard-context-generate`)
- Generator-ul actual ia `niche` din `clients` și-l pasează modelului. Voi adăuga în prompt-ul system un fragment specific pentru `hospitality` (booking-driven insights, ce conținut aduce cereri, perioade de promovat, review-uri ca content, CTA-uri pentru direct booking) — un short string concatenat doar când `niche === "hospitality"`.

## AI Insights specifice (livrate prin generator)

Generator-ul va fi instruit să producă insight-uri și `ai_priorities` pentru hospitality care să acopere:
- ce conținut aduce cereri de rezervare;
- ce pachete / camere atrag interes;
- ce perioade au low-occupancy de promovat;
- ce review-uri pot deveni content (UGC / testimonial);
- ce campanii sezoniere de testat;
- ce CTA-uri cresc rezervările directe (vs OTA).

## Missing data handling

- Business Impact fields cu mode `unknown` → `client_checkins.real_results_data.business_impact_missing[]` (deja implementat în BusinessImpactSection).
- Generator-ul AI marchează lipsa `bookings`, `occupancy_rate`, `revenue` în `client_dashboard_contexts.missing_data` → randat în secțiunea "Ce necesită atenție" din ClientDashboard.
- Niciun mock data; fără invenții.

## RLS / multi-tenant

Toate scrierile (business_impact_entries, client_checkins, client_feedback) folosesc `agency_id` + `client_id` din context, identice cu fluxul existent. Niciun policy nou necesar.

## Out of scope

- Tabelă specializată `niche_hospitality_*` (similar cu `niche_real_estate_properties`) — nu necesar pentru cerințele actuale; toate datele structurate trec prin `business_impact_entries` + `client_checkins.real_results_data.hospitality`.
- UI separat pentru room/package management — viitor.
