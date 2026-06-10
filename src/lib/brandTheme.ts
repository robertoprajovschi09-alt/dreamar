// Brand theming helpers: derive CSS variables from a client's brand_color hex.
// Variables are scoped to a wrapper element via inline style — they don't leak globally.

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return { h: Math.round(hh * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function brandStyle(brandColor?: string | null): React.CSSProperties {
  const hsl = brandColor ? hexToHsl(brandColor) : null;
  if (!hsl) return {};
  const base = `${hsl.h} ${Math.min(100, Math.max(20, hsl.s))}% ${hsl.l}%`;
  const fg = hsl.l > 60 ? "0 0% 10%" : "0 0% 100%";
  const soft = `${hsl.h} ${Math.min(80, hsl.s)}% 95%`;
  return {
    // CSS vars consumed by `var(--brand)` etc. in this subtree
    ["--brand" as any]: base,
    ["--brand-foreground" as any]: fg,
    ["--brand-soft" as any]: soft,
    ["--accent" as any]: base,
    ["--accent-foreground" as any]: fg,
  };
}

export function brandInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
}
