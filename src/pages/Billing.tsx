import { useEffect, useState } from "react";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, CreditCard, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

export default function Billing() {
  const { currentAgency, plan, subscription, refresh } = useAgency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [counts, setCounts] = useState({ clients: 0, members: 0 });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("plans").select("*").order("price_eur");
      setPlans(data || []);
    })();
  }, []);

  useEffect(() => {
    if (!currentAgency) return;
    (async () => {
      const [c, m] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("agency_id", currentAgency.id),
        supabase.from("agency_members").select("id", { count: "exact", head: true }).eq("agency_id", currentAgency.id),
      ]);
      setCounts({ clients: c.count || 0, members: m.count || 0 });
    })();
  }, [currentAgency]);

  const switchPlan = async (tier: any) => {
    if (!currentAgency) return;
    setBusy(tier);
    // Phase 1: switch plan in DB. Stripe checkout edge function will be wired in Phase 2.
    const { error: e1 } = await supabase.from("agencies").update({ plan: tier }).eq("id", currentAgency.id);
    const { error: e2 } = await supabase.from("subscriptions").update({ plan: tier }).eq("agency_id", currentAgency.id);
    setBusy(null);
    if (e1 || e2) toast.error((e1 || e2)?.message || "Failed");
    else { toast.success("Plan updated"); refresh(); }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-6xl">
      <PageHeader title="Billing & Plan" subtitle="Manage your subscription and usage." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-accent" /> Current plan</div>
          <div className="text-2xl font-bold mt-1">{plan?.name || "—"}</div>
          <div className="text-sm text-muted-foreground mt-1">€{plan?.price_eur || 0}/month · <Badge variant="outline" className="ml-1">{subscription?.status || "—"}</Badge></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Clients</div>
          <div className="text-2xl font-bold mt-1 metric-number">{counts.clients}{plan?.max_clients ? ` / ${plan.max_clients}` : ""}</div>
          <div className="text-sm text-muted-foreground mt-1">{plan?.max_clients ? "On your plan" : "Unlimited"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Team seats</div>
          <div className="text-2xl font-bold mt-1 metric-number">{counts.members}{plan?.max_seats ? ` / ${plan.max_seats}` : ""}</div>
          <div className="text-sm text-muted-foreground mt-1">{plan?.max_seats ? "On your plan" : "Unlimited"}</div>
        </div>
      </div>

      <h2 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /> Change plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => {
          const isCurrent = p.tier === plan?.tier;
          return (
            <div key={p.tier} className={`rounded-xl border p-5 ${isCurrent ? "border-accent shadow-glow" : "border-border bg-card"}`}>
              <h3 className="font-semibold">{p.name}</h3>
              <div className="mt-2"><span className="text-3xl font-bold metric-number">€{p.price_eur}</span><span className="text-sm text-muted-foreground">/mo</span></div>
              <Button className="w-full mt-4" disabled={isCurrent || busy === p.tier} onClick={() => switchPlan(p.tier)} variant={isCurrent ? "outline" : "default"}>
                {isCurrent ? "Current plan" : busy === p.tier ? "Switching…" : "Switch to this plan"}
              </Button>
              <ul className="space-y-1.5 text-xs mt-4 text-muted-foreground">
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />{p.max_clients ? `${p.max_clients} clients` : "Unlimited clients"}</li>
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />{p.max_seats ? `${p.max_seats} team seats` : "Unlimited seats"}</li>
                {p.ai_reports && <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />AI monthly reports</li>}
                {p.client_portal && <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />Client portal</li>}
                {p.niche_dashboards && <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />Niche dashboards</li>}
                {p.ai_strategy_room && <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />AI Strategy Room</li>}
                {p.white_label && <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />White-label reports</li>}
                {p.custom_branding && <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />Custom branding & domain</li>}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Stripe checkout will activate after you provide your Stripe secret key. Plan changes above currently update your workspace immediately.
      </p>
    </div>
  );
}
