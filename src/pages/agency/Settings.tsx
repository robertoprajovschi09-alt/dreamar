import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { agency } = useUser();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#E11D2E");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (agency) { setName(agency.name); setColor(agency.brand_color || "#E11D2E"); }
  }, [agency?.id]);

  const save = async () => {
    if (!agency) return;
    setBusy(true);
    const { error } = await supabase.from("agencies").update({ name, brand_color: color }).eq("id", agency.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Agency profile and branding.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-accent" /> Agency</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Agency name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Brand color</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 p-1" /></div>
          <Button onClick={save} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
