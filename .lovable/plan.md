# Fix: Agency Settings save doesn't take effect

Three root causes; one migration + two small frontend edits.

## 1. RLS — allow owner/member to UPDATE agency

Current `agencies_owner_update` policy only checks `is_owner_of(...) OR is_saas_admin(...)`, has a USING clause but **no WITH CHECK**, so updates by non-owner members (and even owners in some flows) silently fail.

New migration replaces it with:

```sql
DROP POLICY IF EXISTS agencies_owner_update ON public.agencies;

CREATE POLICY agencies_owner_update ON public.agencies
FOR UPDATE TO authenticated
USING (
  is_member_of(auth.uid(), id)
  OR created_by = auth.uid()
  OR is_saas_admin(auth.uid())
)
WITH CHECK (
  is_member_of(auth.uid(), id)
  OR created_by = auth.uid()
  OR is_saas_admin(auth.uid())
);
```

(Keeps existing read/create/delete policies as-is.)

## 2. Refresh UserContext after save

In `src/pages/agency/Settings.tsx`:

- Pull `refresh` from `useUser()`.
- After successful `supabase.from("agencies").update(...)`, `await refresh()` before showing the success toast.

This makes the new name appear instantly in the header (`AgencyLayout` reads `agency?.name` from context) and triggers the color effect below.

## 3. Apply `agency.brand_color` to the `--accent` CSS token

The design system reads `--accent` (and `--accent-glow`, `--accent-foreground`, `--ring`) as HSL triplets (e.g. `354 85% 56%`). The stored `brand_color` is a hex string like `#E11D2E`.

Add a small effect in `src/components/AgencyLayout.tsx` (the only place wrapping all agency pages):

```tsx
useEffect(() => {
  const root = document.documentElement;
  const hex = agency?.brand_color?.trim();
  if (!hex) {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-glow");
    root.style.removeProperty("--ring");
    return;
  }
  const hsl = hexToHslTriplet(hex);            // "354 85% 56%"
  const glow = adjustLightness(hsl, +8);       // brighter variant
  root.style.setProperty("--accent", hsl);
  root.style.setProperty("--accent-glow", glow);
  root.style.setProperty("--ring", hsl);
}, [agency?.brand_color]);
```

Helpers `hexToHslTriplet` and `adjustLightness` go in a new tiny module `src/lib/color.ts` (pure functions, no deps). On unmount / no agency, properties are removed so the default red from `index.css` takes over (fallback).

Result: changing the color picker + Save → context refreshes → effect re-runs → entire UI accent recolors immediately, no reload.

## Files touched

- `supabase/migrations/<new>.sql` — RLS policy replacement
- `src/lib/color.ts` — new (hex → HSL triplet helpers)
- `src/pages/agency/Settings.tsx` — call `refresh()` after save
- `src/components/AgencyLayout.tsx` — `useEffect` applying `brand_color` to CSS vars

## Verification

1. Edit agency name → Save → header label updates without reload.
2. Pick a new brand color → Save → sidebar active border, accent dot, buttons, focus rings recolor instantly.
3. Clear color (or set back to `#E11D2E`) → defaults restored.
4. Non-owner agency member can also save (RLS no longer blocks).
