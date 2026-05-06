-- 1. Extend post_status enum
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'internal_review';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ready_for_client';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'changes_requested';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'posted';

-- 2. Extend content_approvals
ALTER TABLE public.content_approvals
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_to_client_user uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS due_date timestamptz;

DO $$ BEGIN
  ALTER TABLE public.content_approvals
    ADD CONSTRAINT content_approvals_status_chk
    CHECK (status IN ('not_sent','pending_approval','approved','changes_requested','rejected','expired'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS content_approvals_one_open_per_post
  ON public.content_approvals (content_post_id)
  WHERE status = 'pending_approval';

CREATE INDEX IF NOT EXISTS content_approvals_agency_status_idx
  ON public.content_approvals (agency_id, status, requested_at DESC);

DROP TRIGGER IF EXISTS tg_content_approvals_updated_at ON public.content_approvals;
CREATE TRIGGER tg_content_approvals_updated_at
BEFORE UPDATE ON public.content_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Allow client viewers to UPDATE their own pending approval rows
DROP POLICY IF EXISTS content_approvals_client_update ON public.content_approvals;
CREATE POLICY content_approvals_client_update
ON public.content_approvals
FOR UPDATE TO authenticated
USING (is_client_viewer_of(auth.uid(), client_id))
WITH CHECK (is_client_viewer_of(auth.uid(), client_id));

-- 4. Trigger: mirror approval decision onto content_posts
CREATE OR REPLACE FUNCTION public.tg_sync_post_from_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved','changes_requested','rejected') AND NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;
    IF NEW.status = 'approved' THEN
      UPDATE public.content_posts
        SET status = 'approved'::post_status, approval_status = 'approved'
        WHERE id = NEW.content_post_id;
    ELSIF NEW.status = 'changes_requested' THEN
      UPDATE public.content_posts
        SET status = 'changes_requested'::post_status, approval_status = 'changes_requested'
        WHERE id = NEW.content_post_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.content_posts
        SET status = 'rejected'::post_status, approval_status = 'rejected'
        WHERE id = NEW.content_post_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_content_approvals_sync ON public.content_approvals;
CREATE TRIGGER tg_content_approvals_sync
BEFORE UPDATE ON public.content_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_post_from_approval();

-- 5. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid,
  client_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_self_read ON public.notifications;
CREATE POLICY notifications_self_read ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_self_update ON public.notifications;
CREATE POLICY notifications_self_update ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_self_delete ON public.notifications;
CREATE POLICY notifications_self_delete ON public.notifications
FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);
