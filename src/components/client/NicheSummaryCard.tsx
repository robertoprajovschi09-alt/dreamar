import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Stat = { label: string; value: string | number };

const NICHE_CFG: Record<string, {
  table: string;
  cols: string;
  title: string;
  build: (rows: any[]) => Stat[];
}> = {
  real_estate: {
    table: "niche_real_estate_properties",
    cols: "title,views,messages,viewings_booked,offers_received,sold",
    title: "Real estate snapshot",
    build: (r) => [
      { label: "Properties", value: r.length },
      { label: "Total views", value: r.reduce((a, x) => a + (x.views || 0), 0) },
      { label: "Viewings booked", value: r.reduce((a, x) => a + (x.viewings_booked || 0), 0) },
      { label: "Offers received", value: r.reduce((a, x) => a + (x.offers_received || 0), 0) },
      { label: "Sold", value: r.filter((x) => x.sold).length },
    ],
  },
  restaurant: {
    table: "niche_restaurant_items",
    cols: "name,reservations,orders,foot_traffic,events,buying_intent_comments,estimated_sales_impact",
    title: "Restaurant snapshot",
    build: (r) => [
      { label: "Tracked items", value: r.length },
      { label: "Reservations", value: r.reduce((a, x) => a + (x.reservations || 0), 0) },
      { label: "Orders", value: r.reduce((a, x) => a + (x.orders || 0), 0) },
      { label: "Walk-in traffic", value: r.reduce((a, x) => a + (x.foot_traffic || 0), 0) },
      { label: "Est. sales impact", value: "€" + r.reduce((a, x) => a + Number(x.estimated_sales_impact || 0), 0).toFixed(0) },
    ],
  },
  dental: {
    table: "niche_dental_treatments",
    cols: "treatment,treatment_interest,qualified_leads,appointments_booked,patients_arrived",
    title: "Dental clinic snapshot",
    build: (r) => [
      { label: "Treatments tracked", value: r.length },
      { label: "Interest signals", value: r.reduce((a, x) => a + (x.treatment_interest || 0), 0) },
      { label: "Qualified leads", value: r.reduce((a, x) => a + (x.qualified_leads || 0), 0) },
      { label: "Appointments booked", value: r.reduce((a, x) => a + (x.appointments_booked || 0), 0) },
      { label: "Patients arrived", value: r.reduce((a, x) => a + (x.patients_arrived || 0), 0) },
    ],
  },
  fitness: {
    table: "niche_fitness_offerings",
    cols: "name,memberships_sold,trial_sessions,classes_promoted,messages_received,new_members_influenced",
    title: "Fitness snapshot",
    build: (r) => [
      { label: "Offerings", value: r.length },
      { label: "Memberships sold", value: r.reduce((a, x) => a + (x.memberships_sold || 0), 0) },
      { label: "Trial sessions", value: r.reduce((a, x) => a + (x.trial_sessions || 0), 0) },
      { label: "Messages", value: r.reduce((a, x) => a + (x.messages_received || 0), 0) },
      { label: "New members influenced", value: r.reduce((a, x) => a + (x.new_members_influenced || 0), 0) },
    ],
  },
  custom: {
    table: "niche_custom_metrics",
    cols: "label,value,unit",
    title: "Custom KPIs",
    build: (r) => r.slice(0, 6).map((x) => ({ label: x.label, value: `${x.value ?? "—"}${x.unit ? " " + x.unit : ""}` })),
  },
};

export function NicheSummaryCard({ clientId, niche }: { clientId: string; niche: string }) {
  const cfg = NICHE_CFG[niche];
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    if (!cfg) { setRows([]); return; }
    setRows(null);
    supabase.from(cfg.table as any).select(cfg.cols).eq("client_id", clientId)
      .then(({ data }) => setRows((data as any[]) || []));
  }, [clientId, niche]);

  if (!cfg) return null;
  if (rows === null) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></CardContent></Card>;

  const stats = cfg.build(rows);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{cfg.title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Agenția ta nu a înregistrat încă date.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold font-mono mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
