# Plan: Invitații 100% funcționale + verificare dashboard client

## 1. Resend trimite efectiv email (client + echipă)

**Problemă:** `resend_client_invite` și `resend_team_invite` (RPC) doar updatează DB (`last_sent_at`, `send_count`, `expires_at`). Nu trimit nimic. `PortalSettingsCard.resend()` cheamă doar RPC-ul → emailul nu pleacă.

**Fix:** după RPC, cheamă și edge function-ul corespunzător (`send-client-invite` / `send-team-invite`) cu `token`. Pe lipsa `RESEND_API_KEY` (sau orice eroare 5xx de la Resend), edge-ul deja întoarce `{ ok: false, error }` — UI-ul trebuie să afișeze `toast.error` clar ("Emailul nu a putut fi trimis: <motiv>. Copiază linkul manual.") în loc de success.

Fișiere:
- `src/components/client/PortalSettingsCard.tsx` — funcția `resend(id, token)`: după RPC, `supabase.functions.invoke("send-client-invite", { body: { token } })`, verifică `data.ok`; pe fail → `toast.error` + nu mai zice "refreshed".
- `src/pages/agency/Team.tsx` — există deja invoke după RPC (linia 109), dar nu se uită la `data.ok`. Adaugă verificare + `toast.error` pe fail.

## 2. Fallback link copiabil + status + acțiuni în listă

**Stadiu actual:** `PortalSettingsCard` deja are `copyLink`, `resend`, `revokeInvite` pentru invitații de client; `Team.tsx` are echivalentul pentru echipă. Verific că ambele afișează:
- linkul `accept-invite?token=...` / `accept-team-invite?token=...` (sau buton "Copiază link")
- status badge (sent / opened / accepted / expired / revoked) — soft pill RO
- butoane Retrimite / Revocă / Copiază

Localizare toasturi/labels în română ("Invitație reîmprospătată", "Link copiat", "Invitație revocată", "Acces revocat"). Verific și Team.tsx la fel.

Fișiere: `PortalSettingsCard.tsx`, `src/pages/agency/Team.tsx`.

## 3. Edge function `send-team-invite`

Există deja (`supabase/functions/send-team-invite/index.ts`) — nu trebuie creată. Verific doar că e listată în `supabase/config.toml` la fel ca `send-client-invite`. Dacă lipsește din config, o adaug (numai blocul funcției, nu setări globale).

## 4. Wizard pasul "Invitație" + QuickAdd

`AddClientWizard` (linia 537) și `QuickAddClientDialog` (185) cheamă deja `send-client-invite`. Verific că tratează `data.ok === false` și arată eroarea exactă (nu doar success). Localizez în RO.

## 5. Dashboard client per niche — verificare

Inspectez `ClientDashboard.tsx`, `ClientPortal.tsx`, `RealEstateDashboardSection.tsx`, `NicheDashboardSection.tsx`, `CustomNicheDashboardSection.tsx`. Pentru fiecare:
- empty state RO ("Încă nu sunt date pentru această secțiune.")
- loading skeleton
- error state cu retry
- responsive (grid → stack pe mobil)
- `brandStyle(client.brand_color)` aplicat pe wrapper + `logo_url` în header

Vederea de agenție `ClientProfile.tsx` — verific că tab-urile Brief, Feedback, Obiective, Aprobări încarcă datele și au error/empty state.

Doar diff-uri minimale acolo unde lipsesc statele sau brandingul. Nu rescriu logica de afișare a metricilor.

## 6. Migrări

Nu sunt necesare migrări noi pentru aceste fix-uri (RPC + edge functions există). Dacă descopăr policy lipsă pe `team_invites` în timpul implementării, voi adăuga migrare separată ca fișier în `supabase/migrations/`.

## Teste

1. Creare invitație client din wizard → email primit SAU link copiat → cont nou Google → `/accept-invite?token=...` → portal client_viewer, `client_users` populat, `client_invites.status='accepted'`.
2. La fel pentru team_invite (`agency_team`, `content_creator`) → `/agency` cu rol corect.
3. Resend: apăs "Retrimite" → email nou ajunge (verific în Resend logs SAU log toast).
4. Resend cu `RESEND_API_KEY` invalid → toast roșu cu motiv, nu success.
5. Dashboard client cu niche=real_estate / restaurant / dental / fitness / custom → cardurile fiecărui niche se randează; brand_color colorează accent.

## Atinse / Ne-atinse

- ✅ UI (PortalSettingsCard, Team, AddClientWizard, QuickAddClientDialog, dashboard niches)
- ✅ Edge config (dacă lipsește send-team-invite din config.toml)
- ❌ AI/Gemini — neatins
- ❌ RPC-uri DB existente — neatins (doar UI-ul cheamă edge după ele)
