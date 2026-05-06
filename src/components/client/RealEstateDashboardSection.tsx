import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home, Phone, MessageSquare, Eye, Users, Calendar,
  TrendingUp, FileEdit, ArrowRight, Sparkles, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  agencyId: string;
  clientId: string;
  awaitingApproval: number;
  insights?: { title: string; body: string; severity: "info" | "good" | "warning" }[];
  nextActions?: { label: string; why: string }[];
  missingData?: string[];
};

type Counts = {
  buyer_leads: number;
  seller_leads: number;
  property_inquiries: number;
  viewings: number;
  calls: number;
  messages: number;
  promoted_properties: number;
  reserved_or_sold: number;
  cost_per_lead: number | null;
};

export function RealEstateDashboardSection({
  agencyId, clientId, awaitingApproval, insights = [], nextActions = [], missingData = [],
}: Props) {
  const [c, setC] = useState<Counts>({
    buyer_leads: 0, seller_leads: 0, property_inquiries: 0, viewings: 0,
    calls: 0, messages: 0, promoted_properties: 0, reserved_or_sold: 0, cost_per_lead: null,
  });
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [imp, an, posts, ckin] = await Promise.all([
        supabase.from("business_impact_entries").select("*").eq("client_id", clientId).gte("entry_date", since30),
        supabase.from("analytics_entries").select("*").eq("client_id", clientId).gte("date_start", since30),
        supabase.from("content_posts")
          .select("id,title,hook,thumbnail_url,scheduled_for,status,platform")
          .eq("client_id", clientId)
          .eq("status", "published")
          .gte("scheduled_for", monthStart.toISOString())
          .order("scheduled_for", { ascending: false })
          .limit(3),
        supabase.from("client_checkins")
          .select("real_results_data")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const impactRows: any[] = (imp.data as any[]) || [];
      const anRows: any[] = (an.data as any[]) || [];
      const checkinExtra: any =
        ((ckin.data as any)?.real_results_data?.real_estate) || {};

      const sum = (rows: any[], key: string) =>
        rows.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);

      const adSpend = sum(anRows, "ad_spend");
      const totalLeads = sum(anRows, "leads") + sum(impactRows, "leads" as any);

      setC({
        buyer_leads: Number(checkinExtra.buyer_leads) || 0,
        seller_leads: Number(checkinExtra.seller_leads) || 0,
        property_inquiries:
          (Number(checkinExtra.property_inquiries) || 0) + sum(impactRows, "viewings"),
        viewings:
          (Number(checkinExtra.viewings) || 0) + sum(impactRows, "viewings"),
        calls: sum(impactRows, "calls"),
        messages: sum(impactRows, "dms"),
        promoted_properties: Number(checkinExtra.promoted_properties) || 0,
        reserved_or_sold: sum(impactRows, "contracts") + (Number(checkinExtra.reserved_or_sold) || 0),
        cost_per_lead: adSpend > 0 && totalLeads > 0 ? Math.round(adSpend / totalLeads) : null,
      });
      setTopPosts((posts.data as any[]) || []);
      setLoading(false);
    })();
  }, [clientId]);

  const buyerVsSeller = (() => {
    const total = c.buyer_leads + c.seller_leads;
    if (!total) return null;
    return {
      buyerPct: Math.round((c.buyer_leads / total) * 100),
      sellerPct: Math.round((c.seller_leads / total) * 100),
    };
  })();

  return (
    <div className="space-y-4">
      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Lead-uri generate" value={c.buyer_leads + c.seller_leads} hint="Cumpărători + vânzători" />
        <KpiCard icon={<Home className="h-4 w-4" />} label="Cereri proprietăți" value={c.property_inquiries} />
        <KpiCard icon={<Calendar className="h-4 w-4" />} label="Vizionări programate" value={c.viewings} />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Cost / lead"
          value={c.cost_per_lead != null ? `${c.cost_per_lead} RON` : "—"}
          hint={c.cost_per_lead == null ? "Lipsă date ad spend" : undefined}
        />
      </div>

      {/* Secondary impact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Phone className="h-4 w-4" />} label="Apeluri" value={c.calls} />
        <KpiCard icon={<MessageSquare className="h-4 w-4" />} label="Mesaje" value={c.messages} />
        <KpiCard icon={<Eye className="h-4 w-4" />} label="Proprietăți promovate" value={c.promoted_properties} />
        <KpiCard icon={<Sparkles className="h-4 w-4" />} label="Rezervate / vândute" value={c.reserved_or_sold} hint="Dacă ai completat" />
      </div>

      {/* Buyer vs Seller interest */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Interes cumpărători vs. vânzători</CardTitle>
        </CardHeader>
        <CardContent>
          {buyerVsSeller ? (
            <div className="space-y-2">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="bg-accent" style={{ width: `${buyerVsSeller.buyerPct}%` }} />
                <div className="bg-emerald-500" style={{ width: `${buyerVsSeller.sellerPct}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent mr-1.5 align-middle" />
                  Cumpărători {c.buyer_leads} ({buyerVsSeller.buyerPct}%)
                </span>
                <span className="text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                  Vânzători {c.seller_leads} ({buyerVsSeller.sellerPct}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Lipsă date — completează lead-urile cumpărători/vânzători în check-in.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top performing property content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> Top conținut despre proprietăți
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-xs text-muted-foreground">Se încarcă…</div>
          ) : topPosts.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nu există conținut publicat luna aceasta.</div>
          ) : (
            <div className="space-y-2">
              {topPosts.map((p) => (
                <div key={p.id} className="flex items-start gap-3 p-2 rounded-md border border-border">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} className="h-10 w-10 rounded object-cover" alt="" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Home className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    {p.hook && <div className="text-xs text-muted-foreground truncate">Hook: {p.hook}</div>}
                  </div>
                  {p.platform && <Badge variant="outline" className="text-[10px] capitalize">{p.platform}</Badge>}
                </div>
              ))}
              <div className="text-[11px] text-muted-foreground">
                Listate cele mai recente. Performanța per-post se actualizează când agenția adaugă analytics.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content waiting approval */}
      <Card className={awaitingApproval > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
        <CardContent className="p-4 flex items-center gap-3">
          <FileEdit className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              {awaitingApproval > 0 ? `${awaitingApproval} ${awaitingApproval === 1 ? "postare așteaptă" : "postări așteaptă"} aprobarea ta` : "Nimic de aprobat"}
            </div>
            <div className="text-xs text-muted-foreground">Aprobarea rapidă ne ajută să publicăm la timp pentru audiența imobiliară.</div>
          </div>
          {awaitingApproval > 0 && <Badge variant="outline" className="font-mono">{awaitingApproval}</Badge>}
        </CardContent>
      </Card>

      {/* Next recommended actions */}
      {nextActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-accent" /> Următoarele acțiuni recomandate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextActions.slice(0, 4).map((a, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{a.label}</div>
                {a.why && <div className="text-xs text-muted-foreground">{a.why}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missing data hint */}
      {missingData.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Date lipsă pentru o analiză completă:</div>
              <div className="flex flex-wrap gap-1">
                {missingData.map((m) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          {icon} <span>{label}</span>
        </div>
        <div className="text-xl font-semibold font-mono mt-1">{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
