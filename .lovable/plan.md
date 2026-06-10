# Rapoarte – funcțional + UX polish

Scop: pagina **Rapoarte** și editorul devin complet în română, capătă **vedere read** premium, **export PDF** prin route dedicată, și sunt cablate corect și în **portalul clientului**. Funcția edge `ai-report` și providerul AI rămân neatinse (Gemini).

## 1. Traduceri în română (ReportEditor + toasturi)
În `src/components/reports/ReportEditor.tsx`:
- Titluri sheet: "Raport nou" / "Editează raport".
- Labels: Titlu, Client, Status, Început perioadă, Sfârșit perioadă, Rezumat, Momente cheie, Recomandări, Snapshot metrici.
- Card "Vizibil pentru client" cu descriere conversațională ("Lasă clientul să-l vadă în portalul lui.").
- Card "Generare cu AI" + buton **Generează**, descriere: "Trag metricile clientului și-ți pregătesc o schiță de raport pentru perioada aleasă."
- Butoane: Salvează / Anulează / Șterge / Adaugă.
- Toasturi: "Alege întâi clientul și perioada", "Raport generat", "N-am putut genera raportul", "Lipsesc câmpuri obligatorii", "Raport salvat", "Raport șters", confirm: "Ștergi raportul ăsta?".
- Default title: "Raport lunar".
- În `src/lib/reports.ts` traduc labelurile `REPORT_STATUSES` (Schiță / Gata / Trimis) — value-urile rămân la fel.
- `formatPeriod` primește locale `ro-RO`.

## 2. Vedere de raport (read mode) — premium
Nou: `src/components/reports/ReportView.tsx` — Sheet larg, layout curat:
- Header: logo agenție (din `agency.logo_url`) + nume client + perioadă, separator subtil, StatusPill, badge "Vizibil pentru client".
- Secțiuni: **Rezumat**, **Momente cheie** (listă cu bullets soft), **Recomandări**, **Snapshot metrici** (grid cu carduri soft-UI roșu brand).
- Footer: butoane **Editează** (deschide `ReportEditor`) și **Descarcă PDF** (deschide `/agency/reports/:id/print` într-un tab nou; declanșează `window.print()` automat).

Click pe card raport în Reports.tsx și ClientReportsTab.tsx → deschide **ReportView** (nu editorul direct).

## 3. Export PDF — print route
Nou: `src/pages/agency/ReportPrint.tsx` (după pattern-ul `StrategyPrint.tsx`).
- Route nouă: `/agency/reports/:id/print` în `src/App.tsx`.
- Route portal client: `/client/reports/:id/print` (cu role guard `client_viewer`) — încarcă raportul cu `client_visible=true`.
- Layout A4-friendly: header cu **logo agenție** + **logo client** (`clients.logo_url`), titlu, perioadă, rezumat, metrici, momente cheie, recomandări, footer cu data generării.
- CSS print: `@media print` ascunde nav, padding 0, font legibil, page-breaks între secțiuni.
- `setTimeout(window.print, 600)` ca în StrategyPrint.

Buton "Descarcă PDF" disponibil în ReportView (agenție) și `ClientReportsView` (portal client).

## 4. Polish pagină Reports.tsx
- Cards soft-UI (deja există kit-ul) + StatusPill în loc de Badge.
- Filtre: client (există) + perioadă (last 3 / 6 / 12 luni / toate) + status.
- Loading skeleton (3 carduri), error state cu `ErrorState` + buton Reîncearcă, empty state RO conversațional.
- Click card → ReportView (nu editor).
- Responsive: grid 1/2/3 coloane (deja ok), filtre wrap pe mobil.

## 5. Portal client (`ClientReportsView.tsx`)
- Trad RO complet ("Rapoartele tale", "Niciun raport încă", "Rapoartele trimise de agenția ta apar aici.").
- Click pe card → deschide o vedere read frumoasă (același `ReportView` reused, fără butonul Editează, doar Descarcă PDF).
- Loading & error states.

## 6. (Opțional) AI — limba RO
În `supabase/functions/ai-report/index.ts` adaug **o singură linie** în system prompt: "Răspunde DOAR în limba română."  
Nu schimb providerul/modelul.

## 7. Teste
- Unit nou: `src/lib/__tests__/reports.test.ts` — `formatPeriod` (format ro-RO, interval valid), `defaultPeriod` (luna trecută completă).
- Manual E2E în tenantul de test: client cu videoclipuri → generez raport → văd rezumat/highlights/recomandări → salvez → apare în listă → deschid vederea → "Descarcă PDF" → toggle "Vizibil pentru client" → login client_viewer → văd raportul + descarc PDF.

## Detalii tehnice
- Fișiere noi: `src/components/reports/ReportView.tsx`, `src/pages/agency/ReportPrint.tsx`, `src/lib/__tests__/reports.test.ts`.
- Fișiere editate: `src/pages/agency/Reports.tsx`, `src/components/reports/ReportEditor.tsx`, `src/components/reports/ClientReportsTab.tsx`, `src/components/reports/ClientReportsView.tsx`, `src/lib/reports.ts`, `src/App.tsx`, opțional `supabase/functions/ai-report/index.ts`.
- Fără tabele noi, fără migrări. RLS existent pe `reports` permite deja `client_visible=true` pentru `client_users` (verific la implementare; dacă nu, adaug policy SELECT — atunci, și doar atunci, fac migrare separată).
- PDF prin `window.print()` în route dedicat (zero dep noi), exact ca StrategyPrint.
