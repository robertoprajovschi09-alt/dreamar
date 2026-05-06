## Obiectiv

Flow simplu și sigur de admin login: link discret „Admin” în footer → `/admin-login` (doar email/parolă) → după autentificare, dacă userul are `profiles.is_saas_admin = true`, ajunge la `/admin`; altfel e delogat. Folosește Supabase Auth (fără hardcodări de parolă) și sistemul existent de roluri (`profiles.is_saas_admin`).

## Modificări

### 1. Bootstrap super-admin pentru `robert@cascodent.ro`
Tabela `profiles` are deja coloana `is_saas_admin` (folosită de `RoleRoute`, `AdminDashboard`, etc.) și un trigger `lock_profile_role_columns` care interzice update-ul direct din client. De aceea promovarea trebuie făcută server-side.

**Migrație DB** (aplicată cu tool-ul de migrare):
- `UPDATE profiles SET is_saas_admin = true WHERE lower(email) = 'robert@cascodent.ro'` (în caz că profile-ul există deja)
- Trigger `BEFORE INSERT OR UPDATE OF email ON profiles` → setează `is_saas_admin = true` pentru emailul allowlist (idempotent, sigur la signup viitor).

### 2. Edge function `bootstrap-super-admin` (fallback / robust)
`supabase/functions/bootstrap-super-admin/index.ts`:
- Citește JWT-ul user-ului curent (anon client cu Authorization header).
- Dacă `user.email` e în allowlist (`["robert@cascodent.ro"]`), folosește service role pentru `upsert` în `profiles` cu `is_saas_admin = true`.
- Altfel răspunde `{ ok: true, is_admin: false }` fără să facă modificări.
- Apelată de pagina `/admin-login` după sign-in pentru a garanta promovarea chiar dacă trigger-ul nu a rulat (de ex. profile creat înainte de migrație).
- `supabase/config.toml`: adaugă `[functions.bootstrap-super-admin] verify_jwt = false` (validăm manual JWT-ul prin `auth.getUser`).

### 3. Pagina `/admin-login` (nouă)
`src/pages/AdminLogin.tsx`:
- UI premium minim: logo, titlu „Admin Login”, badge „Super Admin only”.
- Doar inputurile email + password și butonul „Login as Admin”. Fără Google, fără register, fără forgot password.
- `onSubmit`:
  1. `supabase.auth.signInWithPassword` → erori = toast „Invalid admin credentials.”
  2. `supabase.functions.invoke("bootstrap-super-admin")` (non-blocking).
  3. Citește `profiles.is_saas_admin` pentru user-ul curent.
  4. Dacă `true` → `navigate("/admin")`. Dacă `false` → `supabase.auth.signOut()` + toast „Access denied. This area is only for Super Admin.”
- `useEffect` la mount: dacă deja logat ca super admin, redirect direct la `/admin`.

### 4. Protecție rută `/admin`
`src/App.tsx`: înlocuiesc `<Route path="/admin" element={<AdminDashboard />} />` cu o rută wrapped într-un guard nou `<AdminRoute>` care:
- Așteaptă `useUser().loading`.
- Dacă nu e logat sau `!profile?.is_saas_admin` → `<Navigate to="/admin-login" replace />`.
- Altfel randează `<AdminDashboard />`.

`AdminDashboard.tsx` deja face check intern `profile?.is_saas_admin` — păstrăm, dar schimbăm fallback-ul din `Navigate to="/agency"` în `Navigate to="/admin-login"` ca să nu mai trimitem useri neautorizați în zona agenției.

Adaug ruta nouă: `<Route path="/admin-login" element={<AdminLogin />} />`.

### 5. Footer
`src/pages/Index.tsx` (singurul footer din app, în landing page):
- Adaug în partea dreaptă a footer-ului existent un link discret:  
  `<Link to="/admin-login" className="text-muted-foreground/60 hover:text-foreground">Admin</Link>`

## Securitate

- Parola merge doar prin `supabase.auth.signInWithPassword` — nu apare niciodată în codul frontend, nu se stochează în localStorage.
- Allowlist-ul de emailuri admin trăiește server-side (migrație DB + edge function), nu în frontend.
- RLS rămâne activ; trigger-ul `lock_profile_role_columns` nu permite escaladare client-side a `is_saas_admin`.
- Useri non-admin care reușesc să se autentifice pe `/admin-login` sunt automat delogați.
- `/admin` și sub-rutele admin existente continuă să verifice `is_saas_admin`.

## Acceptance check

- Footer: link „Admin” → `/admin-login`.
- `/admin-login` arată doar email + password + buton, fără social/register/forgot.
- robert@cascodent.ro intră ca super admin după primul login (promovat de trigger sau de edge function).
- Orice alt user este delogat cu mesaj clar.
- `/admin` redirect la `/admin-login` pentru oricine non-admin.

## Out of scope

- Schimbarea parolei pentru contul admin (folosește Supabase Auth standard).
- Adăugarea altor super admins — pot fi promovați manual prin DB sau extinzând `ALLOWED_ADMIN_EMAILS` în edge function.
