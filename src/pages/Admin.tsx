import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CreditCard } from "lucide-react";
import { fmtEur, fmtDate, fmtNum } from "@/lib/format";

export default function Admin() {
  const { profile, loading } = useAuth();
  const [agencies, setAgencies] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, mrr: 0, active: 0 });
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!profile?.is_saas_admin) return;
    (async () => {
      const { data: ags } = await supabase.from("agencies").select("*, subscription:subscriptions(*), members:agency_members(count), clients:clients(count)").order("created_at", { ascending: false });
      const list = ags || [];
      const planPrices: Record<string, number> = { starter: 99, growth: 150, unlimited: 249, white_label: 399 };
      const mrr = list.filter((a: any) => a.subscription?.[0]?.status === "active" || a.subscription?.[0]?.status === "trialing")
        .reduce((s: number, a: any) => s + (planPrices[a.plan] || 0), 0);
      setAgencies(list);
      setStats({ total: list.length, mrr, active: list.filter((a: any) => !a.suspended).length });
      setBusy(false);
    })();
  }, [profile]);

  if (loading) return null;
  if (!profile?.is_saas_admin) return <Navigate to="/app" replace />;

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <PageHeader title="SaaS Admin" subtitle="Global view of all agencies on AgencyOS." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MetricCard label="Total Agencies" value={fmtNum(stats.total)} icon={Building2} accent />
        <MetricCard label="Active" value={fmtNum(stats.active)} icon={Users} />
        <MetricCard label="Estimated MRR" value={fmtEur(stats.mrr)} icon={CreditCard} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-3 py-2">Agency</th><th className="text-left px-3 py-2">Plan</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Members</th><th className="text-right px-3 py-2">Clients</th><th className="text-left px-3 py-2">Created</th></tr>
          </thead>
          <tbody>
            {busy ? <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              : agencies.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No agencies yet.</td></tr>
              : agencies.map((a: any) => (
                <tr key={a.id} className="border-t border-border hover:bg-surface-1">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2"><Badge variant="outline">{a.plan}</Badge></td>
                  <td className="px-3 py-2"><Badge variant={a.suspended ? "destructive" : "secondary"}>{a.suspended ? "suspended" : a.subscription?.[0]?.status || "—"}</Badge></td>
                  <td className="px-3 py-2 text-right">{a.members?.[0]?.count || 0}</td>
                  <td className="px-3 py-2 text-right">{a.clients?.[0]?.count || 0}</td>
                  <td className="px-3 py-2">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
