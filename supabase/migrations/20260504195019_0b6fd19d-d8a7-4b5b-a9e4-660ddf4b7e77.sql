
-- 1. Allow bypass via session flag
CREATE OR REPLACE FUNCTION public.lock_profile_role_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_profile_lock', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NOT public.is_saas_admin(auth.uid()) THEN
    NEW.role := OLD.role;
    NEW.agency_id := OLD.agency_id;
    NEW.client_id := OLD.client_id;
    NEW.is_saas_admin := OLD.is_saas_admin;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. accept_client_invite: bypass lock + cleanup parasite agency
CREATE OR REPLACE FUNCTION public.accept_client_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv RECORD;
  _old_agency uuid;
  _other_members int;
  _other_clients int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.client_invites WHERE token = _token;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invalid invite token'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.client_invites SET status='expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  -- Capture any auto-created agency we may need to clean up
  SELECT agency_id INTO _old_agency FROM public.profiles WHERE id = _uid;

  INSERT INTO public.client_users (agency_id, client_id, user_id, email, role, status)
  VALUES (_inv.agency_id, _inv.client_id, _uid, COALESCE(_email, _inv.email), 'client_viewer', 'active')
  ON CONFLICT (client_id, user_id) DO UPDATE SET status = 'active';

  -- Bypass the lock trigger for this transaction
  PERFORM set_config('app.bypass_profile_lock', 'on', true);

  INSERT INTO public.profiles (id, email, role, agency_id, client_id)
  VALUES (_uid, _email, 'client_viewer', _inv.agency_id, _inv.client_id)
  ON CONFLICT (id) DO UPDATE SET
    role = 'client_viewer',
    agency_id = EXCLUDED.agency_id,
    client_id = EXCLUDED.client_id;

  PERFORM set_config('app.bypass_profile_lock', 'off', true);

  UPDATE public.client_invites SET status='accepted' WHERE id = _inv.id;

  -- Cleanup: if old_agency was a parasite (auto-created, no other members, no clients), remove it
  IF _old_agency IS NOT NULL AND _old_agency <> _inv.agency_id THEN
    SELECT COUNT(*) INTO _other_members FROM public.agency_members
      WHERE agency_id = _old_agency AND user_id <> _uid;
    SELECT COUNT(*) INTO _other_clients FROM public.clients WHERE agency_id = _old_agency;
    IF _other_members = 0 AND _other_clients = 0 THEN
      DELETE FROM public.agency_members WHERE agency_id = _old_agency;
      DELETE FROM public.subscriptions WHERE agency_id = _old_agency;
      DELETE FROM public.agencies WHERE id = _old_agency;
    END IF;
  END IF;

  RETURN _inv.client_id;
END;
$$;

-- 3. handle_new_user: skip agency auto-creation when invite_token is present
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _agency_id uuid;
  _slug text;
  _name text;
  _has_invite boolean;
BEGIN
  _has_invite := (NEW.raw_user_meta_data ? 'invite_token')
                 AND COALESCE(NEW.raw_user_meta_data->>'invite_token', '') <> '';

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    CASE WHEN _has_invite THEN NULL::app_role ELSE 'agency_owner'::app_role END
  )
  ON CONFLICT (id) DO NOTHING;

  IF _has_invite THEN
    RETURN NEW;
  END IF;

  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)) || '''s Agency';
  _slug := lower(regexp_replace(_name, '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  BEGIN
    INSERT INTO public.agencies (name, slug, created_by, plan)
    VALUES (_name, _slug, NEW.id, 'starter')
    RETURNING id INTO _agency_id;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (_agency_id, NEW.id, 'agency_owner')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.subscriptions (agency_id, plan, status, trial_end)
    VALUES (_agency_id, 'starter', 'trialing', now() + interval '14 days')
    ON CONFLICT DO NOTHING;

    PERFORM set_config('app.bypass_profile_lock', 'on', true);
    UPDATE public.profiles SET agency_id = _agency_id WHERE id = NEW.id;
    PERFORM set_config('app.bypass_profile_lock', 'off', true);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;
