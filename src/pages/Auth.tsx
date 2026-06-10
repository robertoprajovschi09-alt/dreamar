import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { roleHome } from "@/components/RoleRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const { profile, loading: userLoading, refresh } = useUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const bootstrappingRef = useRef(false);

  // No auto-bootstrap of an agency here. Agency creation happens only when the user
  // explicitly signs up via the "Creează agenție" tab. Client-invite signups must NEVER
  // get an agency provisioned for them.
  useEffect(() => {
    if (loading || userLoading) return;
    if (!user || !profile) return;
    if (profile.role) return;
    // Logged in with no role yet — likely a pending client invite. Send them to accept it.
    const inviteToken = (user.user_metadata as any)?.invite_token;
    const signupType = (user.user_metadata as any)?.signup_type;
    if (inviteToken && signupType === 'client_invite') {
      navigate(`/accept-invite?token=${inviteToken}`, { replace: true });
    }
  }, [loading, userLoading, user, profile, navigate]);

  if (loading || (user && userLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (user && profile?.role) return <Navigate to={roleHome(profile.role)} replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/agency", data: { full_name: fullName } },
    });
    if (error) { setBusy(false); toast.error(error.message); return; }

    if (data.session) {
      const { error: rpcErr } = await supabase.rpc("create_agency_for_current_user", {
        _name: `${fullName || "Agenția mea"} · Agenție`,
      });
      if (rpcErr) { setBusy(false); toast.error(rpcErr.message); return; }
      await refresh();
      setBusy(false);
      navigate("/agency");
      return;
    }
    setBusy(false);
    toast.success("Cont creat. Verifică emailul pentru confirmare.");
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/agency" });
      if (result.error) { toast.error("Autentificarea cu Google a eșuat"); setBusy(false); return; }
      if (result.redirected) return;
    } catch (e: any) { toast.error(e.message); setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-surface relative overflow-hidden border-r border-border">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <Logo size="lg" />
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs font-semibold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" /> Sistemul de operare pentru agenții de marketing
          </div>
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Conduce toată agenția dintr-un <span className="text-gradient-accent">singur loc</span>.
          </h2>
          <p className="text-muted-foreground">
            Înregistrează-te ca să îți creezi agenția. Clienții pe care îi inviți primesc propriul portal privat — văd doar datele lor.
          </p>
        </div>
        <div className="text-xs text-muted-foreground relative z-10">
          Ești clientul unei agenții? Folosește linkul de invitație pe care l-ai primit.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo size="lg" /></div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Intră în cont</TabsTrigger>
              <TabsTrigger value="signup">Creează agenție</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h1 className="text-2xl font-bold">Bine ai revenit</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Conectează-te la spațiul tău de lucru.</p>

              <Button variant="outline" className="w-full mb-4" onClick={handleGoogle} disabled={busy}>
                <GoogleIcon /> Continuă cu Google
              </Button>
              <div className="relative my-4 text-center text-xs text-muted-foreground"><span className="bg-background px-2 relative z-10">sau</span><div className="absolute inset-x-0 top-1/2 border-t border-border" /></div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@agentia.ro" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Parolă</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Intră în cont"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="text-2xl font-bold">Creează-ți agenția</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Spațiul de lucru se creează automat.</p>

              <Button variant="outline" className="w-full mb-4" onClick={handleGoogle} disabled={busy}>
                <GoogleIcon /> Continuă cu Google
              </Button>
              <div className="relative my-4 text-center text-xs text-muted-foreground"><span className="bg-background px-2 relative z-10">sau</span><div className="absolute inset-x-0 top-1/2 border-t border-border" /></div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Numele tău</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ion Popescu" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@agentia.ro" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Parolă</Label>
                  <Input id="password2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Cel puțin 8 caractere" />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creează agenție"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  );
}
