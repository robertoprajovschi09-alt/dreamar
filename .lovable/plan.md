## Problem
Login eșuează cu „Invalid admin credentials" pentru că userul `robert@cascodent.ro` nu există în sistemul de autentificare. În baza de date există doar `cascodentar@gmail.com`. Nicio parolă nu poate funcționa pentru un cont inexistent.

## Soluție
Creez contul `robert@cascodent.ro` direct prin backend (service role), cu email-ul deja confirmat și promovat automat la Super Admin.

## Pași

1. **Edge function nouă: `ensure-super-admin-account`**
   - Rulează cu service role.
   - Verifică dacă `robert@cascodent.ro` există în `auth.users`.
   - Dacă NU există → îl creează cu `admin.createUser({ email, password: "Robi234vc", email_confirm: true })`.
   - Dacă există → resetează parola la `Robi234vc` via `admin.updateUserById`.
   - Forțează `profiles.is_saas_admin = true` pentru acel user (trigger-ul existent `tg_auto_promote_super_admin` îl prinde, dar facem și update explicit prin service role).
   - `verify_jwt = false` în `supabase/config.toml` (poate fi apelat fără sesiune).
   - Protejat: rulează doar dacă emailul țintă este în allowlist hardcoded (`robert@cascodent.ro`). Nu acceptă input arbitrar.

2. **Apel automat la load pe `/admin-login`**
   - În `useEffect` din `AdminLogin.tsx`, invocăm `ensure-super-admin-account` o singură dată la prima încărcare a paginii (înainte de orice login). Astfel contul e gata când userul tastează parola.

3. **După login**
   - Flow-ul existent rămâne: `signInWithPassword` → `bootstrap-super-admin` → verifică `is_saas_admin` → redirect `/admin`.

## Acceptance
- Pe `/admin-login`, login cu `robert@cascodent.ro` / `Robi234vc` funcționează imediat și duce la `/admin`.
- `cascodentar@gmail.com` și orice alt cont sunt în continuare blocate.
- Parola nu este expusă în frontend (e doar în edge function, server-side).

## Notă de securitate
Parola inițială `Robi234vc` este hardcoded în edge function (server-side). După primul login, recomand schimbarea ei din UI; pot adăuga ulterior un buton „Change admin password" dacă vrei.
