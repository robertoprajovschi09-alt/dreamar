import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { NICHES, PLATFORMS } from "@/lib/niches";
import { Loader2, Check, ArrowLeft, ArrowRight, Copy, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  onCreated?: (clientId: string) => void;
};

const STATUSES = ["active", "prospect", "paused"] as const;

type Form = {
  // step 1
  name: string;
  niche: string;
  custom_niche: string;
  city: string;
  website: string;
  status: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  // step 2
  brand_voice: string;
  tone_of_voice: string;
  target_audience: string;
  brand_color: string;
  social_instagram: string;
  social_tiktok: string;
  social_facebook: string;
  social_youtube: string;
  social_linkedin: string;
  // step 3
  platforms: string[];
  services: string[];
  monthly_retainer: string;
  start_date: string;
  budget_estimate: string;
  objectives: string;
  competitors: string;
  notes: string;
  // step 4
  invite_enabled: boolean;
  invite_email: string;
};

const empty: Form = {
  name: "", niche: "custom", custom_niche: "", city: "", website: "", status: "active",
  contact_person: "", contact_email: "", contact_phone: "",
  brand_voice: "", tone_of_voice: "", target_audience: "", brand_color: "#E11D2E",
  social_instagram: "", social_tiktok: "", social_facebook: "", social_youtube: "", social_linkedin: "",
  platforms: [], services: [], monthly_retainer: "", start_date: "", budget_estimate: "",
  objectives: "", competitors: "", notes: "",
  invite_enabled: false, invite_email: "",
};

const STEPS = [
  { n: 1, title: "Basics", desc: "Who is this client?" },
  { n: 2, title: "Brand & Audience", desc: "Voice, look, audience" },
  { n: 3, title: "Services & Goals", desc: "What you'll deliver" },
  { n: 4, title: "Invite", desc: "Bring them into the portal" },
];

