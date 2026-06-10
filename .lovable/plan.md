# Rebranding complet: AgencyOS AI → Dreamar

## Scop
Înlocuiești toate referințele vizibile la „AgencyOS AI“ cu „Dreamar“ și refaci logo-ul conform specificațiilor, fără să atingi logica funcțională sau componentele AI/Gemini.

## Ce se modifică

### 1. Logo (`src/components/Logo.tsx`)
- Wordmark nou: `drea` + `<span class="text-accent">.</span>` + `mar`, lowercase, `font-black tracking-tight`.
- Textul folosește `text-foreground` (nu alb hardcodat) ca să fie vizibil în ambele teme.
- Elimină pătratul cu litera „A“. În locul lui, pentru `showText=true` se arată doar wordmark-ul.
- Pentru `showText=false` (mark compact): `d.` cu punct roșu, aceeași stilizare (`font-black`).

### 2. Font Inter 900
- Adaugă `900` în importul Google Fonts din `src/index.css` (`Inter:wght@400;500;600;700;800;900`).

### 3. Text „Dreamar“ peste tot
Fișierele cu apariții confirmate și ce se înlocuiește:

| Fișier | Ce se schimbă |
|--------|---------------|
| `src/components/Logo.tsx` | Wordmark + subtitle (eliminat/substitut) |
| `src/pages/Index.tsx` | Footer © + descrierea modulului ("AgencyOS replaces...") |
| `src/index.css` | Comentariul de header |
| `src/hooks/use-theme.tsx` | Cheia `localStorage` din `agencyos-theme` în `dreamar-theme` |
| `index.html` | `<title>`, `meta description`, `og:description`, `twitter:description`, `og:title` |

Nu există alte apariții în `src/` (verificat în Auth, AcceptInvite, AcceptTeamInvite, AdminLogin, edge functions etc.).

### 4. Favicon nou
- Generez un favicon PNG simplu (punct roșu / mark „d.“ pe fundal transparent sau brand color).
- Înlocuiesc `<link rel="icon" href="/favicon.ico">` din `index.html` cu referința la noul fișier PNG/SVG.
- Șterg `public/favicon.ico` vechi.

### 5. Verificare vizuală
- După modificări, verific în preview pe light și dark mode:
  - Sidebar (`/agency`) — logo + mark compact
  - Landing (`/`) — logo în nav și footer
  - Auth / Accept-invite / Admin-login — logo mărit
  - Client portal (`/client`) — logo în header

## Ce NU se atinge
- Nicio logică de business, auth, roluri, taskuri, invitații, rapoarte.
- Niciun fișier din `supabase/functions/` (edge functions), `supabase/migrations/` sau alte părți de backend.
- Componentele AI/Gemini rămân intacte.

## Rezultat așteptat
Toate textele afișate către utilizator spun „Dreamar“. Logo-ul nou este consistent, lizibil și în dark mode și în light mode, pe desktop și mobil.