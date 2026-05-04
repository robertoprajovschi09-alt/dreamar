
-- Niche tables: extend SELECT to client viewers
DROP POLICY IF EXISTS niche_real_estate_properties_read ON public.niche_real_estate_properties;
CREATE POLICY niche_real_estate_properties_read ON public.niche_real_estate_properties FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));

DROP POLICY IF EXISTS niche_restaurant_items_read ON public.niche_restaurant_items;
CREATE POLICY niche_restaurant_items_read ON public.niche_restaurant_items FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));

DROP POLICY IF EXISTS niche_dental_treatments_read ON public.niche_dental_treatments;
CREATE POLICY niche_dental_treatments_read ON public.niche_dental_treatments FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));

DROP POLICY IF EXISTS niche_fitness_offerings_read ON public.niche_fitness_offerings;
CREATE POLICY niche_fitness_offerings_read ON public.niche_fitness_offerings FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));

DROP POLICY IF EXISTS niche_custom_metrics_read ON public.niche_custom_metrics;
CREATE POLICY niche_custom_metrics_read ON public.niche_custom_metrics FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));

-- videos: allow clients to view their own videos (used by AI assistant context as client)
DROP POLICY IF EXISTS videos_read ON public.videos;
CREATE POLICY videos_read ON public.videos FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
