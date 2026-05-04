import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Agency = Database["public"]["Tables"]["agencies"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Role = Database["public"]["Enums"]["app_role"];

type Ctx = {
  agencies: (Agency & { role: Role })[];
  currentAgency: Agency | null;
  currentRole: Role | null;
  subscription: Subscription | null;
  plan: Plan | null;
  loading: boolean;
  switchAgency: (id: string) => void;
  refresh: () => Promise<void>;
};

const AgencyCtx = createContext<Ctx>({} as Ctx);
const STORAGE_KEY = "agencyos-current-agency";

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [agencies, setAgencies] = useState<(Agency & { role: Role })[]>([]);
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAgencies = useCallback(async () => {
    if (!user) {
      setAgencies([]); setCurrentAgency(null); setSubscription(null); setPlan(null); setLoading(false);
      return;
    }
    setLoading(true);
    const { data: members } = await supabase
      .from("agency_members")
      .select("role, agency:agencies(*)")
      .eq("user_id", user.id);

    const list = (members || [])
      .filter((m: any) => m.agency)
      .map((m: any) => ({ ...m.agency, role: m.role as Role }));
    setAgencies(list);

    const stored = localStorage.getItem(STORAGE_KEY);
    const pick = list.find((a) => a.id === stored) || list[0] || null;
    setCurrentAgency(pick);
    setCurrentRole(pick ? (list.find((a) => a.id === pick.id)?.role || null) : null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAgencies(); }, [loadAgencies]);

  useEffect(() => {
    if (!currentAgency) { setSubscription(null); setPlan(null); return; }
    localStorage.setItem(STORAGE_KEY, currentAgency.id);
    (async () => {
      const [{ data: sub }, { data: pl }] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("agency_id", currentAgency.id).maybeSingle(),
        supabase.from("plans").select("*").eq("tier", currentAgency.plan).maybeSingle(),
      ]);
      setSubscription(sub as any);
      setPlan(pl as any);
    })();
  }, [currentAgency]);

  const switchAgency = (id: string) => {
    const a = agencies.find((x) => x.id === id);
    if (a) { setCurrentAgency(a); setCurrentRole(a.role); }
  };

  return (
    <AgencyCtx.Provider value={{ agencies, currentAgency, currentRole, subscription, plan, loading, switchAgency, refresh: loadAgencies }}>
      {children}
    </AgencyCtx.Provider>
  );
}

export const useAgency = () => useContext(AgencyCtx);
