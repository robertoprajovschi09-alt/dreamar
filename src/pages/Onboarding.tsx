import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const { refresh } = useAgency();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("agencies").insert({ name: name.trim(), slug, created_by: user.id }).select().single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    await refresh();
    localStorage.setItem("agencyos-current-agency", data.id);
    toast.success("Agency created. Welcome to AgencyOS.");
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-surface">
      <div className="w-full max-w-md">
        <div className="mb-10"><Logo size="lg" /></div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-premium">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">Step 1 of 1</div>
          <h1 className="text-2xl font-bold tracking-tight">Create your agency workspace</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            This is your private space. You can invite team members and add clients next.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agency">Agency name</Label>
              <Input id="agency" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Marketing" autoFocus />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground mt-4 text-center">
            14-day free trial of <span className="font-semibold text-foreground">Starter Agency</span>. Upgrade anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
