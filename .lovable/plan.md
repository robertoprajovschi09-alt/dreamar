Add a secondary "Quick add" button beside the existing "Add client" button in `src/pages/agency/Clients.tsx`.

### What will change
- In the header row of `Clients.tsx`, render a second button next to the primary "Add client" button:
  - Label: "Quick add"
  - Style: `variant="outline"` (secondary, does not compete with the primary CTA)
- Clicking "Quick add" opens a small Dialog (reuse `components/ui/dialog`) containing only:
  - Client name — required text input (`components/ui/input`)
  - Niche — required select dropdown (`components/ui/select`) populated from the existing `NICHES` constant in `src/lib/niches.ts`
- On submit:
  1. Insert a row into the `clients` table with:
     - `name`: provided name
     - `niche`: selected niche value
     - `status`: "onboarding"
     - `agency_id`: current agency id
  2. Show a success toast
  3. Navigate to `/agency/clients/{newClientId}`
  4. Refresh the client list
- The existing `AddClientWizard` component and the primary "Add client" button remain completely untouched.
- No new files are created; all changes are confined to `src/pages/agency/Clients.tsx`.

### What will NOT change
- The full `AddClientWizard` flow, its button, or its component.
- Any other dashboard or client-list UI or logic.
- Database schema.