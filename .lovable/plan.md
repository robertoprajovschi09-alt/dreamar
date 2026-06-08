## Fix: signups don't create their own agency

### 1. Migration — make `create_agency_for_current_user` also set the caller's profile

Rewrite the function so a single RPC call gives the caller a fully-wired agency owner profile, and makes the call idempotent:

```sql
CREATE OR REPLACE FUNCTION public.create_agency_for_current_user(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _agency_id uuid;
  _slug text;
  _existing uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotent: if profile already has an agency, return it
  SELECT agency_id INTO _existing FROM public.profiles WHERE id = _uid;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  -- Idempotent fallback: if user is already a member of any agency, reuse it
  SELECT agency_id INTO _existing
  FROM public.agency_members WHERE user_id = _uid
  ORDER BY created_at ASC LIMIT 1;
  IF _existing IS NOT NULL THEN
    PERFORM set_config('app.bypass_profile_lock', 'on', true);
    UPDATE public.profiles
      SET role = COALESCE(role, 'agency_owner'::app_role),
          agency_id = _existing
      WHERE id = _uid;
    PERFORM set_config('app.bypass_profile_lock', 'off', true);
    RETURN _existing;
  END IF;

  _slug := lower(regexp_replace(coalesce(_name,'agency'),'[^a-zA-Z0-9]+','-','g'))
           || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

  INSERT INTO public.agencies (name, slug, created_by, plan)
  VALUES (coalesce(nullif(trim(_name),''),'My Agency'), _slug, _uid, 'starter')
  RETURNING id INTO _agency_id;

  INSERT INTO public.agency_members (agency_id, user_id, role)
  VALUES (_agency_id, _uid, 'agency_owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (agency_id, plan, status, trial_end)
  VALUES (_agency_id, 'starter', 'trialing', now() + interval '14 days')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('app.bypass_profile_lock', 'on', true);
  UPDATE public.profiles
    SET role = 'agency_owner'::app_role,
        agency_id = _agency_id
    WHERE id = _uid;
  PERFORM set_config('app.bypass_profile_lock', 'off', true);

  RETURN _agency_id;
END;
$$;
```

No enum / table changes. `handle_new_user` is left as-is — the RPC is now the authoritative path.

### 2. `src/pages/Auth.tsx` — call the RPC after signup

- **Email sign-up (`handleSignUp`)**: after `supabase.auth.signUp` succeeds, poll briefly for a session (signups with email confirmation off return a session immediately; if confirmation is on, skip RPC and show the existing toast). When a session exists:
  1. `await supabase.rpc('create_agency_for_current_user', { _name: \`${fullName}'s Agency\` })`
  2. trigger a profile/user-context refresh (use `useUser().refresh` — add it to the destructure)
  3. `navigate('/agency')`
- **Google OAuth (`handleGoogle`)**: the redirect lands back on `/agency` with a fresh session. To cover the "first Google sign-in has no agency yet" case, add a small effect at the top of `Auth.tsx` that, when `user && profile && !profile.agency_id && !profile.client_id`, calls the same RPC then `refresh()` — this fires on the post-redirect render before the `Navigate` to `roleHome`.
- Keep the existing `Navigate` redirect — once `profile.role` is set by the RPC + refresh, it routes to `/agency` automatically.

### 3. Idempotency

Guaranteed by the function: early-returns if `profiles.agency_id` is set, or if an `agency_members` row exists. The frontend can call it freely on every fresh signup/login without risking a duplicate agency.

### Out of scope

- `handle_new_user` trigger (unchanged — its agency-creation branch becomes redundant but harmless given the idempotency check).
- Invite acceptance flow (unchanged — `_has_invite` short-circuit still skips agency creation).
- Routing, `RoleRoute`, `roleHome` — unchanged.
