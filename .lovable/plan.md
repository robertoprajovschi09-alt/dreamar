# Fix: protect agency accounts from being demoted by invite acceptance

A single SQL migration file under `supabase/migrations/` replacing two RPCs. No other files touched.

## Changes to `public.accept_client_invite(_token text)`

At the very top, after resolving `_uid` and the user's email:

1. **Block agency accounts.** If the caller is already in `agency_members`, OR `profiles.role` ∈ `('agency_owner','agency_team','saas_admin')`, OR `profiles.is_saas_admin = true`:
   - `RAISE EXCEPTION 'Acest cont este deja un cont de agenție. Nu poți accepta o invitație de client cu el — folosește un alt email pentru contul de client.'`
   - No writes to `profiles`, `client_users`, `agencies`, or anywhere else.

2. **Email match check.** After loading the invite, require `lower(_email) = lower(_inv.email)`. Otherwise:
   - `RAISE EXCEPTION 'Această invitație a fost trimisă către alt email. Loghează-te cu emailul invitat.'`

3. **Never downgrade role.** Keep the existing `client_users` upsert and invite-status update, but in the `profiles` upsert use:
   - `INSERT ... ON CONFLICT (id) DO UPDATE SET role = COALESCE(public.profiles.role, EXCLUDED.role), agency_id = EXCLUDED.agency_id, client_id = EXCLUDED.client_id` — so if a row somehow exists with a role already, it is preserved. (In practice step 1 already rejects agency roles; this is defense in depth.)

4. **Local bypass flag.** Switch both `set_config('app.bypass_profile_lock', 'on'/'off', true)` calls to use the third arg `true` (already true today — verified) AND wrap the write in a way that always restores `'off'` even on error path inside this RPC. Concretely: set `'on'` immediately before the profiles upsert, set `'off'` immediately after. (Already local-scoped via the `true` arg, so this is just a tidy-up.)

5. **Keep** the existing "clean up old solo agency" branch unchanged — it only runs when `_old_agency <> _inv.agency_id` AND the old agency has zero other members and zero clients, which cannot happen for a real agency account because step 1 already rejected.

## Changes to `public.accept_team_invite(_token text)`

Same shape, lighter:

1. **Email match check** identical to above.
2. **Don't wipe `client_id` for non-client roles silently** — keep current behavior of setting `client_id = NULL` because team membership is genuinely incompatible with being a client viewer, but add the email guard so a stranger cannot hijack.
3. No "block agency accounts" rule here — accepting a team invite as an existing agency user is legitimate (the function already handles old-agency cleanup).
4. Tidy the `set_config` calls the same way.

## Migration file

`supabase/migrations/<timestamp>_harden_accept_invite_rpcs.sql` containing two `CREATE OR REPLACE FUNCTION` statements (same signatures, same `SECURITY DEFINER`, same `search_path = public`). No table/policy changes. No data migration.

## Verification (manual, after migration runs)

- Agency owner logged in → calls `accept_client_invite` with a valid token → gets the Romanian error, `profiles.role` unchanged, no row inserted in `client_users`.
- Fresh user matching invite email → accepts normally, becomes `client_viewer`.
- Any user with mismatched email → gets the email-mismatch error.
