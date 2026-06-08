
-- 1) Table
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  role app_role NOT NULL DEFAULT 'agency_team'::app_role,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','opened','accepted','expired','revoked')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  opened_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz DEFAULT now(),
  send_count integer NOT NULL DEFAULT 1
);

CREATE INDEX idx_team_invites_agency ON public.team_invites(agency_id);
CREATE INDEX idx_team_invites_token ON public.team_invites(token);
CREATE UNIQUE INDEX uniq_team_invites_open_email
  ON public.team_invites(agency_id, lower(email))
  WHERE status IN ('pending','sent','opened');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_invites_read" ON public.team_invites FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY "team_invites_write" ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of(auth.uid(), agency_id) AND invited_by = auth.uid());
CREATE POLICY "team_invites_update" ON public.team_invites FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY "team_invites_delete" ON public.team_invites FOR DELETE TO authenticated
  USING (public.is_owner_of(auth.uid(), agency_id));

-- 2) RPCs
CREATE OR REPLACE FUNCTION public.get_team_invite_preview(_token text)
RETURNS TABLE(agency_name text, email text, role app_role, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.name, i.email, i.role, i.status, i.expires_at
  FROM public.team_invites i
  JOIN public.agencies a ON a.id = i.agency_id
  WHERE i.token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mark_team_invite_opened(_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.team_invites
  SET opened_at = COALESCE(opened_at, now()),
      status = CASE WHEN status IN ('pending','sent') THEN 'opened' ELSE status END
  WHERE token = _token AND status NOT IN ('accepted','revoked','expired');
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
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

  SELECT * INTO _inv FROM public.team_invites WHERE token = _token;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invalid invite token'; END IF;
  IF _inv.status IN ('revoked','expired') THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF _inv.status = 'accepted' THEN RAISE EXCEPTION 'Invite already accepted'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.team_invites SET status='expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  SELECT agency_id INTO _old_agency FROM public.profiles WHERE id = _uid;

  -- Add to agency_members (enforce_seat_limit trigger will raise if exceeded)
  INSERT INTO public.agency_members (agency_id, user_id, role)
  VALUES (_inv.agency_id, _uid, _inv.role)
  ON CONFLICT (agency_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  PERFORM set_config('app.bypass_profile_lock', 'on', true);
  INSERT INTO public.profiles (id, email, role, agency_id)
  VALUES (_uid, _email, _inv.role, _inv.agency_id)
  ON CONFLICT (id) DO UPDATE SET
    role = _inv.role,
    agency_id = _inv.agency_id,
    client_id = NULL;
  PERFORM set_config('app.bypass_profile_lock', 'off', true);

  UPDATE public.team_invites SET status='accepted', accepted_at = now() WHERE id = _inv.id;

  -- Clean up old solo agency if user is the last one and no clients
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

  RETURN _inv.agency_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resend_team_invite(_invite_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _agency uuid;
BEGIN
  SELECT agency_id INTO _agency FROM public.team_invites WHERE id = _invite_id;
  IF _agency IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF NOT public.is_owner_of(auth.uid(), _agency) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.team_invites
  SET last_sent_at = now(),
      send_count = send_count + 1,
      expires_at = now() + interval '7 days',
      status = CASE WHEN status IN ('expired','pending') THEN 'sent' ELSE status END,
      revoked_at = NULL
  WHERE id = _invite_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_team_invite(_invite_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _agency uuid;
BEGIN
  SELECT agency_id INTO _agency FROM public.team_invites WHERE id = _invite_id;
  IF _agency IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF NOT public.is_owner_of(auth.uid(), _agency) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.team_invites SET status='revoked', revoked_at = now() WHERE id = _invite_id;
END;
$$;

-- 3) Update handle_new_user to recognise team_invite_token
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
BEGIN
  _has_invite := (
    (NEW.raw_user_meta_data ? 'invite_token' AND COALESCE(NEW.raw_user_meta_data->>'invite_token','') <> '')
    OR
    (NEW.raw_user_meta_data ? 'team_invite_token' AND COALESCE(NEW.raw_user_meta_data->>'team_invite_token','') <> '')
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    CASE WHEN _has_invite THEN NULL::app_role ELSE 'agency_owner'::app_role END
  )
  ON CONFLICT (id) DO NOTHING;

  IF _has_invite THEN RETURN NEW; END IF;

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
