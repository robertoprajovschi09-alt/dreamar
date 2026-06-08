# Compact "Adaugă client" — single screen + invite

## Goal
Make the default "Adaugă client" a fast, single-screen form that captures only what the agency needs to invite a client to onboard themselves. The full 7-step wizard stays available behind a small "Completează manual" link for the rare case the agency wants to fill everything itself.

## New component: `QuickAddClientDialog`
File: `src/components/client/QuickAddClientDialog.tsx`

Single Dialog, one screen, no stepper. Fields:

- **Numele clientului** — required
- **Email** — required (used for the invite)
- **Nișă** — Select from `useAgencyNiches(agencyId)` (same library the wizard uses), required
- Optional, collapsed visually on the same screen: **Website**, **Oraș**, **Logo** (uses the same upload UX as the wizard — public bucket), **Culoare brand** (color input, default `#E11D2E`)

Footer:
- Link/button "Completează manual" → closes the quick dialog and opens the full `AddClientWizard`
- "Anulează" / "Creează & invită" (primary)

## Submit flow (`handleCreate`)
All inside one busy state. On success: toast, close, `onCreated(clientId)`, navigate to `/agency/clients/<id>`.

1. **Resolve niche**: from selected `NicheRow`. If `is_custom` → `niche: "custom"`, `custom_niche: row.label`, `niche_id: row.id`. Otherwise `niche: row.key`, `niche_id: row.id`. No custom-niche creation flow here.
2. **Insert into `clients`** with:
   - `agency_id`, `name`, `email` saved as `contact_email`
   - `niche`, `custom_niche`, `niche_id`
   - `website`, `city`, `logo_url`, `brand_color` (only if provided)
   - `status: "onboarding"`
   - Do NOT set platforms, goals, brand_voice, target_audience, services, ai_strategy_base — the client fills these during onboarding.
3. **Seed `client_kpi_schemas`** from the selected niche library row (mapping kpis/fields/questions the same way `applyNicheFromLibrary` does in the wizard), so dashboards/reports have a schema even before the client fills onboarding. If the row has no entries, fall back to `getNichePreset(row.key)` for non-custom niches; for custom niches with no entries, insert empty arrays.
4. **Default onboarding tasks** — same 5 tasks the wizard inserts today.
5. **Base AI memory entry**: insert one `ai_memory_items` row with `memory_type: "business_context"`, title `Client created — <name>`, content noting niche + that onboarding is pending. (Replaces today's brief-driven memory rows.)
6. **Create invite**: insert into `client_invites` with `agency_id`, `client_id`, `email` (lowercased), `portal_role: "client_owner"`, default `permissions: { approve_content: true, view_reports: true, fill_business_impact: true, comment_on_content: true }`, `invited_by: user.id`. Returns `token`.
7. **Send invite email**: `supabase.functions.invoke("send-client-invite", { body: { token } })`.
   - On `{ ok: true }` → toast `Invitație trimisă pe email către <email>`.
   - On failure → toast warning + show copyable accept link inline before closing (small section that appears under the form with copy button); the client row is still created.

## Logo upload
Reuse the same logic as the recently-fixed wizard upload: public bucket, public URL stored on `clients.logo_url`. Pull the existing helper out of `AddClientWizard.tsx` into a tiny shared helper or duplicate the few lines inline — whichever is smaller.

## Wiring in `src/pages/agency/Clients.tsx`
- The existing "Adaugă client" primary button (currently `openCreate` → `setWizardOpen(true)`) now opens `QuickAddClientDialog` instead.
- The full `AddClientWizard` stays mounted but is only opened from the quick dialog's "Completează manual" link.
- The existing "Adăugare rapidă" secondary button + dialog is removed (the new quick dialog supersedes it).
- `onCreated` of both dialogs continues to call `load()`.

## What does NOT change
- `AddClientWizard.tsx` internals stay as-is — it's still the manual escape hatch.
- `send-client-invite` edge function, `client_invites` schema, niches library, and onboarding tasks logic are unchanged.
- No DB migration required.

## Files touched
- **New**: `src/components/client/QuickAddClientDialog.tsx`
- **Edited**: `src/pages/agency/Clients.tsx` (swap default button target, remove the old "Adăugare rapidă" quick dialog, mount the new component, pass through to wizard for "Completează manual")
