export const NICHES = [
  { value: "real_estate", label: "Imobiliare" },
  { value: "restaurant", label: "Restaurante" },
  { value: "beauty", label: "Frumusețe / Estetică" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "fitness", label: "Fitness / Coaching" },
  { value: "medical", label: "Medical / Clinici" },
  { value: "dental", label: "Stomatologie" },
  { value: "education", label: "Educație" },
  { value: "auto", label: "Auto" },
  { value: "legal", label: "Juridic" },
  { value: "finance", label: "Financiar" },
  { value: "hospitality", label: "Hoteluri / Ospitalitate / Turism" },
  { value: "custom", label: "Personalizat" },
] as const;

export type NicheValue = typeof NICHES[number]["value"];

export const STATUSES = ["active", "onboarding", "paused", "churned", "prospect"] as const;

export const STATUS_LABELS: Record<string, string> = {
  active: "activ",
  onboarding: "onboarding",
  paused: "pe pauză",
  churned: "pierdut",
  prospect: "prospect",
};

export function statusLabel(s: string | null | undefined) {
  if (!s) return "—";
  return STATUS_LABELS[s] ?? s;
}

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "website", label: "Website" },
  { value: "other", label: "Altele" },
] as const;

export const GOAL_STATUSES = [
  { value: "in_progress", label: "În desfășurare" },
  { value: "at_risk", label: "Cu risc" },
  { value: "achieved", label: "Atins" },
  { value: "missed", label: "Ratat" },
] as const;

export function nicheLabel(v: string | null | undefined) {
  return NICHES.find((n) => n.value === v)?.label ?? v ?? "—";
}

export function displayNiche(niche: string | null | undefined, custom?: string | null) {
  if (niche === "custom" && custom && custom.trim()) return custom.trim();
  return nicheLabel(niche);
}
