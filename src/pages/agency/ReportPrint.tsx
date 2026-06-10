import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { formatPeriod, formatMetricKey, type Report } from "@/lib/reports";
import { useSignedUrl } from "@/lib/storage";

export default function ReportPrint() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Report | null>(null);
  const [client, setClient] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [agency, setAgency] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
      if (!data) { setNotFound(true); return; }
      setR(data as any);
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase.from("clients").select("name,logo_url").eq("id", data.client_id).maybeSingle(),
        supabase.from("agencies").select("name,logo_url").eq("id", data.agency_id).maybeSingle(),
      ]);
      setClient(c as any);
      setAgency(a as any);
      setTimeout(() => window.print(), 700);
    })();
  }, [id]);

  if (notFound) return <div className="p-10 text-center text-sm text-muted-foreground">Raportul nu a fost găsit sau nu îl poți vedea.</div>;
  if (!r) return <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  return <ReportPrintInner r={r} client={client} agency={agency} />;
}

function ReportPrintInner({ r, client, agency }: { r: Report; client: { name: string; logo_url: string | null } | null; agency: { name: string; logo_url: string | null } | null }) {
  const agencyLogo = useSignedUrl(agency?.logo_url ?? null);
  const clientLogo = useSignedUrl(client?.logo_url ?? null);
  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0 text-foreground bg-background">
      <style>{`
        @media print {
          @page { margin: 18mm; }
          nav, header.app-nav { display: none !important; }
          .no-print { display: none !important; }
          section { break-inside: avoid; }
        }
      `}</style>

      <header className="mb-8 pb-5 border-b border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            {agency?.logo_url && <img src={agencyLogo ?? undefined} alt="" className="h-10 w-10 rounded-md object-cover bg-muted" />}
            <div className="text-sm font-semibold">{agency?.name || ""}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-right">{client?.name || ""}</div>
            {client?.logo_url && <img src={clientLogo ?? undefined} alt="" className="h-10 w-10 rounded-md object-cover bg-muted" />}
          </div>
        </div>
        <div className="text-xs uppercase tracking-widest text-accent">Raport lunar</div>
        <h1 className="text-3xl font-bold mt-1">{r.title}</h1>
        <div className="text-sm text-muted-foreground mt-1">{formatPeriod(r.period_start, r.period_end)}</div>
      </header>

      {r.summary && (
        <section className="mb-7">
          <h2 className="text-lg font-bold mb-2">Rezumat</h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{r.summary}</p>
        </section>
      )}

      {r.metrics && Object.keys(r.metrics).length > 0 && (
        <section className="mb-7">
          <h2 className="text-lg font-bold mb-3">Snapshot metrici</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(r.metrics).map(([k, v]) => (
              <div key={k} className="border border-border rounded-xl p-3">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{formatMetricKey(k)}</div>
                <div className="text-base font-bold mt-1">{String(v)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(r.highlights || []).length > 0 && (
        <section className="mb-7">
          <h2 className="text-lg font-bold mb-2">Momente cheie</h2>
          <ul className="list-disc pl-5 space-y-1 text-[15px]">{r.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </section>
      )}

      {(r.recommendations || []).length > 0 && (
        <section className="mb-7">
          <h2 className="text-lg font-bold mb-2">Recomandări</h2>
          <ul className="list-disc pl-5 space-y-1 text-[15px]">{r.recommendations.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </section>
      )}

      <footer className="mt-10 pt-4 border-t border-border text-xs text-muted-foreground flex justify-between">
        <span>Generat de {agency?.name || "agenție"}</span>
        <span>{new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}</span>
      </footer>
    </div>
  );
}
