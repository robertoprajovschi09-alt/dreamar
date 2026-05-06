import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Memory = { id: string; title: string; content: string; scope: string; kind: string; client_id: string | null; created_at: string };

export default function AiMemory() {
  const { agency } = useUser();
  const [items, setItems] = useState<Memory[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", scope: "agency", kind: "fact", client_id: "" });

  async function load() {
    if (!agency) return;
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from("ai_memory").select("*").eq("agency_id", agency.id).order("updated_at", { ascending: false }),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
    ]);
    setItems((data || []) as Memory[]);
    setClients(c || []);
  }
  useEffect(() => { load(); }, [agency]);

  async function save() {
    if (!agency || !form.title || !form.content) return;
    const { data, error } = await supabase.from("ai_memory").insert({
      agency_id: agency.id, title: form.title, content: form.content, scope: form.scope, kind: form.kind,
      client_id: form.scope === "client" && form.client_id ? form.client_id : null,
    }).select("id").single();
    if (error) return toast.error(error.message);
    // fire-and-forget embedding
    supabase.functions.invoke("ai-core-embed", { body: { memory_id: data.id } });
    setOpen(false);
    setForm({ title: "", content: "", scope: "agency", kind: "fact", client_id: "" });
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this memory?")) return;
    const { error } = await supabase.from("ai_memory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="AI Memory" subtitle="Long-term facts, preferences and playbooks the AI assistant uses for grounding." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add memory</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New memory</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Content (fact, preference, playbook…)" rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fact">Fact</SelectItem>
                    <SelectItem value="preference">Preference</SelectItem>
                    <SelectItem value="playbook">Playbook</SelectItem>
                    <SelectItem value="doc_chunk">Doc chunk</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency">Whole agency</SelectItem>
                    <SelectItem value="client">Specific client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.scope === "client" && (
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />
      {items.length === 0 && <div className="text-sm text-muted-foreground">No memories yet. Add facts the AI should always know.</div>}
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-accent" />{m.title}</CardTitle>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{m.content}
              <div className="text-[10px] text-muted-foreground mt-2 uppercase">{m.kind} · {m.scope}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
