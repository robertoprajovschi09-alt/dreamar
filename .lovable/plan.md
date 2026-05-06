## Goal

Add a **Client Quick Check-In** flow — one single page (not 4), under 2 minutes — accessible from the Client Portal once per month. The 7 standard questions are stored as structured data the agency can read on the client's profile.

## What changes

### 1. New component — `src/components/client/ClientQuickCheckIn.tsx`

Single-page form with 7 sections, validated with `zod`:

1. **Prioritate** — chip selector (`more_leads`, `more_sales`, `more_bookings`, `more_awareness`, `more_engagement`, `promote_specific`, `other`). If `other`, show free-text input.
2. **Ce promovăm** — single short text input.
3. **Rezultate observate** — chips: Da / Nu / Nu știu. If "Da", show **niche-aware** numeric inputs:
   - `real_estate`: leads, viewings, messages, calls, price_inquiries
   - `restaurant`: bookings, foot_traffic, messages, calls, new_clients
   - `dental`: appointments, calls, messages, new_clients, price_inquiries
   - `fitness`: new_clients, bookings, messages, calls
   - `ecommerce`: sales, leads, messages, price_inquiries
   - default: leads, sales, bookings, appointments, calls, messages, new_clients, foot_traffic, price_inquiries
   
   Plus a free "Alte rezultate" text field.
4. **Customer feedback** — short textarea (max 500).
5. **Important note** — short textarea (max 500).
6. **Satisfaction** — 1–5 button scale.
7. **Direction change** — radio list (`keep`, `more_education`, `more_sales`, `more_premium`, `more_personal`, `other`). If `other`, show input.

Validation: zod schema with length caps + required fields. Submit button disabled while saving. Shows "Sub 2 minute" badge.

### 2. Persistence — reuse `client_feedback` (no migration needed)

The existing `client_feedback` table already has the right RLS for client portal users (`client_feedback_write` policy: `submitted_by = auth.uid() AND is_client_viewer_of(...)`). We map fields:

- `month` → first day of current month
- `feedback_text` ← customer feedback
- `real_life_impact` ← important note
- `promote_next_month` ← Q2 answer
- `calls_received` ← `metrics.calls`
- `messages_received` ← `metrics.messages`
- `bookings` ← `metrics.bookings ?? metrics.appointments`
- `sales_estimate` ← `metrics.sales`
- `objections` ← JSON-stringified full check-in payload (`{ kind: "quick_check_in", v: 1, priority, priority_other, promote_focus, results_observed, results_metrics, customer_feedback, important_note, satisfaction, direction_change, direction_change_other }`)

This keeps the dedicated columns useful for existing reports/queries while the JSON in `objections` carries the full structured answer for the agency UI.

**One check-in per month** is enforced UI-side: on mount, query `client_feedback` for current month + this client; if a row exists, show a "deja completat" state with a link back to the dashboard. (Hard DB uniqueness would need a migration; we keep it soft for now.)

### 3. Wiring into the portal

Edit `src/pages/client/ClientPortal.tsx`:
- Add a new tab **"Check-in"** (between Overview and Calendar) rendering `<ClientQuickCheckIn />`.
- Surface a **"Start monthly check-in"** call-to-action card on the Overview/`ClientDashboard` when no check-in exists for the current month — clicking it switches to the Check-in tab. Once submitted, the user lands directly on the dashboard (`onDone` switches the tab back to `overview`).

`ClientDashboard` already runs an "is there a check-in this month?" query; we add a tiny Card at the top with a CTA when missing.

### 4. Agency-side visibility (light touch)

`src/pages/agency/ClientProfile.tsx` already has feedback read access via `client_feedback_read` policy. Add a small **"Latest monthly check-in"** card (new file `src/components/client/LatestCheckInCard.tsx`) that fetches the most recent `client_feedback` row, attempts `JSON.parse(objections)`, and if it's `kind === "quick_check_in"` renders a clean structured view (priority chip, promote focus, satisfaction stars, direction, metrics table, notes). Fallback: render the raw fields as today.

## Files

**New**
- `src/components/client/ClientQuickCheckIn.tsx`
- `src/components/client/LatestCheckInCard.tsx`

**Edit**
- `src/pages/client/ClientPortal.tsx` (new tab + CTA wiring)
- `src/components/client/ClientDashboard.tsx` (CTA card when monthly check-in missing)
- `src/pages/agency/ClientProfile.tsx` (mount `LatestCheckInCard`)

## Multi-tenant & security

- All inserts set `agency_id`, `client_id`, `submitted_by = auth.uid()` from `useUser()` context — never from URL params.
- Inputs validated with zod (length caps, required fields, numeric coercion). No `dangerouslySetInnerHTML`.
- Existing `client_feedback` RLS already restricts inserts to active client_users of that client; no policy changes needed.
- The structured JSON stored in `objections` is sanitized (only known keys, numbers coerced via `Number()`, strings length-capped).

## Out of scope

- New `client_check_ins` table + dedicated RPCs (would require a migration; reusing `client_feedback` is sufficient and matches existing agency reporting).
- Email notifications to the agency on submit.
- Historical comparison / trend chart of check-ins (can come later from the same data).
