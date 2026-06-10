-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_briefs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_posts;

ALTER TABLE public.client_feedback REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_goals   REPLICA IDENTITY FULL;
ALTER TABLE public.client_briefs   REPLICA IDENTITY FULL;
ALTER TABLE public.content_posts   REPLICA IDENTITY FULL;

-- RLS: allow client viewers to insert/update goals scoped to their client_id
CREATE POLICY "monthly_goals_client_insert"
  ON public.monthly_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_client_viewer_of(auth.uid(), client_id));

CREATE POLICY "monthly_goals_client_update"
  ON public.monthly_goals FOR UPDATE TO authenticated
  USING (public.is_client_viewer_of(auth.uid(), client_id))
  WITH CHECK (public.is_client_viewer_of(auth.uid(), client_id));