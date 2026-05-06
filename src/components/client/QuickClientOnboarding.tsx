import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { getClientBrief, saveClientBrief, type ClientBrief } from "@/lib/brief";

type Props = {
  agencyId: string;
  agencyName: string;
  clientId: string;
  clientName: string;
  userId: string;
  onCompleted: () => void;
};

type Goal = { id: string; objective: string; metric: string | null; target: number | null };

export function QuickClientOnboarding({ agencyId, agencyName, clientId, clientName, userId, onCompleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [client, setClient] = useState<any>(null);

  // form state
  const [priorityGoalId, setPriorityGoalId] = useState<string>("");
  const [customPriority, setCustomPriority] = useState("");
  const [successDefinition, setSuccessDefinition] = useState("");
  const [neverDo, setNeverDo] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: c }, { data: g }, brief] = await Promise.all([
          supabase.from("clients").select("brand_voice,target_audience,tone_of_voice,platforms,notes").eq("id", clientId).maybeSingle(),
          supabase.from("monthly_goals").select("id,objective,metric,target").eq("client_id", clientId).order("month", { ascending: false }).limit(10),
          getClientBrief(clientId).catch(() => null),
        ]);
        setClient(c);
        setGoals((g as Goal[]) || []);
        if (g && g.length) setPriorityGoalId(g[0].id);
        if (brief) {
          setSuccessDefinition(brief.main_objective || "");
          setNeverDo(brief.content_donts || "");
          setExtraNotes(brief.extra_notes || "");
        }
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const submit = async () => {
    if (!successDefinition.trim()) {
      toast.error("Tell us what success looks like.");
      return;
    }
    setSaving(true);
    try {
      const existing = await getClientBrief(clientId).catch(() => null);
      const brief: ClientBrief = {
        ...(existing || {}),
        agency_id: agencyId,
        client_id: clientId,
        submitted_by: userId,
        main_objective: successDefinition.trim(),
        content_donts: neverDo.trim() || null,
        extra_notes: extraNotes.trim() || null,
        // pull-through from agency-collected data so we don't re-ask
        business_description: existing?.business_description || client?.brand_voice || null,
        target_audience: existing?.target_audience || client?.target_audience || null,
        brand_tone: existing?.brand_tone || client?.tone_of_voice || null,
        unique_selling_points: existing?.unique_selling_points || client?.notes || null,
        preferred_platforms: existing?.preferred_platforms?.length ? existing.preferred_platforms : (client?.platforms || []),
        completed: true,
      };
      await saveClientBrief(brief);

      // If a custom priority was typed, persist as a new monthly goal for current month.
      if (customPriority.trim()) {
        const month = new Date(); month.setDate(1);
        await supabase.from("monthly_goals").insert({
          agency_id: agencyId, client_id: clientId,
          month: month.toISOString().slice(0, 10),
          objective: customPriority.trim(),
        } as any);
      }

      // Fire-and-forget AI personalization
      supabase.functions.invoke("client-dashboard-personalize", { body: { client_id: clientId } }).catch(() => {});

      toast.success("All set — your dashboard is ready.");
      onCompleted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6">
        <Logo />
        <div className="text-xs text-muted-foreground">{agencyName}</div>
      </header>
      <main className="max-w-xl mx-auto p-6 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Welcome
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Hi {clientName}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {agencyName} already prepared your workspace. Just three quick questions and we're done.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Three quick questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm">1. Your top priority for the next 90 days *</Label>
              {goals.length > 0 ? (
                <div className="space-y-1.5">
                  {goals.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => { setPriorityGoalId(g.id); setCustomPriority(""); }}
                      className={`w-full text-left px-3 py-2 rounded-md border text-sm transition ${priorityGoalId === g.id && !customPriority ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40"}`}
                    >
                      <div className="font-medium">{g.objective}</div>
                      {g.metric && <div className="text-xs text-muted-foreground mt-0.5">Target: {g.target ?? "—"} {g.metric}</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No goals set yet — tell us yours below.</p>
              )}
              <Textarea
                rows={2}
                placeholder={goals.length ? "Or type a different priority…" : "e.g. Get 50 new patient inquiries"}
                value={customPriority}
                onChange={(e) => { setCustomPriority(e.target.value); if (e.target.value) setPriorityGoalId(""); }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">2. What does success look like in plain words? *</Label>
              <Textarea rows={3} value={successDefinition} onChange={(e) => setSuccessDefinition(e.target.value)} placeholder="e.g. My phone rings more, my calendar is full, people walk in mentioning Instagram." />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">3. What should we NEVER post or say?</Label>
              <Textarea rows={3} value={neverDo} onChange={(e) => setNeverDo(e.target.value)} placeholder="e.g. No discount-driven posts, no patient faces without consent." />
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Anything else we should know? (optional)</summary>
              <Textarea className="mt-2" rows={3} value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} placeholder="Constraints, opportunities, internal context…" />
            </details>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button disabled={saving} onClick={submit} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" /> Open my dashboard</>}
          </Button>
        </div>
      </main>
    </div>
  );
}
