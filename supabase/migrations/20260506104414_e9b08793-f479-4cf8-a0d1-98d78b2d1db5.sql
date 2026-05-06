UPDATE public.profiles SET is_saas_admin = true WHERE lower(email) = 'robert@cascodent.ro';

CREATE OR REPLACE FUNCTION public.tg_auto_promote_super_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) = 'robert@cascodent.ro' THEN
    NEW.is_saas_admin := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS auto_promote_super_admin ON public.profiles;
CREATE TRIGGER auto_promote_super_admin
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_auto_promote_super_admin();