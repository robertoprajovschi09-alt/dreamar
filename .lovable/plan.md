## Obiectiv

Toate modulele construite în Faze 1-5 să fie complet funcționale end-to-end (fără Stripe), plus un **brief obligatoriu** pe care clientul îl completează la prima logare după ce acceptă invitația.

---

## 1. Audit rapid al stării actuale

Ce există deja și funcționează:
- Auth + roluri (agency_owner, agency_team, client_viewer, saas_admin)
- Multi-tenant cu RLS pe toate tabelele
- Clients CRUD + invitații client + portal client
- Content calendar + editor + aprobare
- Performance (videos + niche dashboards)
- Tasks (Kanban), Campaigns, Documents
- Reports AI + Assistant AI (edge functions deployed)

Ce **lipsește pentru a fi 100% funcțional** (fără Stripe):
1. **Client brief** la prima intrare în portal (cerut acum)
2. **Monthly goals** — tabela există dar nu e folosită nicăieri în UI
3. **Business impact** — tabela `business_impact_entries` există dar nu e completată din portal
4. **Content approval** din portal client (tabela există, dar portalul doar listează — fără butoane Approve/Request changes/Reject + comment)
5. **Notifications/dashboard live** — agency dashboard arată doar count clienți; lipsesc: top performers, scădere performanță, task-uri urgente, conținut în așteptare aprobare, postări luna asta
6. **Polish**: toast-uri, empty states consistente, loaders, mobile menu pe AgencyLayout

---

## 2. Client brief la prima intrare (feature nou principal)

### Schema
Migration nouă: tabela `client_briefs`
```
id, agency_id, client_id, submitted_by,
business_description text,
main_objective text,            -- "Ce vrei să obții în următoarele 3 luni?"
target_audience text,            -- "Cine este clientul tău ideal?"
unique_selling_points text,      -- "De ce te-ar alege cineva pe tine?"
main_competitors text,
brand_tone text,                 -- prietenos / profesional / luxos / energic
content_dos text,                -- "Ce VREI să comunicăm"
content_donts text,              -- "Ce NU vrei să apară niciodată"
preferred_platforms text[],
posting_frequency text,
budget_range text,
extra_notes text,
completed boolean default false,
created_at, updated_at
unique(client_id)
```
RLS: agency members read/write pentru agency_id; client_viewer al acelui client read/write doar rândul propriu.

### UX
- După `accept_client_invite`, redirect rămâne pe `/client`.
- `ClientPortal` verifică dacă există `client_briefs` cu `completed=true` pentru clientul curent. Dacă nu → afișează **`BriefWizard`** full-screen (nu poate fi închis). 4 pași simpli (~10 câmpuri total), progress bar, "Salvează și continuă mai târziu" salvează ciorna (`completed=false`).
- La submit final: `completed=true` → portal normal apare.
- În agency: tab nou **"Brief"** pe `ClientProfile.tsx` care arată conținutul + buton "Mark as reviewed".

### Files
- `supabase/migrations/<ts>_client_brief.sql`
- `src/components/client/BriefWizard.tsx` (4 pași, shadcn)
- `src/lib/brief.ts` (fetch/save helpers + zod schema)
- edit `src/pages/client/ClientPortal.tsx` (gating logic)
- edit `src/pages/agency/ClientProfile.tsx` (tab Brief)

---

## 3. Restul de "make it functional"

### A. Monthly goals (folosește tabela existentă)
- Tab **"Goals"** pe `ClientProfile.tsx`: listă obiective lunare + form (objective, metric, target, deadline, owner).
- Card pe `ClientPortal` "Obiectivele lunii" (read-only pentru client).
- Apare automat în Reports AI (edge function deja citește acolo).

### B. Business impact din portal client
- În `ClientPortal`, secțiune **"Impact luna aceasta"** cu form lunar: calls, dms, bookings, sales €, feedback liber.
- Insert în `business_impact_entries` cu `created_by = auth.uid()`. Update RLS să permită client_viewer să insereze pentru clientul lui (acum doar agency members pot).

### C. Content approval din portal client
- În tab Content al portalului, fiecare post cu `approval_status='pending'` primește 3 butoane: Approve / Request changes / Reject + textarea comment.
- Insert în `content_approvals` (RLS deja permite) + update `content_posts.approval_status`.
- Notificare vizuală în agency `Content.tsx` (badge "X pending").

### D. Agency Dashboard real
Înlocuiește `AgencyDashboard.tsx` cu:
- KPI cards: total clients, posts published this month, pending approvals, urgent tasks (deadline <7 zile)
- Lista **Top performers** (top 3 clienți după views ultima lună din `videos`)
- Lista **Scădere performanță** (clienți cu engagement_rate luna asta < 80% din luna trecută)
- Lista **Aprobări așteptate** + **Task-uri urgente** + **Brief-uri necompletate**
- Buton "Generează raport lunar" (link către Reports)

### E. Polish
- Mobile sidebar (Sheet) pe `AgencyLayout`
- Empty states consistente cu CTA
- Toast pe toate mutațiile
- Loading skeletons pe liste lungi

---

## 4. Plan de testare manual

1. Owner nou se înregistrează → ajunge pe `/agency`, vede dashboard cu empty states.
2. Adaugă client → invită viewer → copiază link.
3. În incognito, viewer acceptă invitația → vede **BriefWizard** obligatoriu.
4. Completează brief → ajunge în portal → vede goals + impact form + content (gol).
5. Owner adaugă goals + content post → viewer vede în portal, dă Approve cu comment.
6. Owner vede badge "1 approved" + comment în `Content.tsx`.
7. Viewer completează business impact → owner vede în tab Performance.
8. Owner generează AI report → marchează client_visible → viewer vede raportul.
9. Refresh pe fiecare pagină — tot persistă, nimic nu pică.

---

## 5. Ordine de execuție propusă

**Faza A (acum)** — Client brief end-to-end (migration + wizard + gating + tab agency)
**Faza B** — Approval în portal + business impact din portal + RLS update
**Faza C** — Monthly goals UI (agency + client read)
**Faza D** — Agency Dashboard real cu widget-uri
**Faza E** — Polish (mobile, empty states, toasts, skeletons)

Stripe / billing / SaaS admin rămân explicit afară până ceri tu.

---

## Out of scope acum
Stripe, plan limits enforcement vizibil în UI, email-uri reale (link copiat rămâne), white-label branding, AI auto-summary pe documente.

Confirmă "go faza A" și încep cu briefingul + restul în ordine.