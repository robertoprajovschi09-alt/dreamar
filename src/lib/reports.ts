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
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
] as const;

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
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}
