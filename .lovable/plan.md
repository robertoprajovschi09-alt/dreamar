## Problemele

1. **Pierderea datelor** — în `AddClientWizard` (și alte formulare lungi) toate câmpurile sunt ținute doar în `useState`. Dacă schimbi tab-ul în browser, navighezi pe alt site sau dialogul se închide accidental, totul dispare.
2. **Scroll rămas în jos** — când navighezi între paginile din `/agency/*`, conținutul nou apare cu scroll-ul rămas de pe pagina anterioară (fereastra nu urcă în top).

## Ce voi face

### 1. Auto-save pentru wizard-ul de client

În `src/components/client/AddClientWizard.tsx`:
- Adaug un `useEffect` care, la orice schimbare a `form` sau `step`, salvează un draft în `localStorage` sub o cheie per agenție (ex. `addClient.draft.<agencyId>`).
- La deschiderea wizard-ului (`open === true`) încarc draft-ul existent (dacă e). Dacă există draft, afișez sus un mic banner: „Draft găsit — Continuă / Șterge".
- La submit reușit (sau la „Șterge draft") curăț cheia din localStorage.
- Form-ul rămâne montat doar când `open` e true; ca să nu pierdem nimic dacă utilizatorul închide accidental dialogul, salvarea se face live, nu doar la unmount.

### 2. Persistență și pe alte formulare cu draft util

Aplic același pattern minimal (autosave + restore) pe:
- `src/components/client/BriefWizard.tsx` (form lung)
- `src/components/client/QuickClientOnboarding.tsx`

Pentru dialoguri mici (edit client, etc.) nu e nevoie — sunt prea scurte ca să justifice complexitate. Dacă vrei și acolo, îmi spui după.

### 3. Scroll-to-top la fiecare schimbare de rută

Adaug un component nou `src/components/ScrollToTop.tsx` care folosește `useLocation` și, la fiecare schimbare de `pathname`, face `window.scrollTo(0, 0)` și (pentru layout-urile cu `main` scrollabil propriu) caută `main` și îl resetează la `scrollTop = 0`.

Îl montez în `src/App.tsx` chiar sub `<BrowserRouter>` ca să afecteze toată aplicația (agency, client portal, admin).

## Ce NU se schimbă

- Nu ating logica de auth, RLS, edge functions sau routing-ul existent.
- Nu schimb UI-ul wizard-ului — doar adaug un mic banner pentru draft.
- Draft-urile sunt strict locale (localStorage), nu se trimit în backend.

## Acceptance criteria

1. Începi să completezi un client în wizard, schimbi tab-ul / închizi accidental dialogul / dai refresh — la redeschidere apare „Draft găsit, continuă?" cu toate câmpurile intacte.
2. După salvare reușită, draft-ul e șters automat.
3. Navighezi de pe o pagină lungă (ex. Clients scrolat în jos) la altă pagină — pagina nouă apare scrolată sus.
4. Mobile (bottom nav) și desktop (sidebar) — ambele cazuri scroll la top.
