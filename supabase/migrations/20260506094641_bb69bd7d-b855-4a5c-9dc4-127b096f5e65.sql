
ALTER TABLE public.client_invites
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS send_count int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE public.client_users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- Mark invite as opened (token is the secret; safe to allow anon callers)
CREATE OR REPLACE FUNCTION public.mark_invite_opened(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_invites
  SET opened_at = COALESCE(opened_at, now()),
      status = CASE WHEN status IN ('pending','sent') THEN 'opened' ELSE status END
  WHERE token = _token AND status NOT IN ('accepted','revoked','expired');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invite_opened(text) TO anon, authenticated;

-- Resend invite
CREATE OR REPLACE FUNCTION public.resend_client_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _agency uuid;
BEGIN
  SELECT agency_id INTO _agency FROM public.client_invites WHERE id = _invite_id;
  IF _agency IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF NOT public.is_member_of(auth.uid(), _agency) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.client_invites
  SET last_sent_at = now(),
      send_count = send_count + 1,
      expires_at = now() + interval '7 days',
      status = CASE WHEN status IN ('expired','pending') THEN 'sent' ELSE status END,
      revoked_at = NULL
  WHERE id = _invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resend_client_invite(uuid) TO authenticated;

-- Revoke invite
CREATE OR REPLACE FUNCTION public.revoke_client_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _agency uuid;
BEGIN
  SELECT agency_id INTO _agency FROM public.client_invites WHERE id = _invite_id;
  IF _agency IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF NOT public.is_member_of(auth.uid(), _agency) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.client_invites
  SET status = 'revoked', revoked_at = now()
  WHERE id = _invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_client_invite(uuid) TO authenticated;

-- Touch last login (called by client portal on mount)
CREATE OR REPLACE FUNCTION public.touch_client_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.client_users SET last_login_at = now() WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_client_login() TO authenticated;

-- Update accept_client_invite to record accepted_at
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
  _role app_role;
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

  _role := CASE WHEN COALESCE(_inv.portal_role,'client_viewer') = 'client_owner'
                THEN 'client_owner'::app_role ELSE 'client_viewer'::app_role END;

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
