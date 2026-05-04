import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { Plus, TrendingUp } from "lucide-react";
import { fmtNum, fmtEur, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

const FIELDS = [
  ["entry_date","Date","date"],["calls","Calls","number"],["dms","Relevant DMs","number"],
  ["bookings","Bookings","number"],["appointments","Appointments","number"],["orders","Orders","number"],
  ["sales","Sales","number"],["viewings","Viewings","number"],["contracts","Contracts","number"],
  ["revenue_estimate","Revenue estimate (€)","number"],
  ["qualitative_feedback","Qualitative feedback","textarea"],["objections","Objections heard","textarea"],
] as const;

export function ClientImpact({ client }: { client: Client }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ entry_date: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("business_impact_entries").select("*").eq("client_id", client.id).order("entry_date", { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  const save = async () => {
    const payload: any = { agency_id: client.agency_id, client_id: client.id, created_by: user?.id };
    FIELDS.forEach(([key, , type]) => {
      const v = form[key];
      if (v !== undefined && v !== "") payload[key] = type === "number" ? Number(v) : v;
    });
    const { error } = await supabase.from("business_impact_entries").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Entry added"); setOpen(false); setForm({ entry_date: new Date().toISOString().slice(0, 10) }); load();
  };

  const totals = rows.reduce((t, r) => ({
    calls: t.calls + (r.calls || 0), dms: t.dms + (r.dms || 0),
    appointments: t.appointments + (r.appointments || 0),
    revenue: t.revenue + Number(r.revenue_estimate || 0),
  }), { calls: 0, dms: 0, appointments: 0, revenue: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Business Impact</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" /> Log impact</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Log business impact</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FIELDS.map(([key, label, type]) => (
                <div key={key} className={type === "textarea" ? "col-span-2 md:col-span-3 space-y-1.5" : "space-y-1.5"}>
                  <Label className="text-xs">{label}</Label>
                  {type === "textarea"
                    ? <Textarea rows={2} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    : <Input type={type || "text"} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}
                </div>
              ))}
            </div>
            <DialogFooter><Button onClick={save} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Total Calls" value={fmtNum(totals.calls)} accent />
          <MetricCard label="Total DMs" value={fmtNum(totals.dms)} />
          <MetricCard label="Appointments" value={fmtNum(totals.appointments)} />
          <MetricCard label="Revenue Tracked" value={fmtEur(totals.revenue)} />
        </div>
      )}

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : rows.length === 0 ? <EmptyState icon={TrendingUp} title="No impact logged" description="Log calls, DMs, bookings and revenue to track real business outcomes." />
        : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-right px-3 py-2">Calls</th>
                  <th className="text-right px-3 py-2">DMs</th>
                  <th className="text-right px-3 py-2">Appts</th>
                  <th className="text-right px-3 py-2">Sales</th>
                  <th className="text-right px-3 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-1">
                    <td className="px-3 py-2">{fmtDate(r.entry_date)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(r.calls)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(r.dms)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(r.appointments)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(r.sales)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtEur(r.revenue_estimate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
