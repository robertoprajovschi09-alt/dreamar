
-- 1. Extend sync trigger to also handle INSERT
CREATE OR REPLACE FUNCTION public.tg_sync_post_from_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending_approval' THEN
      UPDATE public.content_posts
        SET status = 'pending_approval'::post_status, approval_status = 'pending'
        WHERE id = NEW.content_post_id;
    END IF;
    RETURN NEW;
  END IF;

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
    ELSIF NEW.status = 'pending_approval' THEN
      UPDATE public.content_posts
        SET status = 'pending_approval'::post_status, approval_status = 'pending'
        WHERE id = NEW.content_post_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Recreate trigger covering both INSERT and UPDATE
DROP TRIGGER IF EXISTS tg_content_approvals_sync ON public.content_approvals;
CREATE TRIGGER tg_content_approvals_sync
BEFORE INSERT OR UPDATE ON public.content_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_post_from_approval();

-- 2. Tighten RLS: split agency vs client update policies
DROP POLICY IF EXISTS content_approvals_update ON public.content_approvals;
DROP POLICY IF EXISTS content_approvals_client_update ON public.content_approvals;

CREATE POLICY content_approvals_agency_update
  ON public.content_approvals
  FOR UPDATE
  USING (is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()))
  WITH CHECK (is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()));

CREATE POLICY content_approvals_client_respond
  ON public.content_approvals
  FOR UPDATE
  USING (
    is_client_viewer_of(auth.uid(), client_id)
    AND status = 'pending_approval'
  )
  WITH CHECK (
    is_client_viewer_of(auth.uid(), client_id)
    AND status IN ('approved','changes_requested','rejected')
  );

-- 3. SECURITY DEFINER RPC for client responses
CREATE OR REPLACE FUNCTION public.respond_to_approval(
  _id uuid,
  _status text,
  _feedback text
)
RETURNS public.content_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.content_approvals;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _status NOT IN ('approved','changes_requested','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO _row FROM public.content_approvals WHERE id = _id;
  IF _row IS NULL THEN RAISE EXCEPTION 'Approval not found'; END IF;

  IF NOT (
    public.is_client_viewer_of(_uid, _row.client_id)
    OR public.is_member_of(_uid, _row.agency_id)
    OR public.is_saas_admin(_uid)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _row.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'Approval is not pending';
  END IF;

  IF _status <> 'approved' AND (coalesce(trim(_feedback),'') = '') THEN
    RAISE EXCEPTION 'Feedback required';
  END IF;

  UPDATE public.content_approvals
  SET status      = _status,
      feedback    = _feedback,
      comment     = _feedback,
      decision    = CASE WHEN _status = 'approved' THEN 'approved'
                         WHEN _status = 'rejected' THEN 'rejected'
                         ELSE 'changes_requested' END,
      decided_by  = _uid,
      responded_at = now()
  WHERE id = _id
  RETURNING * INTO _row;

  RETURN _row;
END $$;

GRANT EXECUTE ON FUNCTION public.respond_to_approval(uuid,text,text) TO authenticated;

-- 4. Realtime on content_approvals
ALTER TABLE public.content_approvals REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_approvals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.content_approvals';
  END IF;
END $$;