export function AddClientWizard({ open, onOpenChange, agencyId, onCreated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setStep(1); setForm(empty); setServiceInput(""); setCreatedClientId(null); setInviteLink(null);
  };

  const close = (v: boolean) => {
    if (!v && busy) return;
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const togglePlatform = (p: string) => {
    set("platforms", form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p]);
  };

  const addService = () => {
    const v = serviceInput.trim();
    if (!v || form.services.includes(v)) return;
    set("services", [...form.services, v]);
    setServiceInput("");
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.name.trim()) return "Client name is required.";
      if (form.niche === "custom" && !form.custom_niche.trim()) return "Please enter a custom niche.";
    }
    if (step === 4 && form.invite_enabled && !createdClientId) {
      if (!form.invite_email.trim()) return "Enter an email to invite the client.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const buildSocialLinks = () => {
    const o: Record<string, string> = {};
    if (form.social_instagram) o.instagram = form.social_instagram;
    if (form.social_tiktok) o.tiktok = form.social_tiktok;
    if (form.social_facebook) o.facebook = form.social_facebook;
    if (form.social_youtube) o.youtube = form.social_youtube;
    if (form.social_linkedin) o.linkedin = form.social_linkedin;
    return o;
  };

  const createClient = async (): Promise<string | null> => {
    const payload: any = {
      agency_id: agencyId,
      name: form.name.trim(),
      niche: form.niche,
      custom_niche: form.niche === "custom" ? form.custom_niche.trim() : null,
      city: form.city.trim() || null,
      website: form.website.trim() || null,
      status: form.status,
      contact_person: form.contact_person.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      brand_voice: form.brand_voice.trim() || null,
      tone_of_voice: form.tone_of_voice.trim() || null,
      target_audience: form.target_audience.trim() || null,
      brand_color: form.brand_color || null,
      social_links: buildSocialLinks(),
      platforms: form.platforms,
      services: form.services,
      monthly_retainer: form.monthly_retainer ? Number(form.monthly_retainer) : null,
      start_date: form.start_date || null,
      budget_estimate: form.budget_estimate ? Number(form.budget_estimate) : null,
      objectives: form.objectives.trim() || null,
      competitors: form.competitors.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
    if (error) { toast.error(error.message); return null; }
    return data.id as string;
  };

  const handleFinish = async () => {
    setBusy(true);
    let clientId = createdClientId;
    if (!clientId) {
      clientId = await createClient();
      if (!clientId) { setBusy(false); return; }
      setCreatedClientId(clientId);
      toast.success("Client created");
    }

    if (form.invite_enabled && !inviteLink && user) {
      const { data, error } = await supabase
        .from("client_invites")
        .insert({
          agency_id: agencyId,
          client_id: clientId,
          email: form.invite_email.trim().toLowerCase(),
          invited_by: user.id,
        })
        .select("token")
        .single();
      if (error) {
        toast.error(`Client created but invite failed: ${error.message}`);
      } else {
        const url = `${window.location.origin}/accept-invite?token=${data.token}`;
        setInviteLink(url);
        toast.success("Invite link generated");
      }
    }

    setBusy(false);
    onCreated?.(clientId);

    if (!form.invite_enabled) {
      close(false);
      navigate(`/agency/clients/${clientId}`);
    }
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied");
  };

  const finishAndGo = () => {
    if (createdClientId) {
      close(false);
      navigate(`/agency/clients/${createdClientId}`);
    }
  };

  const progress = (step / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <DialogTitle>Add new client</DialogTitle>
          </div>
          <div className="mt-3 space-y-2">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs">
              {STEPS.map((s) => (
                <div key={s.n} className={cn(
                  "flex items-center gap-1.5",
                  step === s.n ? "text-foreground font-medium" : step > s.n ? "text-accent" : "text-muted-foreground",
                )}>
                  <span className={cn(
                    "h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px]",
                    step === s.n ? "bg-accent text-accent-foreground" :
                    step > s.n ? "bg-accent/20 text-accent" : "bg-muted",
                  )}>
                    {step > s.n ? <Check className="h-3 w-3" /> : s.n}
                  </span>
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="w-name">Client name *</Label>
                <Input id="w-name" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Bella Beauty Studio" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Niche *</Label>
                  <Select value={form.niche} onValueChange={(v) => set("niche", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.niche === "custom" && (
                <div className="space-y-1.5">
                  <Label htmlFor="w-custom-niche">Custom niche *</Label>
                  <Input id="w-custom-niche" value={form.custom_niche} onChange={(e) => set("custom_niche", e.target.value)} placeholder="e.g. Pet grooming, Boutique hotel..." />
                  <p className="text-xs text-muted-foreground">Used by the AI when generating strategies and content for this client.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="w-city">City</Label>
                  <Input id="w-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-website">Website</Label>
                  <Input id="w-website" type="url" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Primary contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Name" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
                  <Input placeholder="Phone" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </div>
                <Input className="mt-3" type="email" placeholder="Email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Brand voice</Label>
                <Textarea rows={3} value={form.brand_voice} onChange={(e) => set("brand_voice", e.target.value)} placeholder="How does the brand speak? Friendly, expert, bold..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tone of voice</Label>
                  <Input value={form.tone_of_voice} onChange={(e) => set("tone_of_voice", e.target.value)} placeholder="e.g. Warm & professional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Brand color</Label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-14 p-1 h-10" value={form.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                    <Input value={form.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Target audience</Label>
                <Textarea rows={3} value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} placeholder="Who are we talking to? Age, location, interests, pain points..." />
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Social handles</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Instagram" value={form.social_instagram} onChange={(e) => set("social_instagram", e.target.value)} />
                  <Input placeholder="TikTok" value={form.social_tiktok} onChange={(e) => set("social_tiktok", e.target.value)} />
                  <Input placeholder="Facebook" value={form.social_facebook} onChange={(e) => set("social_facebook", e.target.value)} />
                  <Input placeholder="YouTube" value={form.social_youtube} onChange={(e) => set("social_youtube", e.target.value)} />
                  <Input placeholder="LinkedIn" value={form.social_linkedin} onChange={(e) => set("social_linkedin", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Active platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const active = form.platforms.includes(p.value);
                    return (
                      <button
                        type="button"
                        key={p.value}
                        onClick={() => togglePlatform(p.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-colors",
                          active ? "bg-accent text-accent-foreground border-accent" : "bg-background hover:bg-muted",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Services delivered</Label>
                <div className="flex gap-2">
                  <Input
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                    placeholder="e.g. Content production, Ads, Strategy..."
                  />
                  <Button type="button" variant="outline" onClick={addService}>Add</Button>
                </div>
                {form.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {form.services.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1 pr-1">
                        {s}
                        <button onClick={() => set("services", form.services.filter((x) => x !== s))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label>Start date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly retainer</Label>
                  <Input type="number" min="0" value={form.monthly_retainer} onChange={(e) => set("monthly_retainer", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ad budget est.</Label>
                  <Input type="number" min="0" value={form.budget_estimate} onChange={(e) => set("budget_estimate", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Objectives</Label>
                <Textarea rows={2} value={form.objectives} onChange={(e) => set("objectives", e.target.value)} placeholder="What does success look like for this client?" />
              </div>
              <div className="space-y-1.5">
                <Label>Main competitors</Label>
                <Textarea rows={2} value={form.competitors} onChange={(e) => set("competitors", e.target.value)} placeholder="Names, handles, websites..." />
              </div>
              <div className="space-y-1.5">
                <Label>Internal notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-lg border p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Invite the client to their portal</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    They get a private space to view content, approve posts, see reports and submit briefs.
                  </p>
                </div>
                <Switch
                  checked={form.invite_enabled}
                  onCheckedChange={(v) => set("invite_enabled", v)}
                  disabled={!!inviteLink}
                />
              </div>

              {form.invite_enabled && !inviteLink && (
                <div className="space-y-1.5">
                  <Label htmlFor="w-invite-email">Client email *</Label>
                  <Input
                    id="w-invite-email"
                    type="email"
                    value={form.invite_email}
                    onChange={(e) => set("invite_email", e.target.value)}
                    placeholder="client@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    A secure invite link expires in 7 days. The client account will be linked to this client only.
                  </p>
                </div>
              )}

              {inviteLink && (
                <div className="space-y-2">
                  <Label>Invite link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={copyInvite}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this link with {form.invite_email}.</p>
                </div>
              )}

              {createdClientId && (
                <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" />
                  <span>Client created successfully.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 1 || busy}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            {step === 4 ? (
              inviteLink || (createdClientId && !form.invite_enabled) ? (
                <Button onClick={finishAndGo} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Open client
                </Button>
              ) : (
                <>
                  {!createdClientId && (
                    <Button type="button" variant="outline" onClick={() => { set("invite_enabled", false); handleFinish(); }} disabled={busy}>
                      Skip invite
                    </Button>
                  )}
                  <Button onClick={handleFinish} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> :
                      createdClientId ? "Send invite" : form.invite_enabled ? "Create & invite" : "Create client"}
                  </Button>
                </>
              )
            ) : (
              <Button onClick={next} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
