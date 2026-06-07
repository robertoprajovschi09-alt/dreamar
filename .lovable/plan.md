## Goal
Move "Team" and "Billing" navigation items out of the main sidebar and into the user dropdown menu in the header, marking them with a "Soon" badge while keeping their routes and pages intact.

## Changes

### 1. `src/components/AgencyLayout.tsx`
- Remove `UserCog` and `CreditCard` from the `remainingNav` array so they no longer appear in the sidebar.
- Add a new `soonNav` array (or inline items) for Team and Billing with their icons, labels, and routes.
- In the header `DropdownMenuContent`, after the "Sign out" item (or before the separator), add two `DropdownMenuItem` entries:
  - Each navigates to `/agency/team` and `/agency/billing` respectively.
  - Each shows its icon, label, and a small `Badge` with text "Soon".
- Keep routes and page files untouched. Do not modify `Team.tsx` or `Billing.tsx`.

### 2. Mobile navigation
- Remove Team and Billing from `mobileNav`, `mobileMore`, or any other mobile nav lists so they only appear in the dropdown.

## What stays the same
- `src/pages/agency/Team.tsx` and `src/pages/agency/Billing.tsx` remain unchanged.
- Route definitions remain unchanged.
- All other nav items stay in their current positions.
