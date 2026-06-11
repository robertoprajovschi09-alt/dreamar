import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, ExternalLink } from "lucide-react";
import { engagementRate, fmtNum, fmtPct, recommendationMeta } from "@/lib/performance";

interface Props {
  videos: any[];
  onEdit?: (id: string) => void;
  showClient?: boolean;
}

export function VideosTable({ videos, onEdit, showClient }: Props) {
  if (videos.length === 0) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Niciun video urmărit încă.</CardContent></Card>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left p-2.5">Hook / Dată</th>
            {showClient && <th className="text-left p-2.5">Client</th>}
            <th className="text-left p-2.5">Platform</th>
            <th className="text-right p-2.5">Vizualizări</th>
            <th className="text-right p-2.5">Acoperire</th>
            <th className="text-right p-2.5">ER</th>
            <th className="text-right p-2.5">Comp.</th>
            <th className="text-right p-2.5">Apeluri/Mesaje</th>
            <th className="text-left p-2.5">Reco</th>
            <th className="text-right p-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v) => {
            const er = engagementRate(v);
            const reco = recommendationMeta(v.recommendation);
            return (
              <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-2.5">
                  <div className="font-medium truncate max-w-[260px]">{v.hook || v.video_url || "Untitled"}</div>
                  <div className="text-[11px] text-muted-foreground">{v.publish_date ? new Date(v.publish_date).toLocaleDateString() : "—"} · {v.format || "—"}</div>
                </td>
                {showClient && <td className="p-2.5 text-xs">{v.clients?.name || "—"}</td>}
                <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">{v.platform || "—"}</Badge></td>
                <td className="p-2.5 text-right font-mono">{fmtNum(v.views)}</td>
                <td className="p-2.5 text-right font-mono">{fmtNum(v.reach)}</td>
                <td className="p-2.5 text-right font-mono">{fmtPct(er)}</td>
                <td className="p-2.5 text-right font-mono">{fmtPct(v.completion_rate)}</td>
                <td className="p-2.5 text-right font-mono">{fmtNum((v.calls || 0) + (v.dms || 0))}</td>
                <td className="p-2.5">{v.recommendation && <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${reco.color}`}>{reco.label}</span>}</td>
                <td className="p-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    {v.video_url && <a href={v.video_url} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
                    {onEdit && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(v.id)}><Edit2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
