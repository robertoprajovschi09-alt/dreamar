DROP POLICY IF EXISTS agencies_client_read ON public.agencies;
CREATE POLICY agencies_client_read ON public.agencies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.agency_id = agencies.id
      AND cu.status = 'active'
  )
);