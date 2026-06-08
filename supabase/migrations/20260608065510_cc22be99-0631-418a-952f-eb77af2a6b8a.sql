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