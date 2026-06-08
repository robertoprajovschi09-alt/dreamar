import { Instagram, Music2, Facebook, Youtube, Linkedin, Globe, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  instagram: Instagram,
  tiktok: Music2,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
};

export function platformIcon(platform?: string | null): LucideIcon {
  if (!platform) return Globe;
  return MAP[platform.toLowerCase()] || Globe;
}
