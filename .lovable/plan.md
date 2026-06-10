# Plan: Conexiune client↔agenție + fix-uri Clienți

Fără modificări AI/Gemini. Migrări ca fișiere în `supabase/migrations`. Kit soft-UI, copy în română.

## 1. Bug draft „Continuă" în AddClientWizard

Fișier: `src/components/client/AddClientWizard.tsx`

Cauze probabile (defensiv le acoperim pe toate):
- `continueDraft` parsează corect, dar dacă draftul vechi are shape diferit, merge-ul `{...empty, ...parsed.form}` poate lăsa câmpuri nested (logo, niche, kpis, custom_fields) într-o stare invalidă → render-ul aruncă silent și dialogul pare „înghețat".
- `setStep` poate primi un index în afara range-ului dacă numărul de pași s-a schimbat.
- Autosave-ul se reactivează imediat după click și poate suprascrie draftul cu starea pe jumătate aplicată dacă `setForm`/`setStep` sunt în loturi diferite.

Fix:
- Înfășor parsarea într-un helper `loadDraft()` care:
  - face `JSON.parse` în try/catch; la eroare → `clearDraft()` + toast „Draft corupt, am pornit gol" + `setHasDraft(false)`, fără să blocheze deschiderea.
  - validează shape-ul (chei obligatorii din `empty`, normalizează array-urile `kpis`, `custom_fields`, `platforms`).
  - clamp pe `step` între 1 și numărul total de pași.
- `continueDraft` aplică starea într-un singur `flushSync`-style: setForm + setStep + setDraftLoaded(true) + setHasDraft(false), apoi un `setTimeout(()=>autosave, 0)` evită race-ul cu efectul de autosave (sau adaug un `useRef` `skipNextAutosave` ca să sară un tick).
- „Șterge" → `clearDraft()` + reset complet la `empty`/`step=1` (deja făcut, dar adaug toast „Draft șters").
- Adaug `console.warn` în catch ca să nu mai treacă silențios.

## 2. Brand color + logo pe dashboard client

Fișiere:
- `src/components/client/ClientDashboard.tsx` (vederea agenției)
- `src/pages/client/ClientPortal.tsx` (portalul clientului)
- helper nou: `src/lib/brandTheme.ts` cu `applyBrandTheme(brand_color?: string)` care setează variabile CSS scoped (`--brand`, `--brand-foreground`, `--brand-soft`) pe un wrapper, fallback `hsl(var(--primary))` (roșu brand).

Aplicare:
- Wrapper `<div style={brandStyle}>` în jurul dashboard-ului + portalului. Componentele KPI/secțiuni folosesc `var(--brand)` (înlocuiesc `text-primary`/`bg-primary` pe acele zone cu clase utilitare care citesc variabila — fără să schimb tokenii globali).
- Header-ul afișează `logo_url` (rotund, 32–40px) lângă numele clientului, cu fallback la inițiale.
- Convertesc hex → HSL în helper ca să rămânem compatibili cu design system.

## 3. Real-time client↔agenție

### 3a. Migrare publicație
Fișier nou: `supabase/migrations/<ts>_realtime_client_sync.sql`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_briefs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_posts;
ALTER TABLE public.client_feedback REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_goals   REPLICA IDENTITY FULL;
ALTER TABLE public.client_briefs   REPLICA IDENTITY FULL;
ALTER TABLE public.content_posts   REPLICA IDENTITY FULL;
```

### 3b. RLS pentru goals din partea clientului (în aceeași migrare)
```sql
CREATE POLICY "client viewers insert their goals"
  ON public.monthly_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_client_viewer_of(auth.uid(), client_id));
CREATE POLICY "client viewers update their goals"
  ON public.monthly_goals FOR UPDATE TO authenticated
  USING (public.is_client_viewer_of(auth.uid(), client_id))
  WITH CHECK (public.is_client_viewer_of(auth.uid(), client_id));
```
(verific mai întâi cu `supabase--read_query` ce policies există ca să nu duplicăm)

### 3c. Subscripții realtime în UI
Helper nou: `src/lib/realtime.ts` → `subscribeTable({table, filter, onChange})` care întoarce un cleanup. Folosit în:
- `src/pages/agency/AgencyDashboard.tsx` — feedback + goals + approvals + briefs filtrate pe `agency_id`.
- `src/pages/agency/Approvals.tsx` — `content_approvals` + `content_posts` pe `agency_id` (refetch la INSERT/UPDATE).
- `src/pages/agency/ClientProfile.tsx` — toate cele 4 tabele filtrate pe `client_id`.
- `src/pages/client/ClientPortal.tsx` — `content_posts`, `tasks`, `reports`, `monthly_goals` pe `client_id` (ce trimite agenția).
- Componentele care listează feedback/goals refac fetch-ul prin callback.

## 4. Onboarding brief — date exacte

Fișiere: `src/components/client/BriefWizard.tsx`, `src/lib/brief.ts`, `src/pages/agency/ClientProfile.tsx`.

- Verific maparea câmp ↔ coloană în `client_briefs` (24 coloane) și mă asigur că payload-ul de `upsert` include TOATE câmpurile din form (audience, goals, tone, do/don't, brand_values, competitors, channels, budget, etc.).
- Pentru câmpuri array/jsonb folosesc `[]`/`{}` în loc de `null` ca să nu pierdem la roundtrip.
- Pe profilul clientului (tab Brief) adaug afișarea completă a tuturor câmpurilor brief (read-only, soft-UI), nu doar un subset, plus timestamp `submitted_at`.
- Unit test în `src/lib/__tests__/brief.test.ts`: `serializeBrief(form)` păstrează toate cheile.

## Fișiere atinse

**Migrare nouă**
- `supabase/migrations/<ts>_realtime_client_sync.sql`

**Cod nou**
- `src/lib/brandTheme.ts`
- `src/lib/realtime.ts`
- `src/lib/__tests__/brief.test.ts`

**Editate**
- `src/components/client/AddClientWizard.tsx` (draft)
- `src/components/client/ClientDashboard.tsx` (brand)
- `src/pages/client/ClientPortal.tsx` (brand + realtime)
- `src/pages/agency/AgencyDashboard.tsx` (realtime)
- `src/pages/agency/Approvals.tsx` (realtime)
- `src/pages/agency/ClientProfile.tsx` (realtime + brief tab complet)
- `src/components/client/BriefWizard.tsx` + `src/lib/brief.ts` (salvare exactă)

## Teste manuale (2 sesiuni)
1. Draft: deschid wizard, completez până la pasul 3, închid → redeschid → „Continuă" reia pe pasul 3 cu datele. „Șterge" → pornește gol.
2. Brand: setez `brand_color=#1E88E5` pe un client → dashboard agenție + portal client se colorează; logo apare în header.
3. Realtime: în sesiunea client → aprob un post / scriu feedback / propun un goal / completez brief; agenția vede live fără refresh. Invers: agenția creează un goal/post → apare live la client.
4. RLS: clientul nu poate scrie goals pentru alt client (verific cu un al doilea client_id).

## Non-goals
- Nu ating ai-* edge functions, nu schimb providerul AI.
- Nu modific schema `content_approvals` (deja în publicație).
- Nu touchez tokenii globali din `index.css`.
