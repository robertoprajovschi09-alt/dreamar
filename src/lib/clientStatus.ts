import { supabase } from "@/integrations/supabase/client";

export const COLLECTING_DATA_LABEL = "Colectăm date";
export const COLLECTING_BADGE_CLASS =
  "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isCollectingData(
  client: { created_at: string | Date },
  hasAnalytics: boolean,
  hasBusinessImpact: boolean,
): boolean {
  const ageMs = Date.now() - new Date(client.created_at).getTime();
  if (ageMs < THIRTY_DAYS_MS) return true;
  return !hasAnalytics && !hasBusinessImpact;
}

/**
 * Returns the Set of client ids (within an agency) that are currently in the
 * "Collecting data" onboarding state and should be excluded from risk/health
 * scoring UI.
 */
export async function fetchCollectingClientIds(
  agencyId: string,
): Promise<Set<string>> {
  const [clientsRes, analyticsRes, biRes] = await Promise.all([
    supabase.from("clients").select("id,created_at").eq("agency_id", agencyId),
    supabase.from("analytics_entries").select("client_id").eq("agency_id", agencyId),
    (supabase as any).from("business_impact_entries").select("client_id").eq("agency_id", agencyId),
  ]);

  const hasAnalytics = new Set<string>(
    (analyticsRes.data || []).map((r: any) => r.client_id),
  );
  const hasBI = new Set<string>(
    (biRes.data || []).map((r: any) => r.client_id),
  );

  const collecting = new Set<string>();
  for (const c of clientsRes.data || []) {
    if (isCollectingData(c as any, hasAnalytics.has((c as any).id), hasBI.has((c as any).id))) {
      collecting.add((c as any).id);
    }
  }
  return collecting;
}
