import { useEffect, useState } from "react";
import { getPostVideoUrl, type PostAssetLike } from "@/lib/approvals";
import { Loader2, Video } from "lucide-react";

interface Props {
  post: PostAssetLike | null | undefined;
  className?: string;
  poster?: string | null;
}

export function ApprovalVideoPlayer({ post, className, poster }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPostVideoUrl(post)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [post]);

  if (loading) {
    return (
      <div className={"flex items-center justify-center bg-muted rounded-2xl aspect-video " + (className || "")}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!url) {
    if (poster) {
      return (
        <img
          src={poster}
          alt=""
          className={"w-full rounded-2xl object-cover aspect-video bg-muted " + (className || "")}
        />
      );
    }
    return (
      <div className={"flex flex-col items-center justify-center gap-2 bg-muted rounded-2xl aspect-video text-muted-foreground text-xs " + (className || "")}>
        <Video className="h-6 w-6" />
        No video attached
      </div>
    );
  }
  return (
    <video
      controls
      preload="metadata"
      poster={poster || undefined}
      className={"w-full rounded-2xl bg-black aspect-video " + (className || "")}
      src={url}
    />
  );
}
