Stop flagging brand-new / no-data clients as "At risk" and show a neutral "Collecting data" state instead.

## Rule
A client is in **Collecting data** state when EITHER:
- `created_at` is less than 30 days ago, OR
- it has zero `analytics_entries` AND zero `business_impact_entries`.

## 1. New helper — `src/lib/clientStatus.ts`
```ts
export const COLLECTING_DATA_LABEL = "Collecting data";
export const COLLECTING_BADGE_CLASS =
  "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";

export function isCollectingData(
  client: { created_at: string | Date },
  hasAnalytics: boolean,
  hasBusinessImpact: boolean,
): boolean {
  const ageMs = Date.now() - new Date(client.created_at).getTime();
  const under30d = ageMs < 30 * 24 * 60 * 60 * 1000;
  if (under30d) return true;
  return !hasAnalytics && !hasBusinessImpact;
}

export async function fetchCollectingClientIds(
  agencyId: string,
): Promise<Set<string>>;   // batched query; used by dashboard + risk
```
The async helper does, in parallel:
- `clients.select("id,created_at").eq("agency_id", agencyId)`
- `analytics_entries.select("client_id").eq("agency_id", agencyId)`
- `business_impact_entries.select("client_id").eq("agency_id", agencyId)`

Builds two Sets of client ids that have data, then returns the Set of ids where `isCollectingData(...)` is true.

## 2. `src/pages/agency/AgencyDashboard.tsx`
- After loading `clientsList`, `analyticsThisMonth`, plus a new `business_impact_entries` fetch, compute `collecting: Set<string>` using `isCollectingData`. (Use lifetime presence, not the month-bounded query — extend the existing fetch or do a fresh `select("client_id")` without the `gte`.)
- Filter `healthScores` → `scoredHealth = healthScores.filter(h => !collecting.has(h.client_id))`.
  - `avgHealth`, `healthy`, `atRisk` are computed from `scoredHealth`.
- Filter `riskAlerts` → only keep `!collecting.has(a.client_id)`.
- In the "Client Health" grid, still render all 6 cards, but for cards where the client is in `collecting`, render the new "Collecting data" badge (see step 5) instead of the ring + status label.

## 3. `src/lib/risk.ts` — `detectForAgency`
- Before invoking the edge function, call `fetchCollectingClientIds(agencyId)`.
- Pass the array to the function as `exclude_client_ids` in the body (best effort; edge function can honor it later).
- Resolve client-side regardless: after the call, set `status = "ignored"` on any active `client_risk_alerts` rows whose `client_id` is in the collecting set, so existing stale alerts disappear immediately.

## 4. Client list (`src/pages/agency/Clients.tsx`) + profile (`ClientProfile.tsx`)
- `Clients.tsx`: load the collecting set once via `fetchCollectingClientIds(agency.id)`; for rows in that set, render the new `<CollectingDataBadge />` in the Status column (replacing the plain status text) so the row visibly reads "Collecting data" instead of any risk treatment.
- `ClientProfile.tsx`: wrap `<HealthScoreCard clientId={client.id} />` so that when `isCollectingData(client, hasAnalytics, hasBusinessImpact)` is true, render the `<CollectingDataBadge />` + short helper copy ("We'll start scoring health and risk after 30 days or once analytics / business-impact data is added.") instead of the health card. This avoids the "50" / "At risk" treatment for new clients.

## 5. Small shared component — `src/components/health/CollectingDataBadge.tsx`
```tsx
import { Badge } from "@/components/ui/badge";
import { Hourglass } from "lucide-react";
import { COLLECTING_BADGE_CLASS, COLLECTING_DATA_LABEL } from "@/lib/clientStatus";

export function CollectingDataBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={`${COLLECTING_BADGE_CLASS} ${className ?? ""}`}>
      <Hourglass className="h-3 w-3 mr-1" /> {COLLECTING_DATA_LABEL}
    </Badge>
  );
}
```

Used in: `HealthScoreMini` (replaces ring + status badge when `collecting` prop is true), Clients table, ClientProfile.

## Out of scope
- No change to `healthScore` computation, risk weights, or any other clients/non-collecting flows.
- No DB / edge function changes (edge function may ignore `exclude_client_ids` until separately updated; client-side ignore covers the UI).