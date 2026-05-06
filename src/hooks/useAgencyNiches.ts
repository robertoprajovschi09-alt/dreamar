import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CustomKpi = {
  id?: string;
  key: string;
  label: string;
  kpi_type: "number" | "percentage" | "currency" | "text" | "boolean";
  reporting_frequency: "daily" | "weekly" | "monthly";
  visible_to_client: boolean;
  sort_order?: number;
};
export type CustomField = {
  id?: string;
  key: string;
  label: string;
  field_type: "number" | "percentage" | "currency" | "text" | "boolean";
  sort_order?: number;
};
export type CustomQuestion = {
  id?: string;
  key: string;
  label: string;
  sort_order?: number;
};

export type NicheRow = {
  id: string;
  agency_id: string | null;
  key: string;
  label: string;
  is_custom: boolean;
  kpis: CustomKpi[];
  fields: CustomField[];
  questions: CustomQuestion[];
};

export function useAgencyNiches(agencyId?: string | null) {
  return useQuery({
    queryKey: ["agency-niches", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<NicheRow[]> => {
      const { data: niches, error } = await supabase
        .from("niches")
        .select("id, agency_id, key, label, is_custom")
        .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
        .order("is_custom", { ascending: false })
        .order("label");
      if (error) throw error;
      const ids = (niches || []).map((n) => n.id);
      if (!ids.length) return [];
      const [{ data: kpis }, { data: fields }, { data: questions }] = await Promise.all([
        supabase.from("custom_niche_kpis").select("*").in("niche_id", ids).order("sort_order"),
        supabase.from("custom_niche_fields").select("*").in("niche_id", ids).order("sort_order"),
        supabase.from("custom_niche_questions").select("*").in("niche_id", ids).order("sort_order"),
      ]);
      return (niches || []).map((n) => ({
        ...n,
        kpis: ((kpis || []) as any[]).filter((x) => x.niche_id === n.id),
        fields: ((fields || []) as any[]).filter((x) => x.niche_id === n.id),
        questions: ((questions || []) as any[]).filter((x) => x.niche_id === n.id),
      }));
    },
  });
}
