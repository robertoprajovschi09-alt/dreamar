# Tasks page UX upgrade

No schema changes. Edits `src/pages/agency/Tasks.tsx` and adds one tiny component.

## 1. Inline quick-add at top of each column

New `src/components/operations/QuickAddTaskInput.tsx`:
- Single `Input` with placeholder "Adaugă o sarcină…", subtle (dashed border, ghost).
- On Enter (non-empty): `INSERT` into `tasks` with
  `{ agency_id, title, status: <column.value>, priority: "medium", client_id: <filter or null>, assigned_to: <filter or null> }`.
- Optimistic local push, clear input, re-focus; refresh on error.

Mounted at the top of every kanban column (above the cards), so each column can seed any status (todo / in_progress / blocked / done).

## 2. Click card → quick-edit side panel

A new lightweight panel `QuickEditTaskSheet` (separate from the full `TaskEditor`, but in the same file or a new one — new one is cleaner). Fields only:
- Title (Input, inline)
- Status (Select — `TASK_STATUSES`)
- Priority (Select — `TASK_PRIORITIES`)
- Assignee (Select — members)
- Due date (shadcn date picker, single)
- "Editare completă" link button → opens existing `TaskEditor` (description, type, etc.)
- Delete button

Auto-save on change (debounced 400ms) OR a single "Salvează" button — I'll go with auto-save per field to feel fast (each Select change triggers an immediate `update`). Toast on error only.

Card `onClick` opens this panel instead of the full editor. Drag-and-drop between columns preserved (drag handlers stay on the Card; click + drag distinguished by `onDragStart`).

## 3. Denser cards

Card layout:
- Left vertical priority bar (2px, color from `TASK_PRIORITIES`).
- Title (medium, 2-line clamp).
- Row: client name pill (muted), task_type badge.
- Bottom row (only when present): due-date pill + small avatar.
  - Due date: `MMM d`. Overdue (`deadline < now()` AND status !== done) → red text + `AlertCircle` icon. Today → accent color. Else muted.
  - Assignee: shadcn `Avatar` 20px with initials, tooltip = full name.

Border hover keeps `border-accent`. Padding reduced to `p-2.5`.

## 4. Quick filters

Add a row of toggle pills (using `ToggleGroup multiple` or plain `Button` toggles):
- **My tasks** — `assigned_to === auth user.id`
- **Overdue** — `deadline < now()` AND `status !== done`
- **Priority**: `Select` (All / Urgent / High / Medium / Low) — or 4 chips; I'll use a single `Select` to save space.

Existing Client and Assignee selects stay. Layout wraps; on mobile filters collapse to 1 per row naturally with `flex-wrap`. Kanban already responsive (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).

## Files

- new `src/components/operations/QuickAddTaskInput.tsx`
- new `src/components/operations/QuickEditTaskSheet.tsx`
- edit `src/pages/agency/Tasks.tsx` — filters, quick-add at top of each column, click → quick edit, denser card, "Sarcină nouă" button still opens the full `TaskEditor`.

## Verification

- Type a title in the "To do" column input + Enter → card appears instantly under that column.
- Click any card → small panel slides in with the 5 quick fields; change Status → card moves columns; close.
- "Mai multe detalii" link in the quick panel opens the full editor with the same task.
- Overdue task shows red date + icon; done tasks never marked overdue.
- "My tasks" toggle filters to current user only; "Overdue" toggles overdue-only; Priority select narrows further (filters AND together).
- Drag a card from To do → Done, status updates server-side.
- 375px width: filters wrap, columns stack, quick-add input full width.
