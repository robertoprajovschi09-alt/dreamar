## Problema

La acceptarea unei invitații cu cont nou:
- `handle_new_user` setează `role='agency_owner'` și creează o agenție goală.
- `accept_client_invite` încearcă să schimbe rolul în `client_viewer`, dar trigger-ul `lock_profile_role_columns` resetează coloanele înapoi (auth.uid() nu e admin).
- Userul rămâne `agency_owner` → `RoleRoute` îl duce pe `/agency`.

## Fix (1 migration + 2 file edits)

### 1. Migration nouă

**a) `lock_profile_role_columns`** — permite bypass când o funcție trusted setează un flag de sesiune:
```sql
IF current_setting('app.bypass_profile_lock', true) = 'on' THEN
  RETURN NEW;
END IF;
IF NOT public.is_saas_admin(auth.uid()) THEN
  NEW.role := OLD.role; ...
END IF;
```

**b) `accept_client_invite`** — setează flag-ul înainte de UPDATE și curăță agenția auto-creată pentru invitați (dacă nu are alți membri / clienți):
```sql
PERFORM set_config('app.bypass_profile_lock','on', true);
-- existing INSERT/UPDATE on profiles ...
-- după update: dacă profile vechi avea agency_id ≠ _inv.agency_id și
-- agenția aia n-are alți membri / clienți → DELETE agencies, agency_members, subscriptions.
```

**c) `handle_new_user`** — dacă `raw_user_meta_data->>'invite_token'` e prezent, **nu** creează agenție și setează `role = NULL` (urmează să fie setat de `accept_client_invite`):
```sql
IF NEW.raw_user_meta_data ? 'invite_token' THEN
  INSERT INTO profiles (id,email,full_name,role) VALUES (..., NULL) ...;
  RETURN NEW;
END IF;
-- altfel: comportamentul existent (agency_owner + agency)
```

### 2. `src/pages/AcceptInvite.tsx`

În `handleSignUp`, transmite token-ul în metadata ca `handle_new_user` să-l detecteze:
```ts
options: {
  emailRedirectTo: `${window.location.origin}/accept-invite?token=${token}`,
  data: { full_name: fullName, invite_token: token },
}
```

### 3. `src/contexts/UserContext.tsx` (defensive self-heal)

Extinde self-heal-ul: dacă `profile.role === 'agency_owner'` **dar** există rând activ în `client_users` pentru user, preferă `client_viewer` + ruleaza `accept_client_invite` n-a apucat / nu rerulăm — doar redirecționăm prin a returna profilul cu `role='client_viewer'` din `client_users`. Asta acoperă userii deja stricați din testele anterioare.

## Rezultat

- Invitat nou → cont creat fără agenție parazită → `accept_client_invite` setează `client_viewer` + `client_id` → redirect la `/client`.
- Userii deja afectați din testele anterioare: self-heal-ul UserContext îi forțează pe `/client`.
- Owner-ii reali nu sunt afectați (flag-ul de bypass e setat doar din `accept_client_invite`).
