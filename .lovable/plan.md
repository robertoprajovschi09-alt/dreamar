### Goal
Restructure the desktop sidebar in `AgencyLayout.tsx` into a PRIMARY always-visible section and a collapsible SECONDARY "More" group, while removing two AI nav links and leaving everything else untouched.

### Changes
1. **Split `nav` array** into three arrays:
   - `primaryNav` (always rendered directly):
     Dashboard, Clients, Content, Calendar, Approvals, Analytics, Reports
   - `secondaryNav` (rendered inside collapsible):
     Campaigns, Strategies, Tasks, Documents, Swipe File, Competitors, AI Assistant
   - `remainingNav` (rendered directly below the collapsible):
     Team, Billing, Settings
   - Remove entries for **AI Actions** and **AI Memory** entirely (routes stay alive, just no nav links).

2. **Add collapsible "More" group**
   - Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`.
   - Add `ChevronDown` import from `lucide-react`.
   - Render `primaryNav` as today.
   - Immediately after, render a `<Collapsible defaultOpen={false}>` wrapper labeled "More".
   - Inside it, render `secondaryNav` with identical `NavLink` markup and active-state logic.
   - After the collapsible, render `remainingNav` with identical `NavLink` markup.
   - Keep the saas_admin block exactly as-is (after everything else).

3. **Mobile bottom nav**
   - Build a combined array of `primaryNav + secondaryNav + remainingNav` (no AI Actions / AI Memory) and map it for the mobile nav so the removed items also disappear from the bottom bar.

### Not changing
- No route definitions or route availability.
- No icon imports removed (except any only used by the two dropped links).
- No CSS class or active-state logic changes on individual links.
- No saas_admin section changes.
- No other files touched.