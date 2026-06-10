ALTER TABLE public.agency_members
  ADD CONSTRAINT agency_members_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
  NOT VALID;
ALTER TABLE public.agency_members VALIDATE CONSTRAINT agency_members_user_profile_fkey;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL
  NOT VALID;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_assigned_profile_fkey;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_created_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
  NOT VALID;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_created_profile_fkey;