import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgencyNiches, type NicheRow } from "@/hooks/useAgencyNiches";
import { getNichePreset, type KpiField, type Question } from "@/lib/nichePresets";
import { Loader2, Upload, Copy } from "lucide-react";
import { toast } from "sonner";
import { uploadAgencyFile, useSignedUrl } from "@/lib/storage";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  onCreated?: (clientId: string) => void;
  onOpenManual?: () => void;
};

function mapKpiTypeToLegacy(t?: string): "number" | "currency" | "percent" | "text" {
  if (t === "currency") return "currency";
  if (t === "percentage") return "percent";
  if (t === "text" || t === "boolean") return "text";
  return "number";
}

const DEFAULT_PERMISSIONS = {
  approve_content: true,
  view_reports: true,
  fill_business_impact: true,
  comment_on_content: true,
};

export function QuickAddClientDialog({ open, onOpenChange, agencyId, onCreated, onOpenManual }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: nicheLib = [] } = useAgencyNiches(agencyId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nicheId, setNicheId] = useState<string>("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#E11D2E");
  const [logoUploading, setLogoUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const reset = () => {
    setName(""); setEmail(""); setNicheId(""); setWebsite(""); setCity("");
    setLogoUrl(""); setBrandColor("#E11D2E"); setInviteLink(null);
  };

  const close = (v: boolean) => {
    if (!v && busy) return;
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const onLogoFile = async (file: File) => {
    if (!file || !user || !agencyId) return;
    setLogoUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = await uploadAgencyFile(
        agencyId,
        `clients/staging/${user.id}/${Date.now()}.${ext}`,
        file,
        { upsert: true },
      );
      if (path) setLogoUrl(path);
    } finally { setLogoUploading(false); }
  };
  const logoPreviewUrl = useSignedUrl(logoUrl);

  const handleManual = () => {
    onOpenChange(false);
    setTimeout(() => { reset(); onOpenManual?.(); }, 200);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) { toast.error("Numele clientului este obligatoriu."); return; }
    if (!email.trim()) { toast.error("Emailul este obligatoriu."); return; }
    if (!nicheId) { toast.error("Alege o nișă."); return; }
    const niche: NicheRow | undefined = nicheLib.find((n) => n.id === nicheId);
    if (!niche) { toast.error("Nișa selectată nu a fost găsită."); return; }

    setBusy(true);
    try {
      const isCustom = niche.is_custom;
      // 1) Create client
      const { data: clientRow, error: cErr } = await supabase.from("clients").insert({
        agency_id: agencyId,
        name: name.trim(),
        niche: (isCustom ? "custom" : niche.key) as any,
        custom_niche: isCustom ? niche.label : null,
        niche_id: niche.id,
        contact_email: email.trim().toLowerCase(),
        website: website.trim() || null,
        city: city.trim() || null,
        logo_url: logoUrl || null,
        brand_color: brandColor || null,
        status: "onboarding" as any,
      }).select("id").single();
      if (cErr || !clientRow) { toast.error(cErr?.message || "Nu s-a putut crea clientul"); return; }
      const clientId = clientRow.id as string;

      // 2) Seed KPI schema from niche library (fallback to preset for non-custom)
      const kpis: KpiField[] = niche.kpis.length
        ? niche.kpis.map((k) => ({
            key: k.key, label: k.label,
            kpi_type: k.kpi_type, type: mapKpiTypeToLegacy(k.kpi_type),
            reporting_frequency: k.reporting_frequency,
            visible_to_client: k.visible_to_client,
          }))
        : (isCustom ? [] : getNichePreset(niche.key).kpi_fields);
      const bi: KpiField[] = niche.fields.length
        ? niche.fields.map((f) => ({
            key: f.key, label: f.label,
            field_type: f.field_type, type: mapKpiTypeToLegacy(f.field_type),
          }))
        : (isCustom ? [] : getNichePreset(niche.key).business_impact_fields);
      const qs: Question[] = niche.questions.length
        ? niche.questions.map((q) => ({ key: q.key, label: q.label }))
        : (isCustom ? [] : getNichePreset(niche.key).monthly_questions);

      await supabase.from("client_kpi_schemas").insert({
        agency_id: agencyId, client_id: clientId,
        niche_key: isCustom ? "custom" : niche.key,
        custom_niche_label: isCustom ? niche.label : null,
        kpi_fields: kpis as any,
        business_impact_fields: bi as any,
        monthly_questions: qs as any,
      });

      // 3) Default onboarding tasks
      const defaultTasks = [
        "Confirm brand assets and access",
        "Schedule kickoff call",
        "Connect analytics & ad accounts",
        "Approve first content batch",
        "Set up monthly reporting cadence",
      ];
      await supabase.from("tasks").insert(defaultTasks.map((title) => ({
        agency_id: agencyId, client_id: clientId, title, task_type: "onboarding",
        status: "todo" as const, priority: "medium" as const, created_by: user.id,
      })));

      // 4) Base AI memory entry
      await supabase.from("ai_memory_items").insert({
        agency_id: agencyId, client_id: clientId,
        memory_type: "business_context",
        title: `Client created — ${name.trim()}`,
        content: `Client ${name.trim()} a fost creat în nișa "${isCustom ? niche.label : niche.label}". Onboardingul este în curs — KPI, platforme, obiective și context vor fi completate de client.`,
        source_type: "client_brief", source_id: clientId,
        confidence_score: 0.6, visibility: "internal_agency",
        created_by: user.id,
      });

      // 5) Create invite
      const { data: inv, error: iErr } = await supabase.from("client_invites").insert({
        agency_id: agencyId, client_id: clientId,
        email: email.trim().toLowerCase(),
        portal_role: "client_viewer",
        permissions: DEFAULT_PERMISSIONS as any,
        invited_by: user.id,
      }).select("token").single();

      if (iErr || !inv) {
        toast.error(`Client creat, invitația a eșuat: ${iErr?.message || "eroare necunoscută"}`);
        onCreated?.(clientId);
        close(false);
        navigate(`/agency/clients/${clientId}`);
        return;
      }

      const link = `${window.location.origin}/accept-invite?token=${inv.token}`;

      // 6) Send invite email
      let emailOk = false;
      try {
        const { data: sendRes } = await supabase.functions.invoke("send-client-invite", {
          body: { token: inv.token },
        });
        emailOk = !!(sendRes as any)?.ok;
      } catch { /* ignore */ }

      if (emailOk) {
        toast.success(`Invitație trimisă pe email către ${email.trim()}`);
        onCreated?.(clientId);
        close(false);
        navigate(`/agency/clients/${clientId}`);
      } else {
        toast.warning("Emailul nu a putut fi trimis — copiază linkul manual.");
        setInviteLink(link);
        onCreated?.(clientId);
      }
    } finally { setBusy(false); }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiat");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adaugă client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qa-name">Numele clientului *</Label>
            <Input id="qa-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-email">Email *</Label>
            <Input id="qa-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="client@exemplu.ro" />
            <p className="text-xs text-muted-foreground">La acest email va fi trimisă invitația de onboarding.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Nișă *</Label>
            <Select value={nicheId} onValueChange={setNicheId}>
              <SelectTrigger><SelectValue placeholder="Alege o nișă" /></SelectTrigger>
              <SelectContent>
                {nicheLib.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-website">Website</Label>
              <Input id="qa-website" type="url" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-city">Oraș</Label>
              <Input id="qa-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 border rounded-md cursor-pointer hover:bg-muted">
                  {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>Încarcă</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])} />
                </label>
                {logoUrl && <img src={logoPreviewUrl ?? undefined} alt="logo" className="h-9 w-9 rounded object-cover border bg-muted" />}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-color">Culoare brand</Label>
              <div className="flex items-center gap-2">
                <input id="qa-color" type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-12 rounded border bg-background cursor-pointer" />
                <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
          </div>

          {inviteLink && (
            <div className="p-3 rounded-md border bg-muted/40 space-y-2">
              <p className="text-xs text-muted-foreground">Trimite acest link clientului manual:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteLink} className="text-xs" />
                <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
            <Button type="button" variant="link" className="px-0 text-muted-foreground h-auto" onClick={handleManual}>
              Completează manual
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy}>Anulează</Button>
              {inviteLink ? (
                <Button type="button" className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => { close(false); }}>
                  Închide
                </Button>
              ) : (
                <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creează & invită"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
