CREATE OR REPLACE FUNCTION public.admin_delete_agency(_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_saas_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM set_config('app.bypass_profile_lock', 'on', true);
  UPDATE public.profiles
    SET client_id = NULL, agency_id = NULL, role = NULL
    WHERE client_id IN (SELECT id FROM public.clients WHERE agency_id = _agency_id);
  UPDATE public.profiles
    SET agency_id = NULL, role = NULL
    WHERE agency_id = _agency_id;
  PERFORM set_config('app.bypass_profile_lock', 'off', true);

  DELETE FROM public.client_invites      WHERE agency_id = _agency_id;
  DELETE FROM public.client_users        WHERE agency_id = _agency_id;
  DELETE FROM public.clients             WHERE agency_id = _agency_id;
  DELETE FROM public.agency_members      WHERE agency_id = _agency_id;
  DELETE FROM public.subscriptions       WHERE agency_id = _agency_id;
  DELETE FROM public.agencies            WHERE id = _agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_agency(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_agency(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_agency(uuid) TO authenticated;