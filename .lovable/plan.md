# Soft-UI Restyle (global, signal red)

Scop: aplic look-ul "Donezo" — fundal gri deschis, carduri albe rotunjite mari, shadow-uri soft, butoane pill, sidebar curat, stat cards aerisite — pe **toate** ecranele (agency, client niche dashboards, client portal), DOAR prin tokens Tailwind + shadcn variants + cele 3-4 componente partajate. Zero schimbări de funcționalitate, rute, date, texte sau backend.

## 1. Design tokens (`src/index.css`)

Rescriu paleta light + dark cu valori soft-UI, păstrând accent = signal red.

- **Light**: `--background: 220 13% 97%` (≈#F4F5F7), `--card: 0 0% 100%`, `--surface-1/2/3` mai calde, `--border: 220 13% 91%`, `--muted-foreground` mai puțin contrast. Accent rămâne `354 78% 50%`.
- **Dark**: păstrez baza neagră existentă, doar slăbesc bordurile și adaug surface mai cald.
- **Radius**: `--radius: 1.25rem` (rounded-2xl/3xl pe carduri).
- **Shadows** rescrise mai soft + difuze:
  ```
  --shadow-sm: 0 1px 2px hsl(220 13% 20% / 0.04);
  --shadow-md: 0 8px 24px -8px hsl(220 13% 20% / 0.08);
  --shadow-lg: 0 20px 50px -20px hsl(220 13% 20% / 0.12);
  --shadow-soft: 0 4px 20px hsl(220 13% 20% / 0.06);
  ```
- Adaug utility `.shadow-soft` și `.rounded-4xl` (2rem) în `@layer utilities`.
- Adaug Plus Jakarta Sans la importul Google Fonts și îl pun primul în `font-sans` stack (Inter rămâne fallback).

## 2. Tailwind config (`tailwind.config.ts`)

- `fontFamily.sans`: `['Plus Jakarta Sans', 'Inter', ...]`.
- `borderRadius`: adaug `'2xl': '1.25rem'`, `'3xl': '1.75rem'`, `'4xl': '2rem'`.
- `boxShadow`: adaug `soft`, `soft-lg` mapate pe vars-uri.

## 3. Componente shadcn — variants (propagare automată)

### `src/components/ui/button.tsx`
- Default rounded → `rounded-full` pentru `default`/`lg`, `rounded-xl` pentru `sm`.
- Variant `default`: `bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft`.
- Variant `outline`: `rounded-full border-border bg-card hover:bg-surface-1`.
- Variant `secondary`: pill cu `bg-surface-1`.
- Size `default`: `h-11 px-6`, `lg`: `h-12 px-7`, `sm`: `h-9 px-4`.

### `src/components/ui/card.tsx`
- Card: `rounded-3xl border border-border/60 bg-card shadow-soft` (înlocuiesc `rounded-lg ... shadow-sm`).
- CardHeader/Content padding mai generos (`p-6 md:p-7`).

### `src/components/ui/input.tsx`, `select.tsx`, `textarea.tsx`
- `rounded-full` (input/select) sau `rounded-2xl` (textarea), `h-11`, `bg-surface-1 border-transparent focus:border-accent`.

### `src/components/ui/badge.tsx`
- Adaug variants semantice: `success` (verde soft), `warning` (galben soft), `info` (albastru soft), `pending` (gri soft); toate `rounded-full px-2.5 py-0.5 text-[11px] font-medium`. Variantele existente păstrate.

### `src/components/MetricCard.tsx`
- Layout nou conform poză: label sus-stânga + buton circular cu săgeată sus-dreapta, număr extra-bold (text-4xl, font-mono `tnum`), trend afișat ca **pill** capsulă cu mini-iconă ▲/▼.
- Prop nou opțional `featured?: boolean` → când e true, fundal gradient accent + text alb (înlocuiește vechiul `accent`).
- Toate paginile care folosesc `<MetricCard>` rămân neatinse.

### `src/components/AgencyLayout.tsx` (sidebar + topbar)
- Sidebar: lățime `w-64`, fundal `bg-sidebar`, logo aerisit, **section labels** uppercase "MENIU" / "GENERAL" / "ADMIN" (Collapsible existent rămâne).
- `navLinkClass`: activ = `bg-accent/10 text-accent` + bară-accent **stânga** subțire `w-1 rounded-r`; inactiv = `text-muted-foreground hover:bg-surface-1`.
- Topbar: search pill central (input rotunjit cu icon Search + hint ⌘F, doar UI — fără logică), butoane icon circulare pentru theme/notificări, chip user `rounded-full bg-surface-1` cu avatar + nume + email.
- Mobile bottom nav: păstrată funcțional, doar restyled (rounded top, shadow soft).

### `src/components/PageHeader.tsx`
- Titluri mai mari (`text-3xl md:text-4xl font-bold`), subtext gri; CTA-urile devin automat pill pentru că `<Button>` e restilizat.

## 4. Status pill partajat

Creez **`src/components/ui/status-pill.tsx`** — wrapper subțire peste Badge cu props `kind: 'success' | 'warning' | 'info' | 'pending' | 'danger' | 'muted'`. Înlocuiesc PUNCTUAL în 3-4 locuri high-traffic (content posts list, approvals list, tasks cards, client status), nu peste tot — restul rămân pe Badge restilizat.

## 5. Background global

În `body` (`src/index.css`) păstrez `bg-background`, dar `<main>` din `AgencyLayout` + `ClientPortal` primesc padding mai mare (`p-6 md:p-8`). Astfel cardurile albe contrastează natural cu `--background` gri.

## 6. Client Portal (`src/pages/client/ClientPortal.tsx`)

Doar topbar-ul + container-ul principal primesc același tratament (logo + theme toggle + user chip, fundal gri). Conținutul (tabs, dashboard-uri niche, `ClientDashboard`, niche sections) moștenește automat noul stil prin Card/Button/Badge/MetricCard.

## 7. Niche dashboards (`src/components/client/*DashboardSection.tsx`, `NicheDashboardSection`, `CustomNicheDashboardSection`, `RealEstateDashboardSection`, `NichePanel`)

Nu le ating direct. Folosesc deja `<Card>` + `<MetricCard>` + `<Button>` + `<Badge>` → preiau automat noile stiluri.

## 8. Dark mode

Toate valorile noi sunt definite și în `.dark`. Verific contrast pe sidebar activ (accent pe fundal închis), pe stat cards featured, și pe inputuri.

## 9. Responsive

- Cardurile rămân `rounded-3xl` și pe mobil; padding scade la `p-5`.
- Sidebar desktop neschimbat structural; mobile bottom nav restilizat.
- Grid-urile de stat cards existente (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) merg ca atare.

## 10. Verificare

După edit-uri, deschid preview pe rutele cheie: `/agency`, `/agency/clients`, `/agency/calendar`, `/agency/tasks`, `/agency/analytics`, `/client`. Verific:
- light + dark mode,
- mobile 375px + desktop,
- toate butoanele pill, toate cardurile rotunjite mari cu shadow soft,
- niciun import rupt, niciun text schimbat, fluxurile existente intacte.

## Fișiere atinse

1. `src/index.css` — tokens, shadows, fonts, utilities.
2. `tailwind.config.ts` — radius, shadow, fontFamily.
3. `src/components/ui/button.tsx` — pill + variants.
4. `src/components/ui/card.tsx` — rounded-3xl + shadow-soft.
5. `src/components/ui/input.tsx`, `select.tsx`, `textarea.tsx` — pill / rounded-2xl.
6. `src/components/ui/badge.tsx` — variante semantice.
7. `src/components/ui/status-pill.tsx` — NOU (wrapper opțional).
8. `src/components/MetricCard.tsx` — layout nou + `featured`.
9. `src/components/AgencyLayout.tsx` — sidebar secționat, topbar cu search/chip user.
10. `src/components/PageHeader.tsx` — titluri mai mari.
11. `src/pages/client/ClientPortal.tsx` — header + container (cosmetic).

Nimic altceva. Restul aplicației moștenește stilul automat.