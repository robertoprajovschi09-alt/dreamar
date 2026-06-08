## Goal
Send a branded Resend email to clients whenever an invite is created, so they get a working accept-link in their inbox instead of relying on the agency copy-pasting it.

## 1. New edge function: `supabase/functions/send-client-invite/index.ts`
- CORS preflight + headers on every response.
- Body: `{ token: string }` (validate with zod or manual check).
- Use service-role Supabase client to query `client_invites` by token → get `email`, `client_id`, `agency_id`, `status`. Reject if not found / revoked / expired.
- Join lookups: `clients.name` and `agencies.name`.
- Build accept URL: `https://dreamar.lovable.app/accept-invite?token=<token>`.
- Read `RESEND_API_KEY` from `Deno.env`. If missing → return `{ ok:false, error:"RESEND_API_KEY not configured" }` (no hardcoding).
- Optional env: `INVITE_FROM_EMAIL` (fallback `onboarding@resend.dev`).
- POST to `https://api.resend.com/emails` with `Authorization: Bearer <key>`, body `{ from, to:[email], subject:"<Agency> invited you to your client portal", html }`.
- HTML body: clean branded layout (inline styles, neutral palette matching app — dark text on white card, accent button), greeting, sentence "<AgencyName> has set up your client portal for <ClientName>.", one prominent CTA button linking to accept URL, plain-text fallback link below, small footer.
- On Resend non-2xx → return `{ ok:false, error }` with details.
- On success → return `{ ok:true }`. Also call `resend_client_invite` style update? No — just leave it; the existing `InviteClientDialog` already sets `status:"sent"` when chosen. Optionally `update client_invites set last_sent_at=now(), send_count=send_count+1` on success.
- Register in `supabase/config.toml` with `verify_jwt = false` so it can be called right after invite creation without extra friction (token itself is the secret).

## 2. Wire into invite flows
Two places create invites today:

**a) `src/pages/agency/InviteClientDialog.tsx`** — already the explicit invite UI.
- After `createInvite()` succeeds and returns the URL, call `supabase.functions.invoke("send-client-invite", { body: { token }})`.
- On `{ ok:true }`: toast `Invitation emailed to <email>` and close (or keep link view as fallback option).
- On failure: keep current behavior (show copy-link view) and toast a soft warning "Email couldn't be sent — share the link manually."
- Need to surface `token` from `createInvite` (currently only returns URL) — extend it to return `{ url, token }`.

**b) `src/components/client/AddClientWizard.tsx`** — the "Add Client" wizard's portal-invite step (if it creates a `client_invites` row inline).
- Locate the insert into `client_invites` in the wizard's finalize step, then immediately invoke `send-client-invite` with the returned token.
- Same toast behavior; if email fails, fall back to showing the copy link the wizard already produces.

## 3. Notes / non-changes
- `RESEND_API_KEY` already exists in secrets — no add_secret call needed.
- No DB migration required.
- No template scaffolding via email_domain tools (user explicitly asked for direct Resend POST).
- Strings user-facing in Romanian to match the rest of agency UI: toast `Invitație trimisă pe email către <email>`, fallback `Emailul nu a putut fi trimis — copiază linkul manual.` Subject + email body stay English per the prompt's wording, unless you want them Romanian (open question below).

## Open question
Email subject/body language: keep English ("<Agency> invited you to your client portal") as written in the request, or translate to Romanian to match the rest of the agency UI?
