import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type P = { id: string; key: string; version: number; content: string; model: string | null; temperature: number | null; is_active: boolean; agency_id: string | null; created_at: string };

export default function AiPrompts() {
  const { profile } = useUser();
  const [items, setItems] = useState<P[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ key: "", content: "", model: "", temperature: "0.4" });

  async function load() {
    const { data } = await supabase.from("ai_prompts").select("*").order("key").order("version", { ascending: false });
    setItems((data || []) as P[]);
  }
  useEffect(() => { load(); }, []);

  async function toggle(p: P) {
    // deactivate previous active versions for the same key
    if (!p.is_active) {
      await supabase.from("ai_prompts").update({ is_active: false }).eq("key", p.key).is("agency_id", null);
    }
    const { error } = await supabase.from("ai_prompts").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function createNewVersion() {
    if (!form.key || !form.content) return;
    const { data: latest } = await supabase.from("ai_prompts").select("version").eq("key", form.key).is("agency_id", null).order("version", { ascending: false }).limit(1).maybeSingle();
    const next = (latest?.version || 0) + 1;
    const { error } = await supabase.from("ai_prompts").insert({
      key: form.key, version: next, content: form.content,
      model: form.model || null, temperature: parseFloat(form.temperature) || 0.4,
      is_active: false, agency_id: null,
    });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ key: "", content: "", model: "", temperature: "0.4" });
    load();
  }

  if (!profile?.is_saas_admin) return <div className="p-6 text-sm">Admin only.</div>;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="AI Prompts" subtitle="Versioned system prompts. Activate one version per key at a time." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New version</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New prompt version</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="key (e.g. agency_assistant)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
              <Textarea rows={10} placeholder="System prompt content…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="model override (optional)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                <Input placeholder="temperature" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={createNewVersion}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />
      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{p.key} <span className="text-muted-foreground">v{p.version}</span> {p.agency_id ? "" : "· global"}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{p.is_active ? "active" : "inactive"}</span>
                <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded max-h-48 overflow-auto">{p.content}</pre>
              <div className="text-[10px] text-muted-foreground mt-1">model: {p.model || "default"} · temp: {p.temperature ?? "—"}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
