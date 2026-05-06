-- Extend niche enum
ALTER TYPE niche ADD VALUE IF NOT EXISTS 'medical';
ALTER TYPE niche ADD VALUE IF NOT EXISTS 'education';
ALTER TYPE niche ADD VALUE IF NOT EXISTS 'legal';
ALTER TYPE niche ADD VALUE IF NOT EXISTS 'finance';

-- New per-client KPI schema
CREATE TABLE IF NOT EXISTS public.client_kpi_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  niche_key text NOT NULL,
  custom_niche_label text,
  kpi_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  business_impact_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  monthly_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_kpi_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_kpi_schemas_read" ON public.client_kpi_schemas FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY "client_kpi_schemas_write" ON public.client_kpi_schemas FOR INSERT TO authenticated
WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY "client_kpi_schemas_update" ON public.client_kpi_schemas FOR UPDATE TO authenticated
USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY "client_kpi_schemas_delete" ON public.client_kpi_schemas FOR DELETE TO authenticated
USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER client_kpi_schemas_set_updated BEFORE UPDATE ON public.client_kpi_schemas
FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

-- Platform extras
ALTER TABLE public.client_platforms
  ADD COLUMN IF NOT EXISTS starting_followers integer,
  ADD COLUMN IF NOT EXISTS objective text;

-- Invite enhancements
ALTER TABLE public.client_invites
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS portal_role text NOT NULL DEFAULT 'client_viewer',
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.client_users
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Strategy on client
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ai_strategy_base jsonb;

-- Update accept_client_invite to carry permissions/display_name/role
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
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.client_invites SET status='expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  SELECT agency_id INTO _old_agency FROM public.profiles WHERE id = _uid;

  _role := CASE WHEN COALESCE(_inv.portal_role,'client_viewer') = 'client_owner'
                THEN 'client_owner'::app_role ELSE 'client_viewer'::app_role END;

  INSERT INTO public.client_users (agency_id, client_id, user_id, email, role, status, permissions, display_name)
  VALUES (_inv.agency_id, _inv.client_id, _uid, COALESCE(_email, _inv.email), _role, 'active',
          COALESCE(_inv.permissions,'{}'::jsonb), _inv.display_name)
  ON CONFLICT (client_id, user_id) DO UPDATE SET
    status = 'active',
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    display_name = COALESCE(EXCLUDED.display_name, public.client_users.display_name);

  PERFORM set_config('app.bypass_profile_lock', 'on', true);
  INSERT INTO public.profiles (id, email, role, agency_id, client_id)
  VALUES (_uid, _email, _role, _inv.agency_id, _inv.client_id)
  ON CONFLICT (id) DO UPDATE SET
    role = _role,
    agency_id = EXCLUDED.agency_id,
    client_id = EXCLUDED.client_id;
  PERFORM set_config('app.bypass_profile_lock', 'off', true);

  UPDATE public.client_invites SET status='accepted' WHERE id = _inv.id;

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

-- Storage policies for agency-files (path = clients/<client_id>/...)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agency_files_member_read') THEN
    CREATE POLICY "agency_files_member_read" ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'agency-files' AND (
        is_saas_admin(auth.uid()) OR EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = (storage.foldername(name))[2]
            AND (storage.foldername(name))[1] = 'clients'
            AND is_member_of(auth.uid(), c.agency_id)
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agency_files_member_write') THEN
    CREATE POLICY "agency_files_member_write" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'agency-files' AND (
        is_saas_admin(auth.uid()) OR EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = (storage.foldername(name))[2]
            AND (storage.foldername(name))[1] = 'clients'
            AND is_member_of(auth.uid(), c.agency_id)
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agency_files_member_update') THEN
    CREATE POLICY "agency_files_member_update" ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'agency-files' AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND (storage.foldername(name))[1] = 'clients'
          AND is_member_of(auth.uid(), c.agency_id)
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agency_files_member_delete') THEN
    CREATE POLICY "agency_files_member_delete" ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'agency-files' AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND (storage.foldername(name))[1] = 'clients'
          AND is_member_of(auth.uid(), c.agency_id)
      )
    );
  END IF;
END $$;