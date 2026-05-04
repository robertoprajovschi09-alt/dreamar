import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, Moon, Sun, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { initials } from "@/lib/format";

const monthInputDefault = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const emptyForm = {
  month: monthInputDefault(),
  feedback_text: "",
  calls_received: 0,
  messages_received: 0,
  bookings: 0,
  sales_estimate: "" as string,
  real_life_impact: "",
  objections: "",
  promote_next_month: "",
};

export default function ClientPortal() {
  const { signOut, user } = useAuth();
  const { profile, agency, client, loading } = useUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [past, setPast] = useState<any[]>([]);
  const [pastLoading, setPastLoading] = useState(true);

  const loadPast = async () => {
    if (!client || !user) return;
    setPastLoading(true);
    const { data } = await supabase
      .from("client_feedback")
      .select("*")
      .eq("client_id", client.id)
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });
    setPast(data || []);
    setPastLoading(false);
  };

  useEffect(() => { loadPast(); }, [client?.id, user?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  if (!client || !agency) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">No client is assigned to your account yet.</p>
          <Button onClick={async () => { await signOut(); navigate("/auth"); }} variant="outline" className="mt-4">Sign out</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const monthDate = `${form.month}-01`;
    const payload = {
      agency_id: agency.id,
      client_id: client.id,
      submitted_by: user.id,
      month: monthDate,
      feedback_text: form.feedback_text || null,
      calls_received: Number(form.calls_received) || 0,
      messages_received: Number(form.messages_received) || 0,
      bookings: Number(form.bookings) || 0,
      sales_estimate: form.sales_estimate === "" ? null : Number(form.sales_estimate),
      real_life_impact: form.real_life_impact || null,
      objections: form.objections || null,
      promote_next_month: form.promote_next_month || null,
    };
    const { error } = await supabase.from("client_feedback").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Feedback submitted. Thank you!");
    setForm({ ...emptyForm, month: form.month });
    loadPast();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur z-30">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} className="h-9 w-9">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[11px] bg-accent text-accent-foreground">
                    {initials(profile?.full_name || profile?.email || "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">{profile?.full_name || profile?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">
                <div className="font-semibold truncate">{profile?.full_name || "Account"}</div>
                <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Client portal</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {client.niche.replace("_", " ")} {client.city ? `· ${client.city}` : ""} · managed by <span className="text-foreground">{agency.name}</span>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PlaceholderCard title="Monthly objectives" body="Your agency will publish this month's objectives here." />
          <PlaceholderCard title="Awaiting your approval" body="Content waiting for your approval will appear here." />
          <PlaceholderCard title="Latest reports" body="Your latest monthly report will appear here." />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4 text-accent" /> Monthly feedback & business impact</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Sales estimate (€)</Label>
                  <Input type="number" min="0" step="0.01" value={form.sales_estimate} onChange={(e) => setForm({ ...form, sales_estimate: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <NumField label="Calls received" value={form.calls_received} onChange={(v) => setForm({ ...form, calls_received: v })} />
                <NumField label="Messages received" value={form.messages_received} onChange={(v) => setForm({ ...form, messages_received: v })} />
                <NumField label="Bookings" value={form.bookings} onChange={(v) => setForm({ ...form, bookings: v })} />
              </div>
              <div className="space-y-1.5">
                <Label>General feedback</Label>
                <Textarea rows={3} value={form.feedback_text} onChange={(e) => setForm({ ...form, feedback_text: e.target.value })} placeholder="How did this month feel overall?" />
              </div>
              <div className="space-y-1.5">
                <Label>Real-life impact</Label>
                <Textarea rows={2} value={form.real_life_impact} onChange={(e) => setForm({ ...form, real_life_impact: e.target.value })} placeholder="New clients, partnerships, brand recognition..." />
              </div>
              <div className="space-y-1.5">
                <Label>Objections heard from customers</Label>
                <Textarea rows={2} value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} placeholder='"Too expensive", "Too far", etc.' />
              </div>
              <div className="space-y-1.5">
                <Label>What should we promote next month?</Label>
                <Textarea rows={2} value={form.promote_next_month} onChange={(e) => setForm({ ...form, promote_next_month: e.target.value })} />
              </div>
              <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Submit</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Your previous submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {pastLoading ? (
              <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : past.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {past.map((f) => (
                  <li key={f.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{new Date(f.month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {f.calls_received} calls · {f.messages_received} messages · {f.bookings} bookings
                      {f.sales_estimate ? ` · €${f.sales_estimate}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-xs text-muted-foreground">{body}</p></CardContent>
    </Card>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}
