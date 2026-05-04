
ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS hook text,
  ADD COLUMN IF NOT EXISTS cta text,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS post_url text,
  ADD COLUMN IF NOT EXISTS assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agency_notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Allow client viewers to read content for their client
DROP POLICY IF EXISTS content_posts_read ON public.content_posts;
CREATE POLICY content_posts_read ON public.content_posts FOR SELECT TO authenticated
  USING (
    is_member_of(auth.uid(), agency_id)
    OR is_client_viewer_of(auth.uid(), client_id)
    OR is_saas_admin(auth.uid())
  );

CREATE TRIGGER content_posts_set_updated BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.content_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  content_post_id uuid NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  decision text NOT NULL DEFAULT 'pending', -- pending | approved | changes_requested
  comment text,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_approvals_read ON public.content_approvals FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY content_approvals_insert ON public.content_approvals FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id));
CREATE POLICY content_approvals_update ON public.content_approvals FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id));
CREATE POLICY content_approvals_delete ON public.content_approvals FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER content_approvals_set_updated BEFORE UPDATE ON public.content_approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_content_posts_client_sched ON public.content_posts(client_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_posts_agency_sched ON public.content_posts(agency_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_approvals_post ON public.content_approvals(content_post_id);
