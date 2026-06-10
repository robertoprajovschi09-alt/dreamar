import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Save, Trash2, Sparkles, ChevronDown, Film, Megaphone, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { POST_STATUSES, PLATFORM_OPTIONS, CONTENT_TYPES, type PostStatus } from "@/lib/content";
import { AssetUploader, type AssetItem } from "./AssetUploader";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId?: string | null;
  defaultClientId?: string | null;
  defaultDate?: string | null;
  defaultStatus?: PostStatus | null;
  onSaved: () => void;
};

type FormState = {
  client_id: string;
  title: string;
  platform: string;
  content_type: string;
  format: string;
  status: PostStatus;
  scheduled_for: string;
  deadline: string;
  hook: string;
  script: string;
  caption: string;
  cta: string;
  thumbnail_url: string;
  post_url: string;
  agency_notes: string;
  assigned_to: string;
  assets: AssetItem[];
};

const empty = (clientId: string | null, date: string | null, status: PostStatus | null): FormState => ({
  client_id: clientId || "",
  title: "",
  platform: "instagram",
  content_type: "Reel",
  format: "",
  status: status || "idea",
  scheduled_for: date ? `${date}T10:00` : "",
  deadline: "",
  hook: "",
  script: "",
  caption: "",
  cta: "",
  thumbnail_url: "",
  post_url: "",
  agency_notes: "",
  assigned_to: "",
  assets: [],
});

