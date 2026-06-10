import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import {
  type ClientBrief, getClientBrief, saveClientBrief,
  BRAND_TONES, POSTING_FREQUENCIES, BUDGET_RANGES, PLATFORM_OPTIONS,
} from "@/lib/brief";

type Props = {
  agencyId: string;
  agencyName: string;
  clientId: string;
  clientName: string;
  userId: string;
  onCompleted: () => void;
};

const STEPS = [
  { title: "About your business", description: "Help us understand who you are" },
  { title: "Your goals & audience", description: "What success looks like for you" },
  { title: "Brand voice & content", description: "How we should communicate" },
  { title: "Practical details", description: "Almost done!" },
];

export function BriefWizard({ agencyId, agencyName, clientId, clientName, userId, onCompleted }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState<ClientBrief>({
    agency_id: agencyId,
    client_id: clientId,
    submitted_by: userId,
    preferred_platforms: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const existing = await getClientBrief(clientId);
        if (existing) setBrief({ ...existing, agency_id: agencyId, client_id: clientId, submitted_by: userId });
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, agencyId, userId]);

  const update = (patch: Partial<ClientBrief>) => setBrief((b) => ({ ...b, ...patch }));

  const togglePlatform = (p: string) => {
    const cur = brief.preferred_platforms || [];
    update({ preferred_platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };

  const persist = async (markCompleted: boolean) => {
    setSaving(true);
    try {
      const id = await saveClientBrief({ ...brief, completed: markCompleted });
      setBrief((b) => ({ ...b, id }));
      if (markCompleted) {
        toast.success("Mulțumim! Brief-ul a fost salvat.");
        onCompleted();
      } else {
        toast.success("Salvat ca ciornă");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = (() => {
    if (step === 0) return !!brief.business_description?.trim();
    if (step === 1) return !!brief.main_objective?.trim() && !!brief.target_audience?.trim();
    if (step === 2) return !!brief.brand_tone;
    return true;
  })();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6">
        <Logo />
        <div className="text-xs text-muted-foreground">{agencyName}</div>
      </header>

      <main className="max-w-2xl mx-auto p-6 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Welcome to your portal
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Let's get to know {clientName}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Take 3 minutes to fill out this brief — it helps your agency build content that actually moves the needle for your business.
          </p>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Step {step + 1} of {STEPS.length} · {STEPS[step].title}</span>
            <span className="text-muted-foreground">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{STEPS[step].title}</CardTitle>
            <p className="text-sm text-muted-foreground">{STEPS[step].description}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 0 && (
              <>
                <Field label="Briefly describe your business *" hint="What do you sell, where, to whom?">
                  <Textarea rows={4} value={brief.business_description || ""} onChange={(e) => update({ business_description: e.target.value })} placeholder="e.g. A modern dental clinic in central Bucharest specializing in cosmetic and pediatric dentistry…" />
                </Field>
                <Field label="What makes you different from competitors?" hint="Why would someone pick you?">
                  <Textarea rows={3} value={brief.unique_selling_points || ""} onChange={(e) => update({ unique_selling_points: e.target.value })} placeholder="e.g. Same-day crowns, anxiety-free experience, Saturday hours…" />
                </Field>
                <Field label="Main competitors (optional)">
                  <Textarea rows={2} value={brief.main_competitors || ""} onChange={(e) => update({ main_competitors: e.target.value })} placeholder="Names, accounts, websites…" />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="What is your main objective for the next 3 months? *" hint="One concrete outcome.">
                  <Textarea rows={3} value={brief.main_objective || ""} onChange={(e) => update({ main_objective: e.target.value })} placeholder="e.g. Get 50 new patient inquiries, grow IG to 10k, fill our weekly classes…" />
                </Field>
                <Field label="Who is your ideal customer? *" hint="Age, location, lifestyle, problem they have.">
                  <Textarea rows={3} value={brief.target_audience || ""} onChange={(e) => update({ target_audience: e.target.value })} placeholder="e.g. Women 28-45 in Bucharest, busy professionals, want a confident smile…" />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Brand tone *">
                  <Select value={brief.brand_tone || ""} onValueChange={(v) => update({ brand_tone: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a tone" /></SelectTrigger>
                    <SelectContent>{BRAND_TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="What we SHOULD communicate" hint="Topics, messages, values you want to push.">
                  <Textarea rows={3} value={brief.content_dos || ""} onChange={(e) => update({ content_dos: e.target.value })} placeholder="e.g. Patient stories, behind-the-scenes, expertise…" />
                </Field>
                <Field label="What we should NEVER do" hint="Hard no's. Topics, words, formats to avoid.">
                  <Textarea rows={3} value={brief.content_donts || ""} onChange={(e) => update({ content_donts: e.target.value })} placeholder="e.g. No discount-driven posts, no patient faces without consent…" />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Preferred platforms" hint="Tap to select.">
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORM_OPTIONS.map((p) => {
                      const active = (brief.preferred_platforms || []).includes(p);
                      return (
                        <button key={p} type="button" onClick={() => togglePlatform(p)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground"}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Posting frequency">
                    <Select value={brief.posting_frequency || ""} onValueChange={(v) => update({ posting_frequency: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                      <SelectContent>{POSTING_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Monthly ad budget">
                    <Select value={brief.budget_range || ""} onValueChange={(v) => update({ budget_range: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                      <SelectContent>{BUDGET_RANGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Anything else we should know?">
                  <Textarea rows={3} value={brief.extra_notes || ""} onChange={(e) => update({ extra_notes: e.target.value })} placeholder="Constraints, opportunities, internal context…" />
                </Field>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={saving} onClick={() => persist(false)} className="text-muted-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button disabled={!canProceed || saving} onClick={() => setStep(step + 1)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Continue <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button disabled={saving} onClick={() => persist(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" /> Submit brief</>}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
    </div>
  );
}
