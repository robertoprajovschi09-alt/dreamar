import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Building2, Users, CreditCard } from "lucide-react";
import { toast } from "sonner";

type AgencyRow = {
  id: string; name: string; plan: string; suspended: boolean; created_at: string;
  client_count: number; member_count: number; price_eur: number;
};

export default function AdminDashboard() {
  const { profile, loading } = useUser();
  const [rows, setRows] = useState<AgencyRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setRows(null);
    const [{ data: agencies }, { data: plans }, { data: clients }, { data: members }] = await Promise.all([
      supabase.from("agencies").select("id,name,plan,suspended,created_at").order("created_at", { ascending: false }),
      supabase.from("plans").select("tier,price_eur"),
      supabase.from("clients").select("id,agency_id"),
      supabase.from("agency_members").select("id,agency_id"),
    ]);
    const planPrice = Object.fromEntries((plans || []).map((p: any) => [p.tier, p.price_eur]));
    const clientCount: Record<string, number> = {};
    (clients || []).forEach((c: any) => { clientCount[c.agency_id] = (clientCount[c.agency_id] || 0) + 1; });
    const memberCount: Record<string, number> = {};
    (members || []).forEach((m: any) => { memberCount[m.agency_id] = (memberCount[m.agency_id] || 0) + 1; });
    setRows((agencies || []).map((a: any) => ({
      ...a,
      client_count: clientCount[a.id] || 0,
      member_count: memberCount[a.id] || 0,
      price_eur: planPrice[a.plan] || 0,
    })));
  };

  useEffect(() => { if (profile?.is_saas_admin) load(); }, [profile?.is_saas_admin]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!profile?.is_saas_admin) return <Navigate to="/admin-login" replace />;

  const toggleSuspend = async (a: AgencyRow) => {
    setBusy(a.id);
    const { error } = await supabase.from("agencies").update({ suspended: !a.suspended }).eq("id", a.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(a.suspended ? "Agency reactivated" : "Agency suspended");
    load();
  };

  const totals = (rows || []).reduce((acc, r) => ({
    agencies: acc.agencies + 1,
    clients: acc.clients + r.client_count,
    members: acc.members + r.member_count,
    mrr: acc.mrr + (r.suspended ? 0 : r.price_eur),
  }), { agencies: 0, clients: 0, members: 0, mrr: 0 });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="SaaS admin" subtitle="All agencies on the platform" />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Agencies" value={totals.agencies} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Total clients" value={totals.clients} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Team seats" value={totals.members} />
        <Kpi icon={<CreditCard className="h-4 w-4" />} label="Estimated MRR" value={`€${totals.mrr}`} />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows === null ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No agencies yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3">Agency</th>
                    <th className="text-left p-3">Plan</th>
                    <th className="text-right p-3">Clients</th>
                    <th className="text-right p-3">Seats</th>
                    <th className="text-right p-3">€/mo</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3"><Badge variant="secondary" className="uppercase text-[10px]">{a.plan}</Badge></td>
                      <td className="p-3 text-right font-mono">{a.client_count}</td>
                      <td className="p-3 text-right font-mono">{a.member_count}</td>
                      <td className="p-3 text-right font-mono">{a.price_eur}</td>
                      <td className="p-3">
                        {a.suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15">Active</Badge>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant={a.suspended ? "default" : "outline"} disabled={busy === a.id} onClick={() => toggleSuspend(a)}>
                          {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : a.suspended ? "Reactivate" : "Suspend"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon} {label}</div>
      <div className="text-3xl font-bold font-mono mt-1">{value}</div>
    </CardContent></Card>
  );
}
