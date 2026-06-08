# Content Calendar UX upgrade

No schema changes. Touches `Calendar.tsx`, `MonthCalendar.tsx`, and adds 3 small components.

## 1. Quick-add popover on day click

New `src/components/content/QuickAddPopover.tsx`:
- `Popover` anchored to the clicked day cell.
- Fields: Client (Select), Title (Input, autofocused), Platform (Select), Status (Select, default `idea`).
- `Create` button → `INSERT` into `content_posts` with `scheduled_for = <day>T10:00`, `content_type` defaulting to `Reel`, agency_id + filter defaults.
- "More details" link → closes popover, opens the existing `ContentEditor` sheet prefilled with the same values (or, once created, in edit mode for the new row).
- Esc / outside click closes.

`MonthCalendar` change: `onDayClick(date, anchorEl)` — pass the cell element so the popover can anchor. Calendar.tsx owns popover open state + selected day.

## 2. Compact status-colored chips with platform icon

New `src/lib/platformIcons.tsx` mapping `instagram|tiktok|facebook|youtube|linkedin` to Lucide icons (Instagram, Music2 for TikTok, Facebook, Youtube, Linkedin).

`MonthCalendar` day cell rewrite:
- Each item rendered as a chip: `[icon] title` truncated, height ~20px, status background via `statusMeta(...).color`, left-border 2px in same color for clarity.
- Show first 3, then `+N more` button → clicking opens a small popover listing all items for that day (chips, click → ContentEditor).
- Drag-to-reschedule preserved (chip is the draggable element).

## 3. View toggle: Month / Week / List

Top toolbar: `ToggleGroup` with Month/Week/List. Stored in URL `?view=month|week|list` so refresh keeps state.

- **Month**: existing `MonthCalendar`.
- **Week**: new `WeekCalendar.tsx`. 7 columns × full week of `month` (uses current `month` state as cursor). Same chip rendering, same drag/drop, same quick-add on day click. Prev/Next arrows shift by 7 days instead of 1 month.
- **List**: new `UpcomingList.tsx`. Sortable table with columns: Date, Client, Title, Platform, Status. Sortable by Date asc/desc (default), Client, Status. Click row → ContentEditor. Range: from today, 60 days forward (same filters apply).

Cursor label adapts: month name for Month, "Week of …" for Week; List ignores cursor.

## 4. Filters + drag/drop + mobile

- Existing Client/Platform/Status filters unchanged, apply across all three views.
- Drag-to-reschedule kept in Month and Week (List skips it — not meaningful).
- Mobile: toolbar wraps; toggle group full width on `<sm`; day cells already responsive; Week view becomes vertical scroll on narrow screens (`grid-cols-7` with `min-w` per column inside an `overflow-x-auto`); chips remain readable; quick-add Popover already mobile-friendly via Radix.

## Files

- edit `src/pages/agency/Calendar.tsx` — view state, toolbar toggle, popover plumbing
- edit `src/components/content/MonthCalendar.tsx` — chips + icons + +N more popover, onDayClick signature
- new `src/components/content/WeekCalendar.tsx`
- new `src/components/content/UpcomingList.tsx`
- new `src/components/content/QuickAddPopover.tsx`
- new `src/lib/platformIcons.tsx`

## Verification

- Click an empty day → quick-add popover, 4 fields, Create makes the row appear instantly as a chip.
- "More details" opens full editor with values prefilled.
- Day with 5 items shows 3 chips + "+2 more"; clicking expands list popover.
- Toggle Week → 7-day grid, drag a chip across days reschedules.
- Toggle List → table of upcoming, click header re-sorts, click row opens editor.
- Mobile (375px): toolbar wraps, calendar/list scroll, popovers fit screen.
