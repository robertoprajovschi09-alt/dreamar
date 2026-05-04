## De ce nu merge AI Assistant

Edge function-ul `supabase/functions/ai-assistant/index.ts` interoghează **coloane care nu există** în baza de date:

- `clients.goals` → coloana se numește `objectives`
- `videos.title` → nu există (folosim `hook`)
- `videos.published_at` → coloana se numește `publish_date`
- `videos.sales_value` → coloana se numește `estimated_sales_impact`

PostgREST returnează o eroare gen `column videos.title does not exist`, function-ul returnează 500, iar UI afișează acel mesaj ciudat ("ai brief case" = fragment din "could not find … in the schema cache" tradus prin browser sau mesaj de eroare brut).

**Aceeași problemă există în `ai-report`** (folosește `videos.title`, `videos.published_at`, `videos.sales_value`, `videos.sales_count`, `videos.calls_booked`, `videos.dms_received`, `content_posts.published_at`). Deci raportul AI ESTE deja stricat, dar nu l-ai testat încă.

---

## Faza 6 — Fix complet "make it usable"

### 1. Reparare AI Assistant + AI Report (blocker)
- Rescriu `ai-assistant/index.ts`: folosesc coloane reale (`hook`, `publish_date`, `estimated_sales_impact`), adaug context din `client_briefs`, `monthly_goals`, `client_feedback` (deja confirmate că există în schemă).
- Rescriu `ai-report/index.ts`: folosesc `views/reach/likes/comments/shares/saves/calls/dms/estimated_sales_impact/publish_date` din `videos` și `scheduled_for` din `content_posts`. Adaug context: brief, goals, niche-specific tables (real estate / restaurant / dental / fitness / custom) — astfel raportul devine specific pe nișă.
- Redeploy ambele edge functions.

### 2. Niche-specific AI (acum doar metrici generice)
Edge function-urile primesc `client.niche` și încarcă tabela respectivă (`niche_real_estate_properties`, `niche_restaurant_items`, `niche_dental_treatments`, `niche_fitness_offerings`, `niche_custom_metrics`). System prompt-ul devine "Ești expert în [niche] marketing" și recomandările devin pe nișă.

### 3. Client dashboard pe nișă
Acum `ClientPortal /overview` arată doar 3 KPI-uri generale. Adaug:
- **NicheSummaryCard**: pentru fiecare nișă, citește tabela respectivă (read-only pentru client_viewer prin policy nouă) și afișează 3-4 KPI specifici ("Apartamente listate / Vizionări / Oferte" pentru real estate etc.).
- Card "Last AI report" (dacă există unul `client_visible`).
- Card "This month's business impact" (sumar `business_impact_entries` pentru luna curentă).

Migrare nouă: extind RLS pe `niche_*` și `business_impact_entries` să permită `is_client_viewer_of(auth.uid(), client_id)` la SELECT (acum doar agency members văd).

### 4. SaaS Admin dashboard (acum lipsește complet)
Există coloana `profiles.is_saas_admin` și funcția `is_saas_admin()`, dar nu există nicio pagină.
- Rută nouă `/admin` cu `<RoleRoute allow={["saas_admin"]}>`.
- Pagină `AdminDashboard.tsx`:
  - KPI: total agencies, total clients, total users, MRR estimat (din `subscriptions.plan` × `plans.price_eur`).
  - Tabel agencies cu nume, plan, status (suspended), număr clienți, număr team members, data creării.
  - Buton "Suspend / Reactivate" (update `agencies.suspended`).
  - Tabel clients cross-agency.
- Adaug link în `AgencyLayout` care apare doar dacă `profile.is_saas_admin = true`.

### 5. Mic polish necesar pentru a fi utilizabil
- `AgencyLayout` nu are meniu mobile → adaug `Sheet` cu sidebar pentru < lg.
- `Content.tsx` nu marchează vizual posturile cu `approval_status='changes_requested'` → adaug badge roșu + comentariu client.
- Pe `ClientProfile`, în tabul Performance, dacă nu sunt video-uri, butonul "Add video" trebuie mai vizibil.
- Empty states peste tot să aibă CTA către acțiunea principală.

---

## Cum testezi după (checklist concret)

1. **AI Assistant** funcționează cu scope "Whole agency" și "Specific client" — răspunde streaming, fără 500.
2. **AI Report** se generează din `/agency/reports`, salvat în DB, marcabil `client_visible` → apare în portalul clientului.
3. **Brief** obligatoriu apare la prima logare client; după submit, dispare.
4. **Approve / Request changes** din portal client → status post se schimbă în `Content.tsx`.
5. **Niche dashboards**: deschizi un client de tip "real_estate", vezi tabel proprietăți; "restaurant" vezi item-uri; "dental" tratamente; "fitness" oferte; "custom" KPI custom.
6. **Client portal Overview** arată acum și sumar pe nișă + ultimul raport + impact lună.
7. **/admin** accesibil doar dacă `profiles.is_saas_admin = true` → vezi listă agenții + suspend.
8. **Mobile**: sidebar agenție se deschide cu burger, totul navigabil.

---

## Ordine de execuție

**Pas 1 (blocker)**: fix `ai-assistant` + `ai-report` + redeploy. Fără asta nimic AI nu merge.
**Pas 2**: Migration RLS pentru tabelele `niche_*` și `business_impact_entries` (read pentru client viewer).
**Pas 3**: NicheSummaryCard în ClientPortal + card "ultimul raport" + impact lună.
**Pas 4**: Pagina `/admin` cu suspend pe agenții.
**Pas 5**: Polish (mobile sidebar, badge changes_requested, empty states).

După Pas 1 deja poți folosi AI Assistant și genera rapoarte. Restul aduce SaaS-ul la stare 100% utilizabilă.

Stripe rămâne în continuare afară. Confirmă "go faza 6" și execut în ordine.