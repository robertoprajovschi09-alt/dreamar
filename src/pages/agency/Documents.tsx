import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { DocumentsList } from "@/components/operations/DocumentsList";

export default function Documents() {
  const { agency } = useUser();
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (!agency) return;
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name").then(({ data }) => setClients(data || []));
  }, [agency]);

  if (!agency) return null;
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">Briefs, contracts, creative assets and reports.</p>
      </div>
      <DocumentsList agencyId={agency.id} clients={clients} />
    </div>
  );
}
