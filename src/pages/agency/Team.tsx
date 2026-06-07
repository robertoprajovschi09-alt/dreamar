import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";

export default function Team() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Echipă</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestionează membrii agenției și accesul lor.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4 text-accent" /> Gestionarea echipei</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Invitațiile și rolurile sunt disponibile în tab-ul <strong>Setări → Utilizatori</strong> al fiecărui client. Un spațiu dedicat echipei la nivel de agenție va veni în curând.
        </CardContent>
      </Card>
    </div>
  );
}
