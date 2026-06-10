CREATE OR REPLACE FUNCTION public.accept_client_invite(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv RECORD;
  _old_agency uuid;
  _other_members int;
  _other_clients int;
  _role app_role := 'client_viewer'::app_role;
  _is_agency_account boolean;
  _existing_role app_role;
  _is_admin boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  -- Block agency accounts from being demoted into client_viewer
  SELECT role, COALESCE(is_saas_admin,false)
    INTO _existing_role, _is_admin
    FROM public.profiles WHERE id = _uid;

  SELECT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = _uid)
    INTO _is_agency_account;

  IF _is_admin
     OR _is_agency_account
     OR _existing_role IN ('agency_owner'::app_role, 'agency_team'::app_role, 'saas_admin'::app_role)
  THEN
    RAISE EXCEPTION 'Acest cont este deja un cont de agenție. Nu poți accepta o invitație de client cu el — folosește un alt email pentru contul de client.';
  END IF;

  SELECT * INTO _inv FROM public.client_invites WHERE token = _token;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invalid invite token'; END IF;
  IF _inv.status IN ('revoked','expired') THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF _inv.status = 'accepted' THEN RAISE EXCEPTION 'Invite already accepted'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.client_invites SET status='expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  IF _email IS NULL OR lower(_email) <> lower(_inv.email) THEN
    RAISE EXCEPTION 'Această invitație a fost trimisă către alt email. Loghează-te cu emailul invitat.';
  END IF;

  SELECT agency_id INTO _old_agency FROM public.profiles WHERE id = _uid;

  INSERT INTO public.client_users (agency_id, client_id, user_id, email, role, status, permissions, display_name, last_login_at)
  VALUES (_inv.agency_id, _inv.client_id, _uid, COALESCE(_email, _inv.email), _role, 'active',
          COALESCE(_inv.permissions,'{}'::jsonb), _inv.display_name, now())
  ON CONFLICT (client_id, user_id) DO UPDATE SET
    status = 'active',
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    display_name = COALESCE(EXCLUDED.display_name, public.client_users.display_name),
    last_login_at = now(),
    revoked_at = NULL;

  PERFORM set_config('app.bypass_profile_lock', 'on', true);
  INSERT INTO public.profiles (id, email, role, agency_id, client_id)
  VALUES (_uid, _email, _role, _inv.agency_id, _inv.client_id)
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    agency_id = EXCLUDED.agency_id,
    client_id = EXCLUDED.client_id;
  PERFORM set_config('app.bypass_profile_lock', 'off', true);

  UPDATE public.client_invites SET status='accepted', accepted_at = now() WHERE id = _inv.id;

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
$function$;

CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _email IS NULL OR lower(_email) <> lower(_inv.email) THEN
    RAISE EXCEPTION 'Această invitație a fost trimisă către alt email. Loghează-te cu emailul invitat.';
  END IF;

  SELECT agency_id INTO _old_agency FROM public.profiles WHERE id = _uid;

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
$function$;