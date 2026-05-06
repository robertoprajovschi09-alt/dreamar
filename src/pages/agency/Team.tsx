import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";

export default function Team() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your agency members and their access.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4 text-accent" /> Team management</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Team invites and role management are available in each client's <strong>Settings → Users</strong> tab. A dedicated agency-wide team workspace is coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
