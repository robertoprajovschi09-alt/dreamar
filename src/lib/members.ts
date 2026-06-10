import { supabase } from "@/integrations/supabase/client";

export type AgencyMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

/**
 * Fetch agency members with their profile info, robust against missing PostgREST
 * embed metadata. Tries the embed first, then fills any missing rows from a
 * second `profiles` query.
 */
export async function fetchAgencyMembers(agencyId: string): Promise<AgencyMember[]> {
  const { data, error } = await supabase
    .from("agency_members")
    .select("user_id, profiles:user_id(full_name,email)")
    .eq("agency_id", agencyId);
  if (error) throw error;

  const rows = (data || []).map((x: any) => ({
    user_id: x.user_id as string,
    full_name: (x.profiles?.full_name ?? null) as string | null,
    email: (x.profiles?.email ?? null) as string | null,
  }));

  const missing = rows.filter((r) => !r.full_name && !r.email).map((r) => r.user_id);
  if (missing.length === 0) return rows;

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", missing);
  const map = new Map<string, { full_name: string | null; email: string | null }>();
  (profs || []).forEach((p: any) => map.set(p.id, { full_name: p.full_name, email: p.email }));

  return rows.map((r) =>
    r.full_name || r.email ? r : { ...r, ...(map.get(r.user_id) || {}) },
  );
}
