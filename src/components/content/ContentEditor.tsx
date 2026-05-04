import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { POST_STATUSES, PLATFORM_OPTIONS, CONTENT_TYPES } from "@/lib/content";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId?: string | null;
  defaultClientId?: string | null;
  defaultDate?: string | null; // ISO yyyy-mm-dd
  onSaved: () => void;
};

const empty = (clientId: string | null, date: string | null) => ({
  client_id: clientId || "",
  title: "",
  platform: "instagram",
  content_type: "Reel",
  status: "idea",
  scheduled_for: date ? `${date}T10:00` : "",
  hook: "",
  script: "",
  caption: "",
  cta: "",
  thumbnail_url: "",
  post_url: "",
  agency_notes: "",
});

export function ContentEditor({ open, onOpenChange, postId, defaultClientId, defaultDate, onSaved }: Props) {
  const { agency } = useUser();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState(empty(defaultClientId || null, defaultDate || null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !agency) return;
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name")
      .then(({ data }) => setClients(data || []));
  }, [open, agency]);

  useEffect(() => {
    if (!open) return;
    if (postId) {
      setLoading(true);
      supabase.from("content_posts").select("*").eq("id", postId).maybeSingle().then(({ data }) => {
        if (data) {
          setForm({
            client_id: data.client_id,
            title: data.title || "",
            platform: data.platform || "instagram",
            content_type: data.content_type || "Reel",
            status: data.status || "idea",
            scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString().slice(0, 16) : "",
            hook: data.hook || "",
            script: data.script || "",
            caption: data.caption || "",
            cta: data.cta || "",
            thumbnail_url: data.thumbnail_url || "",
            post_url: data.post_url || "",
            agency_notes: data.agency_notes || "",
          });
        }
        setLoading(false);
      });
    } else {
      setForm(empty(defaultClientId || null, defaultDate || null));
    }
  }, [open, postId, defaultClientId, defaultDate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency || !form.client_id || !form.title.trim()) {
      toast.error("Client and title are required"); return;
    }
    setSaving(true);
    const payload: any = {
      agency_id: agency.id,
      client_id: form.client_id,
      title: form.title.trim(),
      platform: form.platform,
      content_type: form.content_type,
      status: form.status,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      hook: form.hook || null,
      script: form.script || null,
      caption: form.caption || null,
      cta: form.cta || null,
      thumbnail_url: form.thumbnail_url || null,
      post_url: form.post_url || null,
      agency_notes: form.agency_notes || null,
    };
    const { error } = postId
      ? await supabase.from("content_posts").update(payload).eq("id", postId)
      : await supabase.from("content_posts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(postId ? "Updated" : "Created");
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!postId || !confirm("Delete this content piece?")) return;
    const { error } = await supabase.from("content_posts").delete().eq("id", postId);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{postId ? "Edit content" : "New content"}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <form onSubmit={save} className="space-y-3 mt-4 pb-24">
            <Field label="Client *">
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Title *"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Platform">
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Type">
                <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Scheduled date/time"><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></Field>
            <Field label="Hook"><Textarea rows={2} value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} placeholder="The first 3 seconds..." /></Field>
            <Field label="Script"><Textarea rows={4} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} /></Field>
            <Field label="Caption"><Textarea rows={3} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></Field>
            <Field label="CTA"><Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thumbnail URL"><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://" /></Field>
              <Field label="Post URL"><Input value={form.post_url} onChange={(e) => setForm({ ...form, post_url: e.target.value })} placeholder="https://" /></Field>
            </div>
            <Field label="Internal notes"><Textarea rows={2} value={form.agency_notes} onChange={(e) => setForm({ ...form, agency_notes: e.target.value })} /></Field>

            <SheetFooter className="pt-2 flex-row justify-between gap-2">
              <div>
                {postId && (
                  <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
                </Button>
              </div>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
