
## Problemă

Userii invitați ca clienți nu pot finaliza signup pentru că aplicația le creează o agenție automat la signup, iar apoi garda din `accept_client_invite` îi blochează (corect) ca "cont de agenție".

Două surse de auto-creare a agenției:

1. **Trigger DB `handle_new_user`** — verifică `raw_user_meta_data.invite_token`. `AcceptInvite` îl trimite deja, deci aici e OK în majoritatea cazurilor, dar lipsește un safety net pe email.
2. **`src/pages/Auth.tsx`** — un `useEffect` cu `bootstrappingRef` cheamă `create_agency_for_current_user` pentru ORICE user logat fără `agency_id`/`client_id`. Dacă userul ajunge pe `/auth` în orice fereastră scurtă după signup prin invitație (înainte ca `accept_client_invite` să ruleze, sau dacă confirmarea de email îl trimite altundeva), se creează o agenție și flow-ul de client e definitiv stricat.

## Fix

### 1. `src/pages/AcceptInvite.tsx`
- Câmpul Email pe ambele taburi (Sign up / Sign in) devine `readOnly`, pre-completat cu `preview.email`, cu hint vizual ("Această invitație este pentru `email`").
- La `signUp`, păstrează `invite_token` în metadata și adaugă `signup_type: 'client_invite'` (folosit ca semnal de către Auth.tsx).
- Fără alte schimbări de logică pe acceptare.

### 2. `src/pages/Auth.tsx`
- Elimină auto-bootstrap-ul de agenție din `useEffect`. Crearea agenției rămâne DOAR în `handleSignUp` (tabul "Creează agenție") și pentru OAuth Google din tabul de signup.
- Înainte de a redirecta un user logat fără rol către `roleHome`, dacă user-ul are `user_metadata.signup_type === 'client_invite'` sau `user_metadata.invite_token`, sau dacă există o invitație de client `pending/sent/opened` pentru email-ul lui, redirectează spre `/accept-invite?token=...` (folosind tokenul din metadata) în loc să creeze agenție.
- Pentru Google OAuth declanșat din tabul "Intră în cont", nu mai forța crearea de agenție; lasă `RoleRoute` să decidă.

### 3. Migrare nouă în `supabase/migrations/<timestamp>_protect_client_invite_signup.sql`
Defense-in-depth la nivel DB, fără să slăbească garda existentă:

- `handle_new_user` — pe lângă verificarea `invite_token`/`team_invite_token` din metadata, verifică și `signup_type='client_invite'`, ȘI dacă există o invitație de client validă (status în `pending/sent/opened`, `expires_at > now()`) pentru `NEW.email`. Dacă da: setează `profiles.role = NULL`, NU crea agenție, NU crea agency_member, NU crea subscription.
- `create_agency_for_current_user` — la început, dacă există invitație de client validă pentru email-ul user-ului curent, RAISE EXCEPTION cu mesaj clar ("Există o invitație de client activă pentru acest email. Acceptă invitația în loc să creezi agenție."). Asta blochează orice cale accidentală de upgrade.
- Garda existentă din `accept_client_invite` rămâne neatinsă.

### 4. Verificare

- Email curat invitat ca client → deschide link → signup (email blocat) → trigger NU creează agenție → `accept_client_invite` rulează → ajunge în `/client`.
- Email existent de agency_owner deschide invitație → garda îl blochează cu mesajul actual.
- Signup normal din `/auth` "Creează agenție" → funcționează nemodificat.
- Dacă cineva accesează `/auth` după un signup de invitație nelivrat încă (race), nu se mai creează agenție; e redirectat înapoi spre acceptare.

## Fișiere atinse

- `src/pages/AcceptInvite.tsx` (UI + metadata)
- `src/pages/Auth.tsx` (scoate auto-bootstrap, adaugă redirect spre accept-invite)
- `supabase/migrations/<timestamp>_protect_client_invite_signup.sql` (nou)

Nu se modifică: `accept_client_invite` (garda), `RoleRoute`, `UserContext`, RPC-uri de team invite, sau alte rute.
