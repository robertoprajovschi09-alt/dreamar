import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Loader2, Upload, Trash2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadAgencyFile, useSignedUrl } from "@/lib/storage";

export default function Settings() {
  const { agency, refresh } = useUser();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#E11D2E");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoUrl = useSignedUrl(logoPath);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (agency) {
      setName(agency.name);
      setColor(agency.brand_color || "#E11D2E");
      setLogoPath(agency.logo_url || null);
    }
  }, [agency?.id]);

  const save = async () => {
    if (!agency) return;
    setBusy(true);
    const { error } = await supabase.from("agencies").update({
      name,
      brand_color: color,
      logo_url: logoPath,
    }).eq("id", agency.id);
    if (error) { setBusy(false); return toast.error(error.message); }
    await refresh();
    setBusy(false);
    toast.success("Salvat");
  };

  const onLogoFile = async (file: File) => {
    if (!agency) return;
    setLogoBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = await uploadAgencyFile(
        agency.id,
        `agency/logo-${Date.now()}.${ext}`,
        file,
        { upsert: true },
      );
      if (path) {
        setLogoPath(path);
        const { error } = await supabase.from("agencies").update({ logo_url: path }).eq("id", agency.id);
        if (error) toast.error(error.message);
        else { await refresh(); toast.success("Logo actualizat"); }
      }
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!agency) return;
    setLogoBusy(true);
    try {
      if (logoPath && !/^https?:\/\//i.test(logoPath)) {
        await supabase.storage.from("agency-files").remove([logoPath]);
      }
      setLogoPath(null);
      const { error } = await supabase.from("agencies").update({ logo_url: null }).eq("id", agency.id);
      if (error) toast.error(error.message);
      else { await refresh(); toast.success("Logo eliminat"); }
    } finally { setLogoBusy(false); }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Setări</h1>
        <p className="text-sm text-muted-foreground mt-1">Profilul agenției și branding.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-accent" /> Agenție</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Numele agenției</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>

          <div className="space-y-1.5">
            <Label>Logo agenție</Label>
            <div className="flex items-center gap-3">
              {logoPath ? (
                <img src={logoUrl ?? undefined} alt="logo" className="h-14 w-14 rounded-xl object-cover border border-border bg-muted" />
              ) : (
                <div className="h-14 w-14 rounded-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">Fără</div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted text-sm">
                {logoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Încarcă
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])} />
              </label>
              {logoPath && (
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo} disabled={logoBusy}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Elimină
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5"><Label>Culoare brand</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 p-1" /></div>
          <Button onClick={save} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
