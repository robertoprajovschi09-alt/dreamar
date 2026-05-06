import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Home, Calendar, Phone, MessageSquare, Eye, TrendingUp, Sparkles,
  ShoppingCart, DollarSign, Star, Flame, Heart, Utensils, Scissors, Stethoscope,
  Dumbbell, Tag, FileEdit, ArrowRight, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { NicheCard, NicheDashboardConfig, CardSource } from "@/lib/nicheDashboardConfigs";

const ICONS: Record<string, any> = {
  users: Users, home: Home, calendar: Calendar, phone: Phone, message: MessageSquare,
  eye: Eye, trend: TrendingUp, sparkle: Sparkles, cart: ShoppingCart, dollar: DollarSign,
  star: Star, flame: Flame, heart: Heart, utensils: Utensils, scissors: Scissors,
  stethoscope: Stethoscope, dumbbell: Dumbbell, tag: Tag,
};

type Props = {
  niche: string;
  config: NicheDashboardConfig;
  agencyId: string;
  clientId: string;
  awaitingApproval: number;
  nextActions?: { label: string; why: string }[];
  missingData?: string[];
};

export function NicheDashboardSection({
  niche, config, agencyId, clientId, awaitingApproval, nextActions = [], missingData = [],
}: Props) {
  const [impact, setImpact] = useState<any[]>([]);
  const [an, setAn] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [checkin, setCheckin] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

      const [imp, ana, p, ca, ck] = await Promise.all([
        supabase.from("business_impact_entries").select("*").eq("client_id", clientId).gte("entry_date", since30),
        supabase.from("analytics_entries").select("*").eq("client_id", clientId).gte("date_start", since30),
        supabase.from("content_posts")
          .select("id,title,hook,thumbnail_url,scheduled_for,platform")
          .eq("client_id", clientId).eq("status", "published")
          .gte("scheduled_for", monthStart.toISOString())
          .order("scheduled_for", { ascending: false }).limit(3),
        supabase.from("campaigns").select("id,name,status,start_date,end_date,objective")
          .eq("client_id", clientId).order("start_date", { ascending: false }).limit(3),
        supabase.from("client_checkins").select("real_results_data,promoted_focus,important_notes")
          .eq("client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      setImpact((imp.data as any[]) || []);
      setAn((ana.data as any[]) || []);
      setPosts((p.data as any[]) || []);
      setCampaigns((ca.data as any[]) || []);
      const data = ((ck.data as any)?.real_results_data?.[niche]) || {};
      setCheckin({ ...data, _promoted_focus: (ck.data as any)?.promoted_focus, _important: (ck.data as any)?.important_notes });
      setLoading(false);
    })();
  }, [clientId, niche]);

  const sum = (rows: any[], key: string) => rows.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);

  const resolveSource = (src: CardSource): { value: any; missing: boolean } => {
    if (src.kind === "constant") return { value: src.value, missing: false };
    if (src.kind === "impact_sum") {
      const v = sum(impact, src.field);
      return { value: v, missing: v === 0 };
    }
    if (src.kind === "analytics_sum") {
      const v = sum(an, src.field);
      return { value: v, missing: v === 0 };
    }
    if (src.kind === "analytics_latest") {
      const row = an[0];
      const v = row?.[src.field];
      return { value: v, missing: v == null };
    }
    if (src.kind === "checkin") {
      let cur: any = checkin;
      for (const p of src.path) cur = cur?.[p];
      return { value: cur, missing: cur == null || cur === "" };
    }
    if (src.kind === "ratio") {
      const n = resolveSource(src.numerator);
      const d = resolveSource(src.denominator);
      if (n.missing || d.missing || !d.value) return { value: null, missing: true };
      const v = Number(n.value) / Number(d.value);
      if (!Number.isFinite(v)) return { value: null, missing: true };
      return { value: v, missing: false };
    }
    return { value: null, missing: true };
  };

  const fmt = (v: any, format?: string): string => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (format === "currency") return Number.isFinite(n) ? `${Math.round(n).toLocaleString()} RON` : String(v);
    if (format === "percent") return Number.isFinite(n) ? `${(n <= 1 ? n * 100 : n).toFixed(1)}%` : String(v);
    if (Number.isFinite(n)) return n.toLocaleString();
    return String(v);
  };

  const renderKpi = (card: NicheCard) => {
    const Icon = ICONS[card.icon] || Sparkles;
    const { value, missing } = card.source ? resolveSource(card.source) : { value: null, missing: true };
    return (
      <Card key={card.key}>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <Icon className="h-4 w-4" /> <span>{card.label}</span>
          </div>
          <div className="text-xl font-semibold font-mono mt-1">{fmt(value, card.format)}</div>
          {missing && card.hint && <div className="text-[10px] text-muted-foreground mt-0.5">{card.hint}</div>}
        </CardContent>
      </Card>
    );
  };

  const renderListCard = (card: NicheCard) => {
    const Icon = ICONS[card.icon] || Sparkles;
    let body: React.ReactNode = null;

    if (card.list === "top_published_posts") {
      body = posts.length === 0
        ? <Empty text="Nu există conținut publicat luna aceasta." />
        : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-2 rounded-md border border-border">
                {p.thumbnail_url
                  ? <img src={p.thumbnail_url} className="h-10 w-10 rounded object-cover" alt="" />
                  : <div className="h-10 w-10 rounded bg-muted" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  {p.hook && <div className="text-xs text-muted-foreground truncate">Hook: {p.hook}</div>}
                </div>
                {p.platform && <Badge variant="outline" className="text-[10px] capitalize">{p.platform}</Badge>}
              </div>
            ))}
          </div>
        );
    } else if (card.list === "campaigns_offers") {
      body = campaigns.length === 0
        ? <Empty text="Nicio campanie activă." />
        : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded-md border border-border">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  {c.objective && <div className="text-xs text-muted-foreground truncate">{c.objective}</div>}
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
              </div>
            ))}
          </div>
        );
    } else if (card.list === "checkin_text") {
      let cur: any = checkin;
      for (const p of card.list_path || []) cur = cur?.[p];
      const txt = typeof cur === "string" ? cur.trim() : "";
      body = txt
        ? <p className="text-sm whitespace-pre-wrap">{txt}</p>
        : <Empty text="Lipsă date — completează în check-in." />;
    } else if (card.list === "next_actions") {
      body = nextActions.length === 0
        ? <Empty text="Nu există recomandări încă." />
        : (
          <div className="space-y-2">
            {nextActions.slice(0, 4).map((a, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{a.label}</div>
                {a.why && <div className="text-xs text-muted-foreground">{a.why}</div>}
              </div>
            ))}
          </div>
        );
    } else if (card.list === "approvals") {
      body = (
        <div className="flex items-center gap-3">
          <FileEdit className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              {awaitingApproval > 0
                ? `${awaitingApproval} ${awaitingApproval === 1 ? "postare așteaptă" : "postări așteaptă"} aprobarea ta`
                : "Nimic de aprobat"}
            </div>
          </div>
          {awaitingApproval > 0 && <Badge variant="outline" className="font-mono">{awaitingApproval}</Badge>}
        </div>
      );
    }

    return (
      <Card key={card.key} className={card.list === "approvals" && awaitingApproval > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {card.list !== "approvals" && <Icon className="h-4 w-4 text-accent" />}
            {card.label}
          </CardTitle>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    );
  };

  if (loading) return <div className="text-xs text-muted-foreground">Se încarcă…</div>;

  const kpiCards = config.cards.filter((c) => !c.list);
  const listCards = config.cards.filter((c) => c.list);

  return (
    <div className="space-y-4">
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map(renderKpi)}
        </div>
      )}

      {listCards.map(renderListCard)}

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

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-muted-foreground">{text}</div>;
}
