## Admin actions on agency rows

### 1. Migration — `admin_delete_agency` RPC

```sql
CREATE OR REPLACE FUNCTION public.admin_delete_agency(_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_saas_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Detach client-portal users so their profiles aren't orphan-locked
  UPDATE public.profiles
    SET client_id = NULL, agency_id = NULL, role = NULL
    WHERE client_id IN (SELECT id FROM public.clients WHERE agency_id = _agency_id);
  UPDATE public.profiles
    SET agency_id = NULL, role = NULL
    WHERE agency_id = _agency_id;

  -- Delete agency-scoped data. Most child tables already FK-cascade from
  -- agencies/clients, but we delete explicitly to be safe across tables
  -- that may use ON DELETE RESTRICT.
  DELETE FROM public.client_invites      WHERE agency_id = _agency_id;
  DELETE FROM public.client_users        WHERE agency_id = _agency_id;
  DELETE FROM public.clients             WHERE agency_id = _agency_id;
  DELETE FROM public.agency_members      WHERE agency_id = _agency_id;
  DELETE FROM public.subscriptions       WHERE agency_id = _agency_id;
  DELETE FROM public.agencies            WHERE id = _agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_agency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_agency(uuid) TO authenticated;
```

Relies on existing ON DELETE CASCADE foreign keys from `clients` / `agencies` to clean up content, tasks, campaigns, briefs, kpi schemas, etc. The internal `is_saas_admin` check is the security boundary.

### 2. `src/pages/admin/AdminDashboard.tsx`

Replace the lone Suspend button in the Actions cell with a `DropdownMenu` containing:

- **Open agency** — `navigate(\`/agency/clients?agency=${a.id}\`)` (just routes the admin into the existing agency UI; admin role is allowed by `RoleRoute` already).
- **Rename** — opens a `Dialog` with an `Input` prefilled with current name. On save: `supabase.from("agencies").update({ name }).eq("id", a.id)` → toast → `load()`.
- **Change plan** — submenu / inline `Select` with `starter | growth | unlimited | white_label`. On change: `update({ plan }).eq("id", a.id)` → `load()`.
- **Suspend / Reactivate** — existing `toggleSuspend`, moved into the menu.
- **Delete agency** — destructive item that opens an `AlertDialog`; user must type the agency name into an `Input`. Delete button stays disabled until `typed === a.name`. On confirm: `supabase.rpc("admin_delete_agency", { _agency_id: a.id })` → toast → `load()`.

State additions: `renameTarget`, `deleteTarget`, `deleteConfirmText`. All actions guard with the existing `busy` per-row spinner and call `load()` on success.

UI uses existing shadcn primitives: `dropdown-menu`, `dialog`, `alert-dialog`, `select`, `input`. No design-token changes.

### Out of scope

- Server-side RLS for plan/name updates: the existing agencies RLS already allows owners/admins to update; the page is already gated by `profile.is_saas_admin`, matching the current Suspend pattern.
- Audit log of admin actions.
