# Roluri + atribuire taskuri — fix

## Context confirmat
- `agency_members.user_id` și `tasks.assigned_to`/`tasks.created_by` au FK doar către `auth.users`, nu către `public.profiles`. Embed-ul PostgREST `profiles:user_id(...)` din `Tasks.tsx`, `ClientProfile.tsx`, `ContentEditor.tsx` întoarce `null` → pickerul de responsabil e gol, avatarurile nu apar.
- Zero orfani: toți `agency_members.user_id` au profil; toți assignee/creator de pe `tasks` au profil. FK-ul se poate adăuga curat (fără cleanup).
- 3 profile cu `role IS NULL`:
  - `rprajovschi08@gmail.com` (Prajovschi Roberto) — 2026-05-04
  - `robertoprajovschi09@gmail.com` (Prajovschi Roberto) — 2026-05-04
  - `mdxmedia78@gmail.com` (Sia) — 2026-05-08
  → le listez, NU le ating până confirmi care-s reale vs test.
- `content_creator` există în enum-ul `app_role` dar `RoleRoute` nu-l tratează → buclă spre `/auth`.

## Modificări

### 1. Migrare (`supabase/migrations/<ts>_profiles_fk.sql`) — adaugă FK către profiles
```sql
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
```
FK-urile existente către `auth.users` rămân — nu intră în conflict cu embed-ul fiindcă PostgREST rezolvă pe nume tabel (`profiles`).

### 2. Fallback robust în code (defensive, în caz de cache stale al PostgREST)
În `Tasks.tsx`, `ClientProfile.tsx`, `ContentEditor.tsx`: după ce iau `agency_members`, fac un al doilea fetch `profiles.select('id,full_name,email').in('id', userIds)` și fac merge în JS. Embed-ul stil `profiles:user_id(...)` rămâne ca primă încercare — dacă vine gol, completez din map. Practic, aliniez toate cele 3 locuri să facă explicit merge, ca să fie deterministic indiferent de cache PostgREST.

### 3. `src/components/RoleRoute.tsx`
- Adaug `content_creator` în lista permisă pe `/agency` (în `App.tsx`).
- În `RoleRoute`: dacă `profile.is_saas_admin === true`, las acces (nu-l blochez când `role` lipsește sau nu e în `allow`).
- `roleHome`: `content_creator` → `/agency`.
- Fallback redirect interior pentru `content_creator` → `/agency`.

### 4. `App.tsx`
- Pe `path="/agency"`: `allow={["agency_owner","agency_team","content_creator","saas_admin"]}`.

### 5. Hardening `Tasks.tsx`
- `load()` cu `try/catch/finally`, `error` state + `<ErrorState onRetry={load} />` (la fel ca în Analytics).

## NU schimb
- Funcțiile/edge AI Gemini.
- Profilurile cu `role IS NULL` — așteptăm decizia ta (listate mai sus).
- Nu restrâng nav-ul pentru `content_creator` în acest pass (prioritar e deblocarea); pot reveni separat dacă vrei.

## Teste
- Unit: nimic nou (logica e DB + redirect — acoperit manual).
- Manual în tenantul de test:
  1. Login `content_creator` → aterizează direct pe `/agency` (fără buclă).
  2. `/agency/tasks`: pickerul "Toți responsabilii" arată membrii cu nume/email; creezi task, atribui, apare avatarul; filtru pe responsabil funcționează; drag între coloane; "Sarcinile mele" și "Întârziate" merg.
  3. Invit un al 2-lea membru → după accept, apare în picker și i se poate atribui un task.
  4. Forțez un query error (offline) → apare `ErrorState` cu Reîncearcă, nu o pagină goală.

## Fișiere
- Nou: `supabase/migrations/<ts>_profiles_fk.sql`
- Editate: `src/components/RoleRoute.tsx`, `src/App.tsx`, `src/pages/agency/Tasks.tsx`, `src/pages/agency/ClientProfile.tsx`, `src/components/content/ContentEditor.tsx`.

## Decizii cerute
Pentru cele 3 profile `role IS NULL`: vrei să le setez `agency_owner` (cu agenție nouă fiecare), să le ștergem, sau le lăsăm așa? (Default propus: le las până-mi spui.)
