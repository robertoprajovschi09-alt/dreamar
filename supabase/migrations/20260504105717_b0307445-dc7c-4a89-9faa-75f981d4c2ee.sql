
DROP TRIGGER IF EXISTS tg_enforce_seat_limit ON public.agency_members;

CREATE OR REPLACE FUNCTION public.create_agency_for_current_user(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _agency_id uuid;
  _slug text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _slug := lower(regexp_replace(coalesce(_name, 'agency'), '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  INSERT INTO public.agencies (name, slug, created_by, plan)
  VALUES (coalesce(nullif(trim(_name), ''), 'My Agency'), _slug, _uid, 'starter')
  RETURNING id INTO _agency_id;
  INSERT INTO public.agency_members (agency_id, user_id, role)
  VALUES (_agency_id, _uid, 'agency_owner')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (agency_id, plan, status, trial_end)
  VALUES (_agency_id, 'starter', 'trialing', now() + interval '14 days')
  ON CONFLICT DO NOTHING;
  RETURN _agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_agency_for_current_user(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id uuid;
  _slug text;
  _name text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- Backfill: only for profiles with NO agency at all
DO $$
DECLARE
  u RECORD;
  _agency_id uuid;
  _slug text;
BEGIN
  FOR u IN
    SELECT p.id, p.email, p.full_name
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.agency_members m WHERE m.user_id = p.id)
  LOOP
    _slug := lower(regexp_replace(coalesce(u.full_name, split_part(u.email,'@',1)), '[^a-zA-Z0-9]+', '-', 'g'))
             || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    INSERT INTO public.agencies (name, slug, created_by, plan)
    VALUES (coalesce(u.full_name, split_part(u.email,'@',1)) || '''s Agency', _slug, u.id, 'starter')
    RETURNING id INTO _agency_id;
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (_agency_id, u.id, 'agency_owner')
    ON CONFLICT (agency_id, user_id) DO NOTHING;
    INSERT INTO public.subscriptions (agency_id, plan, status, trial_end)
    VALUES (_agency_id, 'starter', 'trialing', now() + interval '14 days')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
