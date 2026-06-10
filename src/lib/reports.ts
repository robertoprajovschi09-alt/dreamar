export type Report = {
  id: string;
  agency_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  title: string;
  status: string;
  summary: string | null;
  highlights: string[];
  recommendations: string[];
  metrics: Record<string, number>;
  client_visible: boolean;
  created_at: string;
  updated_at: string;
};

export const REPORT_STATUSES = [
  { value: "draft", label: "Schiță" },
  { value: "ready", label: "Gata" },
  { value: "sent", label: "Trimis" },
] as const;

export function statusLabel(value: string) {
  return REPORT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function statusKind(value: string): "muted" | "success" | "info" {
  if (value === "ready") return "success";
  if (value === "sent") return "info";
  return "muted";
}

export function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { period_start: fmt(start), period_end: fmt(end) };
}

export function formatPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${s.toLocaleDateString("ro-RO", opts)} – ${e.toLocaleDateString("ro-RO", opts)}`;
}

export function formatMetricKey(key: string) {
  const map: Record<string, string> = {
    views: "Vizualizări",
    reach: "Reach",
    likes: "Aprecieri",
    comments: "Comentarii",
    shares: "Distribuiri",
    saves: "Salvări",
    calls: "Apeluri",
    dms: "Mesaje DM",
    estimated_sales: "Vânzări estimate",
    engagement_rate: "Engagement %",
    videos_count: "Videoclipuri",
    posts_count: "Postări",
  };
  return map[key] ?? key.replace(/_/g, " ");
}
