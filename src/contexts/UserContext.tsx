import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];
type Agency = Database["public"]["Tables"]["agencies"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role | null;
  agency_id: string | null;
  client_id: string | null;
  is_saas_admin: boolean;
};

type Ctx = {
  loading: boolean;
  profile: UserProfile | null;
  agency: Agency | null;
  client: Client | null;
  refresh: () => Promise<void>;
};

const UserCtx = createContext<Ctx>({} as Ctx);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null); setAgency(null); setClient(null); setLoading(false);
      return;
    }
    setLoading(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,agency_id,client_id,is_saas_admin")
      .eq("id", user.id)
      .maybeSingle();

    let p = prof as UserProfile | null;

    // Self-heal: if no profile yet (race after signup), poll briefly.
    if (!p) {
      for (let i = 0; i < 5 && !p; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const { data } = await supabase
          .from("profiles").select("id,email,full_name,role,agency_id,client_id,is_saas_admin")
          .eq("id", user.id).maybeSingle();
        p = data as UserProfile | null;
      }
    }

    // Self-heal: an active client_users link always wins over a stale agency_owner profile
    // (handles users created before the invite-flow fix).
    if (p) {
      const { data: cu } = await supabase
        .from("client_users")
        .select("agency_id,client_id,role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cu) {
        p = { ...p, role: "client_viewer", agency_id: cu.agency_id, client_id: cu.client_id };
      } else if (!p.role || !p.agency_id) {
        const { data: m } = await supabase
          .from("agency_members")
          .select("agency_id,role")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (m) {
          p = { ...p, role: (p.role || (m.role as Role)), agency_id: p.agency_id || m.agency_id };
        }
      }
    }

    setProfile(p);

    let ag: Agency | null = null;
    let cl: Client | null = null;
    if (p?.agency_id) {
      const { data } = await supabase.from("agencies").select("*").eq("id", p.agency_id).maybeSingle();
      ag = data as Agency | null;
    }
    if (p?.client_id) {
      const { data } = await supabase.from("clients").select("*").eq("id", p.client_id).maybeSingle();
      cl = data as Client | null;
    }
    setAgency(ag);
    setClient(cl);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  return (
    <UserCtx.Provider value={{ loading: loading || authLoading, profile, agency, client, refresh: load }}>
      {children}
    </UserCtx.Provider>
  );
}

export const useUser = () => useContext(UserCtx);
