import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refresh } = useUser();

  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) { setPreviewError("Lipsește tokenul de invitație."); setPreviewLoading(false); return; }
      supabase.rpc("mark_invite_opened", { _token: token }).then(() => {});
      const { data, error } = await supabase.rpc("get_invite_preview", { _token: token });
      if (error) { setPreviewError(error.message); setPreviewLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setPreviewError("Invitația nu a fost găsită."); setPreviewLoading(false); return; }
      if (!["pending", "sent", "opened"].includes(row.status)) { setPreviewError(`Această invitație este: ${row.status}.`); setPreviewLoading(false); return; }
      if (new Date(row.expires_at) < new Date()) { setPreviewError("Această invitație a expirat."); setPreviewLoading(false); return; }
      setPreview(row);
      setEmail(row.email);
      setPreviewLoading(false);
    })();
  }, [token]);

  useEffect(() => {
    if (authLoading || !user || !preview || accepting) return;
    setAccepting(true);
    (async () => {
      const { error } = await supabase.rpc("accept_client_invite", { _token: token });
      if (error) { toast.error(error.message); setAccepting(false); return; }
      await refresh();
      toast.success(`Bine ai venit în ${preview.client_name}!`);
      navigate("/client", { replace: true });
    })();
  }, [user, authLoading, preview, accepting, token, navigate, refresh]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: preview?.email || email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: preview?.email || email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/accept-invite?token=${token}`,
        data: { full_name: fullName, invite_token: token, signup_type: 'client_invite' },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Cont creat. Acceptăm invitația...");
  };

  if (previewLoading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-xl font-bold">Invitație indisponibilă</h1>
            <p className="text-sm text-muted-foreground">{previewError}</p>
            <Link to="/auth"><Button variant="outline">Mergi la autentificare</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <CheckCircle2 className="h-10 w-10 mx-auto text-accent" />
          <p className="text-sm text-muted-foreground">Acceptăm invitația…</p>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Ai fost invitat</div>
              <h1 className="text-xl font-bold">Alătură-te portalului {preview.client_name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Invitat de <span className="text-foreground">{preview.agency_name}</span></p>
            </div>

            <Tabs defaultValue="signup">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signup">Cont nou</TabsTrigger>
                <TabsTrigger value="signin">Am deja cont</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5"><Label>Numele tău</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={preview.email} readOnly disabled /><p className="text-xs text-muted-foreground">Această invitație este pentru acest email.</p></div>
                  <div className="space-y-1.5"><Label>Parolă</Label><Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Cel puțin 8 caractere" /></div>
                  <Button type="submit" disabled={busy} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creează cont și acceptă"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={preview.email} readOnly disabled /><p className="text-xs text-muted-foreground">Trebuie să te conectezi cu emailul invitat.</p></div>
                  <div className="space-y-1.5"><Label>Parolă</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" disabled={busy} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectează-te și acceptă"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
