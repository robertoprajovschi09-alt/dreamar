import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { await supabase.functions.invoke("ensure-super-admin-account"); } catch { /* non-blocking */ }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase
        .from("profiles").select("is_saas_admin").eq("id", session.user.id).maybeSingle();
      if (prof?.is_saas_admin) navigate("/admin", { replace: true });
    })();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error) {
        toast.error("Date de autentificare admin invalide.");
        return;
      }

      try { await supabase.functions.invoke("bootstrap-super-admin"); } catch { /* non-blocking */ }

      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { toast.error("Date de autentificare admin invalide."); return; }

      const { data: prof } = await supabase
        .from("profiles").select("is_saas_admin").eq("id", uid).maybeSingle();

      if (prof?.is_saas_admin) {
        toast.success("Bine ai venit, admin.");
        navigate("/admin", { replace: true });
      } else {
        await supabase.auth.signOut();
        toast.error("Acces refuzat. Această zonă e doar pentru Super Admin.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/"><Logo /></Link>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/5 mb-3">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Autentificare admin</h1>
            <p className="text-xs text-muted-foreground mt-1">Zonă restricționată · doar Super Admin</p>
          </div>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input id="admin-email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password">Parolă</Label>
                  <Input id="admin-password" type="password" autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Intră ca admin"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="text-center mt-4">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Înapoi la site</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
