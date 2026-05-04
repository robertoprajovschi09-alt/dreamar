import { PLATFORM_OPTIONS } from "./content";

export const VIDEO_PLATFORMS = PLATFORM_OPTIONS;

export const VIDEO_FORMATS = ["Reel", "TikTok", "Short", "Long-form", "Story", "Live", "Ad"] as const;

export const VIDEO_OBJECTIVES = [
  "Awareness", "Engagement", "Leads", "Sales", "Bookings", "Brand", "Education",
] as const;

export const RECOMMENDATIONS = [
  { value: "scale", label: "Scale", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { value: "iterate", label: "Iterate", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  { value: "kill", label: "Kill", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300" },
] as const;

export type Recommendation = typeof RECOMMENDATIONS[number]["value"];

export function recommendationMeta(v: string | null | undefined) {
  return RECOMMENDATIONS.find((r) => r.value === v) ?? { value: v ?? "", label: v ?? "—", color: "bg-muted text-foreground" };
}

export function engagementRate(v: { likes?: number | null; comments?: number | null; shares?: number | null; saves?: number | null; views?: number | null; reach?: number | null }) {
  const interactions = (v.likes || 0) + (v.comments || 0) + (v.shares || 0) + (v.saves || 0);
  const base = v.reach || v.views || 0;
  if (!base) return null;
  return (interactions / base) * 100;
}

export function fmtNum(n: number | null | undefined) {
  if (n == null || isNaN(n as number)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export function fmtPct(n: number | null | undefined, digits = 1) {
  if (n == null || isNaN(n as number)) return "—";
  return n.toFixed(digits) + "%";
}

export function sumField<T>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, r) => acc + (Number((r as any)[key]) || 0), 0);
}

export function nicheHasDedicatedTable(niche: string | null | undefined) {
  return ["real_estate", "restaurant", "dental", "fitness"].includes(niche || "");
}