export function ContentEditor({ open, onOpenChange, postId, defaultClientId, defaultDate, defaultStatus, onSaved }: Props) {
  const { agency } = useUser();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [form, setForm] = useState<FormState>(empty(defaultClientId || null, defaultDate || null, defaultStatus || null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!open || !agency) return;
    (async () => {
      const [{ data: cls }, { data: mems }] = await Promise.all([
        supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
        supabase
          .from("agency_members")
          .select("user_id, profiles:user_id(full_name,email)")
          .eq("agency_id", agency.id),
      ]);
      setClients(cls || []);
      setMembers(
        (mems || []).map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name ?? null,
          email: m.profiles?.email ?? null,
        })),
      );
    })();
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
            format: data.format || "",
            status: (data.status as PostStatus) || "idea",
            scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString().slice(0, 16) : "",
            deadline: data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : "",
            hook: data.hook || "",
            script: data.script || "",
            caption: data.caption || "",
            cta: data.cta || "",
            thumbnail_url: data.thumbnail_url || "",
            post_url: data.post_url || "",
            agency_notes: data.agency_notes || "",
            assigned_to: data.assigned_to || "",
            assets: Array.isArray(data.assets) ? (data.assets as AssetItem[]) : [],
          });
        }
        setLoading(false);
      });
    } else {
      setForm(empty(defaultClientId || null, defaultDate || null, defaultStatus || null));
    }
  }, [open, postId, defaultClientId, defaultDate, defaultStatus]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    if (!form.client_id) { toast.error("Alege un client"); return; }
    if (!form.title.trim()) { toast.error("Dă-i un titlu de lucru"); return; }
    setSaving(true);
    const payload: any = {
      agency_id: agency.id,
      client_id: form.client_id,
      title: form.title.trim(),
      platform: form.platform,
      content_type: form.content_type,
      format: form.format || null,
      status: form.status,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      hook: form.hook || null,
      script: form.script || null,
      caption: form.caption || null,
      cta: form.cta || null,
      thumbnail_url: form.thumbnail_url || null,
      post_url: form.post_url || null,
      agency_notes: form.agency_notes || null,
      assigned_to: form.assigned_to || null,
      assets: form.assets,
    };
    const { error } = postId
      ? await supabase.from("content_posts").update(payload).eq("id", postId)
      : await supabase.from("content_posts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(postId ? "Salvat" : "Gata, l-am adăugat");
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!postId || !confirm("Ștergi această piesă de conținut?")) return;
    const { error } = await supabase.from("content_posts").delete().eq("id", postId);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="px-6 pt-6 pb-4 border-b border-border/60 sticky top-0 bg-background z-10">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              {postId ? "Editează conținut" : "Conținut nou"}
            </SheetTitle>
            <SheetDescription>
              Structurăm totul pe HOOK → BODY → CTA. Scurt, clar, util.
            </SheetDescription>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={save} className="px-6 py-5 space-y-6 pb-32">
            {/* CONTEXT */}
            <Section title="Context" subtitle="Cine, unde, ce.">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Pentru cine?">
                  <Select value={form.client_id} onValueChange={(v) => set("client_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Alege clientul" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Unde postăm?">
                  <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Ce fel de conținut?">
                  <Select value={form.content_type} onValueChange={(v) => set("content_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Format (opțional)" hint="ex: talking head, b-roll, montaj rapid">
                  <Input value={form.format} onChange={(e) => set("format", e.target.value)} placeholder="ex: talking head" />
                </Field>
              </div>
            </Section>

            {/* TITLE */}
            <Section title="Titlu de lucru" subtitle="Doar pentru voi, în echipă.">
              <Input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Cum îi spunem intern acestei piese?"
                className="h-12 text-base"
              />
            </Section>

            {/* HOOK / BODY / CTA */}
            <Section title="Mesajul" subtitle="Structura care funcționează de fiecare dată." icon={<Wand2 className="h-4 w-4 text-accent" />}>
              <div className="space-y-3">
                <Field label="Hook" hint="Primele 3 secunde. Ce-i oprește din scroll?">
                  <Textarea rows={2} value={form.hook} onChange={(e) => set("hook", e.target.value)} placeholder="Ce-i oprește din scroll? Scrie cârligul…" />
                </Field>
                <Field label="Body" hint="Mesajul principal. Simplu, concret, fără teorie.">
                  <Textarea rows={5} value={form.script} onChange={(e) => set("script", e.target.value)} placeholder="Explică simplu, fără teorie. Ce vrei să rămână cu ei?" />
                </Field>
                <Field label="CTA" hint="Ce fac mai departe?">
                  <Textarea rows={2} value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Spune-le exact ce să facă: sună, scrie, rezervă…" />
                </Field>

                <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                      Adaugă caption (textul de sub postare)
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <Field label="Caption" hint="Textul de sub postare, cu hashtag-uri dacă vrei.">
                      <Textarea rows={3} value={form.caption} onChange={(e) => set("caption", e.target.value)} placeholder="Scrie aici ce apare ca text la postare…" />
                    </Field>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Section>

            {/* PLANNING */}
            <Section title="Planificare" subtitle="Când iese și în ce etapă suntem." icon={<Film className="h-4 w-4 text-accent" />}>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="În ce etapă e?">
                  <Select value={form.status} onValueChange={(v) => set("status", v as PostStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{POST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Când iese?">
                  <Input type="datetime-local" value={form.scheduled_for} onChange={(e) => set("scheduled_for", e.target.value)} />
                </Field>
                <Field label="Deadline intern (opțional)">
                  <Input type="datetime-local" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* ASSETS */}
            <Section title="Fișiere" subtitle="Încarcă video, imagini, orice ai pregătit.">
              {agency && (
                <AssetUploader
                  agencyId={agency.id}
                  postId={postId}
                  value={form.assets}
                  onChange={(v) => set("assets", v)}
                />
              )}
              <div className="mt-3">
                <Field label="Thumbnail URL (opțional)" hint="Lasă gol ca să folosim prima imagine încărcată.">
                  <Input value={form.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} placeholder="https://" />
                </Field>
              </div>
            </Section>

            {/* TEAM */}
            <Section title="Echipă & note" subtitle="Cine duce mai departe." icon={<Megaphone className="h-4 w-4 text-accent" />}>
              <div className="space-y-3">
                <Field label="Cine se ocupă?">
                  <Select value={form.assigned_to || "__none"} onValueChange={(v) => set("assigned_to", v === "__none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Nimeni asignat" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nimeni încă</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email || m.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notițe interne" hint="Doar pentru echipă — clientul nu le vede.">
                  <Textarea rows={3} value={form.agency_notes} onChange={(e) => set("agency_notes", e.target.value)} placeholder="Idei, decizii, ce-ai promis în call…" />
                </Field>
                {postId && (
                  <Field label="Link postare publicată (opțional)">
                    <Input value={form.post_url} onChange={(e) => set("post_url", e.target.value)} placeholder="https://" />
                  </Field>
                )}
              </div>
            </Section>

            <SheetFooter className="pt-2 flex-row justify-between gap-2 sticky bottom-0 bg-background py-3 -mx-6 px-6 border-t border-border/60">
              <div>
                {postId && (
                  <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Șterge
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Renunță</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvează</>}
                </Button>
              </div>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">{icon}{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
