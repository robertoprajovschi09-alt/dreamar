## Plan

### 1. Add optional City input to Add Client wizard
- In `src/components/client/AddClientWizard.tsx`:
  - Add `city: string` to the `Form` type and `empty` object.
  - Insert a "City" input in the Basics (Step 1) UI, near the other contact/location fields.
  - Include `city: form.city.trim() || null` in the final `clientPayload` so it is saved to `clients.city`.

### 2. Preserve niche_id in the simple Edit dialog
- In `src/pages/agency/Clients.tsx`:
  - Add `niche_id: string | null` to the `Client` type.
  - Add `niche_id` to the Supabase `.select(...)` query so it is fetched.
  - In `handleSave`, when updating an existing client, include `niche_id: editing.niche_id` in the update payload so the library reference is explicitly preserved and not left mismatched against a plain `niche` value.

No other files or dialogs will be changed.