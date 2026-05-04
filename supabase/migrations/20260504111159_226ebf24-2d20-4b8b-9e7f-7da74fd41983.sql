
-- =========================================================
-- Multi-role access system
-- =========================================================

-- 1. Profiles: add agency_id + client_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_id uuid,
  ADD COLUMN IF NOT EXISTS client_id uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client ON public.profiles(client_id);

-- Add role column to profiles for fast role lookup (mirrors agency_members.role / client_users.role)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role;

-- 2. client_users
CREATE TABLE IF NOT EXISTS public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'client_viewer',
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_client_users_user ON public.client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client ON public.client_users(client_id);
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- 3. client_invites
CREATE TABLE IF NOT EXISTS public.client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE INDEX IF NOT EXISTS idx_client_invites_token ON public.client_invites(token);
CREATE INDEX IF NOT EXISTS idx_client_invites_agency ON public.client_invites(agency_id);
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- 4. client_feedback
CREATE TABLE IF NOT EXISTS public.client_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  submitted_by uuid NOT NULL,
  month date NOT NULL DEFAULT date_trunc('month', now())::date,
  feedback_text text,
  calls_received integer DEFAULT 0,
  messages_received integer DEFAULT 0,
  bookings integer DEFAULT 0,
  sales_estimate numeric,
  real_life_impact text,
  objections text,
  promote_next_month text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_feedback_client ON public.client_feedback(client_id);
ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Helper functions
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_client_viewer_of(_user uuid, _client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_users
    WHERE user_id = _user AND client_id = _client AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_invite_preview(_token text)
RETURNS TABLE(agency_name text, client_name text, email text, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.name, c.name, i.email, i.status, i.expires_at
  FROM public.client_invites i
  JOIN public.agencies a ON a.id = i.agency_id
  JOIN public.clients  c ON c.id = i.client_id
  WHERE i.token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_client_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv RECORD;
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

  -- Upsert client_users link
  INSERT INTO public.client_users (agency_id, client_id, user_id, email, role, status)
  VALUES (_inv.agency_id, _inv.client_id, _uid, COALESCE(_email, _inv.email), 'client_viewer', 'active')
  ON CONFLICT (client_id, user_id) DO UPDATE SET status = 'active';

  -- Update profile (bypasses the lock trigger because this runs as definer/postgres role)
  INSERT INTO public.profiles (id, email, role, agency_id, client_id)
  VALUES (_uid, _email, 'client_viewer', _inv.agency_id, _inv.client_id)
  ON CONFLICT (id) DO UPDATE SET
    role = 'client_viewer',
    agency_id = EXCLUDED.agency_id,
    client_id = EXCLUDED.client_id;

  -- Mark invite accepted
  UPDATE public.client_invites SET status='accepted' WHERE id = _inv.id;

  RETURN _inv.client_id;
END;
$$;

-- =========================================================
-- Update handle_new_user to stamp profile.role + agency_id
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _agency_id uuid;
  _slug text;
  _name text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    'agency_owner'
  )
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

    UPDATE public.profiles SET agency_id = _agency_id WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Lock profile.role / agency_id / client_id from self-update
-- =========================================================
CREATE OR REPLACE FUNCTION public.lock_profile_role_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_saas_admin(auth.uid()) THEN
    NEW.role := OLD.role;
    NEW.agency_id := OLD.agency_id;
    NEW.client_id := OLD.client_id;
    NEW.is_saas_admin := OLD.is_saas_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_role ON public.profiles;
CREATE TRIGGER lock_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.lock_profile_role_columns();

-- =========================================================
-- RLS: clients (rewrite SELECT to include client viewers)
-- =========================================================
DROP POLICY IF EXISTS clients_read ON public.clients;
CREATE POLICY clients_read ON public.clients FOR SELECT TO authenticated
USING (
  public.is_member_of(auth.uid(), agency_id)
  OR public.is_client_viewer_of(auth.uid(), id)
  OR public.is_saas_admin(auth.uid())
);

-- =========================================================
-- RLS: client_users
-- =========================================================
DROP POLICY IF EXISTS client_users_read   ON public.client_users;
DROP POLICY IF EXISTS client_users_write  ON public.client_users;
DROP POLICY IF EXISTS client_users_update ON public.client_users;
DROP POLICY IF EXISTS client_users_delete ON public.client_users;

CREATE POLICY client_users_read ON public.client_users FOR SELECT TO authenticated
USING (
  public.is_member_of(auth.uid(), agency_id)
  OR user_id = auth.uid()
  OR public.is_saas_admin(auth.uid())
);
CREATE POLICY client_users_write ON public.client_users FOR INSERT TO authenticated
WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY client_users_update ON public.client_users FOR UPDATE TO authenticated
USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY client_users_delete ON public.client_users FOR DELETE TO authenticated
USING (public.is_member_of(auth.uid(), agency_id));

-- =========================================================
-- RLS: client_invites (no public select; preview goes through function)
-- =========================================================
DROP POLICY IF EXISTS client_invites_all ON public.client_invites;

CREATE POLICY client_invites_read ON public.client_invites FOR SELECT TO authenticated
USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY client_invites_write ON public.client_invites FOR INSERT TO authenticated
WITH CHECK (public.is_member_of(auth.uid(), agency_id) AND invited_by = auth.uid());
CREATE POLICY client_invites_update ON public.client_invites FOR UPDATE TO authenticated
USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY client_invites_delete ON public.client_invites FOR DELETE TO authenticated
USING (public.is_member_of(auth.uid(), agency_id));

-- =========================================================
-- RLS: client_feedback
-- =========================================================
DROP POLICY IF EXISTS client_feedback_read   ON public.client_feedback;
DROP POLICY IF EXISTS client_feedback_write  ON public.client_feedback;

CREATE POLICY client_feedback_read ON public.client_feedback FOR SELECT TO authenticated
USING (
  public.is_member_of(auth.uid(), agency_id)
  OR (submitted_by = auth.uid() AND public.is_client_viewer_of(auth.uid(), client_id))
  OR public.is_saas_admin(auth.uid())
);
CREATE POLICY client_feedback_write ON public.client_feedback FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND public.is_client_viewer_of(auth.uid(), client_id)
);

-- =========================================================
-- Backfill: existing users -> set profile.role + agency_id
-- =========================================================
UPDATE public.profiles p
SET role = COALESCE(p.role, 'agency_owner'),
    agency_id = COALESCE(
      p.agency_id,
      (SELECT m.agency_id FROM public.agency_members m WHERE m.user_id = p.id ORDER BY m.created_at LIMIT 1)
    )
WHERE p.role IS NULL OR p.agency_id IS NULL;
