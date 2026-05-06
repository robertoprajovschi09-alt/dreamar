import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type R = { id: string; rule_key: string; description: string | null; pattern: string; action: string; enabled: boolean; agency_id: string | null };

export default function AiSafety() {
  const { profile } = useUser();
  const [rules, setRules] = useState<R[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rule_key: "", description: "", pattern: "", action: "warn" });

  async function load() {
    const { data } = await supabase.from("ai_safety_rules").select("*").order("created_at", { ascending: false });
    setRules((data || []) as R[]);
  }
  useEffect(() => { load(); }, []);

  async function toggle(r: R) {
    const { error } = await supabase.from("ai_safety_rules").update({ enabled: !r.enabled }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function create() {
    if (!form.rule_key || !form.pattern) return;
    const { error } = await supabase.from("ai_safety_rules").insert({ ...form });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ rule_key: "", description: "", pattern: "", action: "warn" });
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("ai_safety_rules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  if (!profile?.is_saas_admin) return <div className="p-6 text-sm">Admin only.</div>;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="AI Safety Guardrails" subtitle="Regex rules applied to every AI input and output." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New safety rule</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="rule_key" value={form.rule_key} onChange={(e) => setForm({ ...form, rule_key: e.target.value })} />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Regex pattern" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} />
              <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Warn (log only)</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="require_approval">Require approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid md:grid-cols-2 gap-3">
        {rules.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{r.rule_key} <span className="text-xs text-muted-foreground">· {r.action}</span></CardTitle>
              <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} />
            </CardHeader>
            <CardContent>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">{r.pattern}</pre>
              <Button size="sm" variant="ghost" className="mt-2 text-destructive" onClick={() => del(r.id)}>Delete</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
