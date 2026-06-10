import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PortalPermissions,
  PORTAL_PERMISSION_KEYS,
  PORTAL_PERMISSION_LABELS,
  normalizePermissions,
} from "@/lib/portalPermissions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: { kind: "user" | "invite"; id: string; email: string; role?: string; permissions?: any } | null;
  onSaved?: () => void;
};

export function EditPortalPermissionsDialog({ open, onOpenChange, target, onSaved }: Props) {
  const [perms, setPerms] = useState<PortalPermissions | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      const role = target.role === "client_owner" ? "client_owner" : "client_viewer";
      setPerms(normalizePermissions(target.permissions, role));
    }
  }, [target]);

  if (!target || !perms) return null;

  const save = async () => {
    setBusy(true);
    const table = target.kind === "user" ? "client_users" : "client_invites";
    const { error } = await supabase.from(table).update({ permissions: perms as any }).eq("id", target.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Permisiuni actualizate");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Portal permissions</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{target.email}</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {PORTAL_PERMISSION_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 py-1">
              <Label htmlFor={`perm-${k}`} className="cursor-pointer flex-1 text-sm font-normal">
                {PORTAL_PERMISSION_LABELS[k]}
              </Label>
              <Switch
                id={`perm-${k}`}
                checked={perms[k]}
                onCheckedChange={(v) => setPerms({ ...perms, [k]: v })}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={save} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
