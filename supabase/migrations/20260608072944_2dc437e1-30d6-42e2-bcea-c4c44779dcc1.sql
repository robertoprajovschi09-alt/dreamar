DROP POLICY IF EXISTS agencies_owner_update ON public.agencies;

CREATE POLICY agencies_owner_update ON public.agencies
FOR UPDATE TO authenticated
USING (
  is_member_of(auth.uid(), id)
  OR created_by = auth.uid()
  OR is_saas_admin(auth.uid())
)
WITH CHECK (
  is_member_of(auth.uid(), id)
  OR created_by = auth.uid()
  OR is_saas_admin(auth.uid())
);