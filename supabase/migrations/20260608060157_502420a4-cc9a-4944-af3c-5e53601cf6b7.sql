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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.client_invites WHERE token = _token;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invalid invite token'; END IF;
  IF _inv.status IN ('revoked','expired') THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF _inv.status = 'accepted' THEN RAISE EXCEPTION 'Invite already accepted'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.client_invites SET status='expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'Invite has expired';
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
    role = _role,
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