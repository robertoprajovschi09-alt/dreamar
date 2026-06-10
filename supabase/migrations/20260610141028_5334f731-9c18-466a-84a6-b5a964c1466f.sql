
-- Defense-in-depth: never auto-create an agency for a client-invite signup,
-- and refuse explicit agency creation when a pending client invite exists for the email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _agency_id uuid;
  _slug text;
  _name text;
  _has_invite boolean;
  _signup_type text;
  _has_pending_client_invite boolean;
BEGIN
  _signup_type := COALESCE(NEW.raw_user_meta_data->>'signup_type','');

  _has_invite := (
    (NEW.raw_user_meta_data ? 'invite_token' AND COALESCE(NEW.raw_user_meta_data->>'invite_token','') <> '')
    OR
    (NEW.raw_user_meta_data ? 'team_invite_token' AND COALESCE(NEW.raw_user_meta_data->>'team_invite_token','') <> '')
    OR _signup_type IN ('client_invite','team_invite')
  );

  _has_pending_client_invite := EXISTS (
    SELECT 1 FROM public.client_invites
    WHERE lower(email) = lower(NEW.email)
      AND status IN ('pending','sent','opened')
      AND expires_at > now()
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    CASE WHEN _has_invite OR _has_pending_client_invite THEN NULL::app_role ELSE 'agency_owner'::app_role END
  )
  ON CONFLICT (id) DO NOTHING;

  IF _has_invite OR _has_pending_client_invite THEN RETURN NEW; END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.create_agency_for_current_user(_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _agency_id uuid;
  _slug text;
  _existing uuid;
  _has_pending_client_invite boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT agency_id INTO _existing FROM public.profiles WHERE id = _uid;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

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

  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  _has_pending_client_invite := EXISTS (
    SELECT 1 FROM public.client_invites
    WHERE lower(email) = lower(_email)
      AND status IN ('pending','sent','opened')
      AND expires_at > now()
  );
  IF _has_pending_client_invite THEN
    RAISE EXCEPTION 'Există o invitație de client activă pentru acest email. Acceptă invitația în loc să creezi agenție.';
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
$function$;
