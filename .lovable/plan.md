# Refactor: Add Client → Premium Onboarding Wizard

Replace the simple "Add Client" dialog with a multi-step wizard that captures everything an agency needs to start working — and optionally invites the client user in the same flow. Everything saves real data into Supabase respecting RLS, multi-tenant isolation, and existing roles.

## Schema change (single migration)

Add one nullable column to `public.clients`:
- `custom_niche text` — free-text niche label, used only when `niche = 'custom'`. The existing `niche` enum stays as-is (no enum changes needed; existing values still work).

No RLS changes required (column inherits existing client policies).

## New wizard component

Create `src/components/client/AddClientWizard.tsx` — a `Dialog` containing 4 steps with a progress indicator, Back/Next navigation, validation per step, and a final "Create client" action.

```text
[1 Basics] → [2 Brand & Audience] → [3 Services & Goals] → [4 Invite client]
```

### Step 1 — Basics (required)
- `name *` (text)
- `niche *` (Select from `NICHES`). When `custom` is selected, show an inline `custom_niche` input (required).
- `city`, `website`, `status` (active/paused/prospect)
- `contact_person`, `contact_email`, `contact_phone`

### Step 2 — Brand & Audience
- `brand_voice` (textarea)
- `tone_of_voice` (short)
- `target_audience` (textarea)
- `brand_color` (color picker + hex input)
- `social_links` (instagram / tiktok / facebook / youtube / linkedin handles → stored as jsonb)

### Step 3 — Services & Goals
- `platforms` (multi-select from `PLATFORMS` → text[])
- `services` (chip input → jsonb array of strings, e.g. "Content", "Ads", "Strategy")
- `monthly_retainer` (number), `start_date` (date), `budget_estimate` (number)
- `objectives` (textarea), `competitors` (textarea), `notes`

### Step 4 — Invite client (optional)
- Toggle: "Invite a client user to the portal now"
- If on: `email *` field. After client insert succeeds, also insert into `client_invites` (same logic as `InviteClientDialog`) and show the generated `/accept-invite?token=…` link with copy button.
- User can also Skip → wizard closes; invite can always be sent later from the client profile.

## Save logic

Single transactional flow on final submit:
1. `supabase.from("clients").insert({ agency_id: agency.id, ...allFields })` — `agency_id` enforced from `useUser().agency`.
2. If invite toggle on: `supabase.from("client_invites").insert({ agency_id, client_id, email, invited_by: user.id })` and surface the link.
3. On success: toast, refresh list, close wizard, optionally navigate to `/agency/clients/:id`.

Errors at any step roll back UI to that step with a clear message (no partial silent failures).

## UI polish
- Stepper header with current step highlighted, completed steps with check.
- Each step in its own panel; smooth transitions.
- Sticky footer: `Back` (disabled on step 1) · `Skip` (only step 4) · `Next` / `Create client`.
- Keyboard: Enter advances, Esc closes with confirm if dirty.
- Reuses existing shadcn `Dialog`, `Input`, `Select`, `Textarea`, `Switch`, `Progress`, `Button`, `Label`.

## Touched files

- `supabase/migrations/<new>.sql` — add `clients.custom_niche`.
- `src/lib/niches.ts` — export helper `displayNiche(niche, custom_niche)` returning the custom string when applicable.
- `src/components/client/AddClientWizard.tsx` — new wizard component.
- `src/pages/agency/Clients.tsx` — replace inline create dialog with `<AddClientWizard>`; keep the existing edit dialog (or also route edit through the wizard — out of scope for this pass, edit stays as a quick form). Update list to render `displayNiche(c.niche, c.custom_niche)`.
- `src/pages/agency/ClientProfile.tsx` — show `custom_niche` when present (small label tweak only if it currently shows niche).

## Multi-tenant & security guarantees
- `agency_id` is taken from authenticated user context, never from the form.
- `client_invites.invited_by` set from `auth.uid()` via `useAuth()`.
- All inserts go through Supabase JS, so existing RLS policies on `clients` and `client_invites` apply unchanged.
- No mock data; every field maps to a real column.
