
-- 1) Cleanup orphan invites/users referencing missing clients or agencies
DELETE FROM public.client_invites ci
  WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = ci.client_id)
     OR NOT EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = ci.agency_id);

DELETE FROM public.client_users cu
  WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = cu.client_id)
     OR NOT EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = cu.agency_id);

-- 2) Add FKs with cascade
ALTER TABLE public.client_invites
  ADD CONSTRAINT client_invites_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT client_invites_agency_id_fkey
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.client_users
  ADD CONSTRAINT client_users_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT client_users_agency_id_fkey
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

-- 3) Expand status CHECK to match RPCs
ALTER TABLE public.client_invites
  DROP CONSTRAINT IF EXISTS client_invites_status_check;
ALTER TABLE public.client_invites
  ADD CONSTRAINT client_invites_status_check
  CHECK (status IN ('pending','sent','opened','accepted','expired','revoked'));
