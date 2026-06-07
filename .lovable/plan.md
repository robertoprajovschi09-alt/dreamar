Restructure the mobile bottom nav in `src/components/AgencyLayout.tsx` to fix overflow on phones.

1. In the `md:hidden fixed bottom-0` nav bar, render only 5 items:
   - Dashboard (`/agency`)
   - Clients (`/agency/clients`)
   - Content (`/agency/content`)
   - Approvals (`/agency/approvals`)
   - "More" button (opens a Sheet)

2. Replace the current `mobileNav.map(...)` with the 5-item grid.

3. Add a `<Sheet>` (already available in `components/ui/sheet`) triggered by the "More" button.
   - The Sheet will list all remaining nav items in a scrollable vertical list inside the sheet content.
   - Use `side="bottom"` so it slides up from the bottom, matching the mobile context.

4. Keep the desktop sidebar, route definitions, icons, styling tokens (`text-accent`, `text-muted-foreground`, `border-t`, etc.), and the `saas_admin` section exactly as they are. No other files touched.