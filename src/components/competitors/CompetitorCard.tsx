import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Instagram, Music2, Facebook, Youtube, Linkedin, Eye, Pencil, Trash2 } from "lucide-react";
import type { Competitor } from "@/lib/competitors";

type Props = {
  competitor: Competitor;
  observationCount: number;
  lastObserved?: string | null;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function SocialLink({ url, icon: Icon }: { url: string | null; icon: any }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
      <Icon className="h-4 w-4" />
    </a>
  );
}

export function CompetitorCard({ competitor: c, observationCount, lastObserved, onOpen, onEdit, onDelete }: Props) {
  return (
    <Card className="p-4 cursor-pointer hover:border-primary/50 transition" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{c.name}</div>
          {c.niche && <Badge variant="secondary" className="mt-1">{c.niche}</Badge>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <SocialLink url={c.website} icon={Globe} />
        <SocialLink url={c.instagram_url} icon={Instagram} />
        <SocialLink url={c.tiktok_url} icon={Music2} />
        <SocialLink url={c.facebook_url} icon={Facebook} />
        <SocialLink url={c.youtube_url} icon={Youtube} />
        <SocialLink url={c.linkedin_url} icon={Linkedin} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
        <span>{observationCount} observation{observationCount === 1 ? "" : "s"}</span>
        {lastObserved && <span>Last: {new Date(lastObserved).toLocaleDateString()}</span>}
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3" onClick={(e) => { e.stopPropagation(); onOpen(); }}><Eye className="h-3.5 w-3.5 mr-1" />Open</Button>
    </Card>
  );
}
