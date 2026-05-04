import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const { refresh, agencies, loading: agencyLoading } = useAgency();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || agencyLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (agencies.length > 0) return <Navigate to="/app" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_agency_for_current_user", { _name: name.trim() });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await refresh();
    if (data) localStorage.setItem("agencyos-current-agency", data as string);
    toast.success("Agency created.");
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center"><Logo size="lg" /></div>
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold tracking-tight">Create your agency workspace</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">You can rename it anytime.</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agency">Agency name</Label>
              <Input id="agency" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Marketing" autoFocus />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
