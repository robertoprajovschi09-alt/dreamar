import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Field = { key: string; label: string; field_type?: string; type?: string };

const STANDARD_FIELDS = ["calls", "dms", "bookings", "sales", "appointments", "viewings", "contracts", "orders", "revenue_estimate"];

export function BusinessImpactQuickForm({
  agencyId, clientId, userId, fields,
}: { agencyId: string; clientId: string; userId: string; fields: Field[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});

  const visibleFields: Field[] = (fields && fields.length)
    ? fields
    : [
        { key: "calls", label: "Calls received", field_type: "number" },
        { key: "dms", label: "DMs received", field_type: "number" },
        { key: "bookings", label: "Bookings", field_type: "number" },
        { key: "sales", label: "Sales", field_type: "number" },
      ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("business_impact_entries")
        .select("*").eq("client_id", clientId).eq("entry_date", today)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setEntryId((data as any).id);
        const init: Record<string, any> = {};
        visibleFields.forEach((f) => { init[f.key] = (data as any)[f.key] ?? ""; });
        init["qualitative_feedback"] = (data as any).qualitative_feedback ?? "";
        setValues(init);
      } else {
        const init: Record<string, any> = {};
        visibleFields.forEach((f) => { init[f.key] = ""; });
        init["qualitative_feedback"] = "";
        setValues(init);
      }
      setLoading(false);
    })();
  }, [clientId, today]);

  const update = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  const fieldType = (f: Field) => f.field_type || f.type || "number";

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        agency_id: agencyId, client_id: clientId, created_by: userId, entry_date: today,
        qualitative_feedback: values.qualitative_feedback || null,
      };
      visibleFields.forEach((f) => {
        if (!STANDARD_FIELDS.includes(f.key)) return; // only persist columns that exist on the table
        const v = values[f.key];
        const ft = fieldType(f);
        if (v === "" || v === null || v === undefined) { payload[f.key] = null; return; }
        if (ft === "boolean") payload[f.key] = !!v;
        else if (ft === "currency" || f.key === "revenue_estimate") payload[f.key] = Number(v);
        else payload[f.key] = Number(v);
      });
      if (entryId) {
        const { error } = await supabase.from("business_impact_entries").update(payload).eq("id", entryId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("business_impact_entries").insert(payload).select("id").single();
        if (error) throw error;
        setEntryId((data as any).id);
      }
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today's business impact</CardTitle>
        <p className="text-xs text-muted-foreground">Quick numbers help your agency see what's actually working in real life.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visibleFields.map((f) => {
                const ft = fieldType(f);
                return (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                    {ft === "boolean" ? (
                      <Switch checked={!!values[f.key]} onCheckedChange={(v) => update(f.key, v)} />
                    ) : (
                      <Input
                        type={ft === "text" ? "text" : "number"}
                        value={values[f.key] ?? ""}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder="—"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 space-y-1">
              <Label className="text-[11px] text-muted-foreground">Anything qualitative? (optional)</Label>
              <Textarea rows={2} value={values.qualitative_feedback || ""} onChange={(e) => update("qualitative_feedback", e.target.value)} placeholder="People mentioned the IG reel, calls picked up after Tuesday post…" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={save} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Salvează</>}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
