export const NICHES = [
  { value: "real_estate", label: "Real Estate" },
  { value: "restaurant", label: "Restaurants" },
  { value: "beauty", label: "Beauty / Aesthetics" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "fitness", label: "Fitness / Coaches" },
  { value: "medical", label: "Medical / Clinics" },
  { value: "dental", label: "Dental" },
  { value: "education", label: "Education" },
  { value: "auto", label: "Automotive" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "custom", label: "Custom" },
] as const;

export type NicheValue = typeof NICHES[number]["value"];

export const STATUSES = ["active", "onboarding", "paused", "churned", "prospect"] as const;

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
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
