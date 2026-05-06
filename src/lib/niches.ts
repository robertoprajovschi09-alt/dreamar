export const NICHES = [
  { value: "real_estate", label: "Real estate" },
  { value: "restaurant", label: "Restaurant" },
  { value: "beauty", label: "Beauty / Salon / Clinic" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "fitness", label: "Fitness / Gym / Coach" },
  { value: "dental", label: "Dental" },
  { value: "custom", label: "Custom" },
] as const;

export type NicheValue = typeof NICHES[number]["value"];

export const STATUSES = ["active", "paused", "churned", "prospect"] as const;

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

export const GOAL_STATUSES = [
  { value: "in_progress", label: "In progress" },
  { value: "at_risk", label: "At risk" },
  { value: "achieved", label: "Achieved" },
  { value: "missed", label: "Missed" },
] as const;

export function nicheLabel(v: string | null | undefined) {
  return NICHES.find((n) => n.value === v)?.label ?? v ?? "—";
}

export function displayNiche(niche: string | null | undefined, custom?: string | null) {
  if (niche === "custom" && custom && custom.trim()) return custom.trim();
  return nicheLabel(niche);
}
