import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Badge } from "@/components/ui/badge";

export default function Billing() {
  const { agency } = useUser();
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan, invoices and seat usage.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /> Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-wide">{agency?.plan || "starter"}</Badge>
            <span className="text-sm text-muted-foreground">Trial active</span>
          </div>
          <p className="text-sm text-muted-foreground">Self-serve billing is coming soon. Contact support to upgrade your plan.</p>
        </CardContent>
      </Card>
    </div>
  );
}
