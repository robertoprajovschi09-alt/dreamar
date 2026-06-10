## Plan: Hub de Conținut per client + formular reproiectat

### 1) Pagina `/agency/content` — HUB
Refactor `src/pages/agency/Content.tsx` într-un hub centrat pe client.

**Bară de sus (sticky, soft-UI):**
- Selector client proeminent (chip cu avatar + dropdown searchable; opțiune „Toți clienții"). Persistă selecția în URL (`?client=...`).
- Search după titlu (pill input cu lupă).
- Filtru status (multi-pill) + filtru platformă.
- Toggle vedere: **Board** / **Listă** (Tabs pill, default Board).
- Buton primar pill: „+ Conținut nou".

**Vedere BOARD (kanban, default):**
- 7 coloane fixe:
  1. **Idee** — `idea`
  2. **Script** — `script`, `draft`
  3. **Filmare** — `filming`
  4. **Montaj** — `editing`, `internal_review`
  5. **Spre aprobare** — `ready_for_client`, `sent_for_approval`, `pending_approval`, `changes_requested`, `rejected` (ultimele 2 cu marcaj „⚠ Schimbări cerute" / „✕ Respins" pe card)
  6. **Programat** — `scheduled`, `approved`
  7. **Publicat** — `published`, `posted`, `analyzed`
- Drag-and-drop cu `@dnd-kit/core` + `@dnd-kit/sortable`. La drop → `update content_posts.status` la **statusul canonic** al coloanei (Idee→`idea`, Script→`script`, Filmare→`filming`, Montaj→`editing`, Spre aprobare→păstrează curentul dacă e deja în set altfel `ready_for_client`, Programat→`scheduled`, Publicat→`published`). Mapare extrasă în `src/lib/contentBoard.ts` (testabilă).
- Optimistic update + toast + rollback la eroare.
- **Card** (soft-UI, `rounded-2xl`, shadow-soft): thumbnail 16:9 (din `thumbnail_url` sau prima imagine din `assets`, placeholder gradient când lipsește), titlu (clamp-2), rând cu chip client + pill platformă + StatusPill, hook preview (1 linie italică „„…""), footer: dată programată (icon calendar) + avatar `assigned_to`. Click → deschide editorul.
- Header coloană: nume + count + pill cu numărul de overdue (deadline trecut).
- Empty state per coloană: „Trage aici sau adaugă din +".

**Vedere LISTĂ:**
- Tabelul existent restilizat (StatusPill, thumbnail mic, sortare pe titlu/dată/status, hover row, click → editor).

**Pe `ClientProfile`:**
- Adaugă tab „Pipeline" (sau secțiune) care randează același `<ContentBoard clientId={id} />` filtrat — componentă extrasă reutilizabilă.

### 2) Formular „Conținut nou" — `ContentEditor` reproiectat
Refactor `src/components/content/ContentEditor.tsx`. Sheet larg (max-w-2xl), structurat pe secțiuni cu titluri prietenoase. Copy 100% RO.

**Secțiuni:**
1. **Context** — „Pentru cine?" (client), „Unde postăm?" (platformă cu iconițe), „Ce fel de conținut?" (content_type + format opțional).
2. **Titlu de lucru** — input mare, placeholder „Cum îi spunem internă acestei piese?"
3. **HOOK → BODY → CTA** (card cu 3 textarea, fiecare cu helper text):
   - Hook: „Primele 3 secunde" / „Ce-i oprește din scroll? Scrie cârligul…"
   - Body/Script: „Mesajul" / „Explică simplu, fără teorie. Ce vrei să rămână cu ei?"
   - CTA: „Ce fac mai departe?" / „Spune-le exact ce să facă: sună, scrie, rezervă…"
   - Plus „Caption" colapsabil mai jos cu „Textul de sub postare".
4. **Planificare** — „În ce etapă e?" (status, segmented pill), „Când iese?" (datetime), „Deadline intern" (opțional).
5. **Fișiere** — drop-zone upload în bucket `agency-files` la path `content/{agency_id}/{post_id || tmp}/{filename}`. Salvează în `assets` jsonb ca `[{path, name, type, size, uploaded_at}]`. Thumbnail = prima imagine sau setabil manual.
6. **Echipă & note** — „Cine se ocupă?" (membri agenție din `agency_members` join `profiles`), „Notițe interne" (`agency_notes`).

**Funcționalitate:**
- Validare blândă: client + titlu obligatoriu, restul ghidat.
- Toast succes/eroare, loading states.
- Editare folosește același sheet (deja face asta).
- „+ Conținut nou" pe board pre-selectează coloana → status default.

### 3) Migrare DB (opțional, pregătire AI reports)
`supabase/migrations/<ts>_videos_link_post.sql`:
- `ALTER TABLE public.videos ADD COLUMN content_post_id uuid REFERENCES public.content_posts(id) ON DELETE SET NULL;`
- Index `idx_videos_post`.
- Fără alte modificări.

### 4) Fișiere
- `src/pages/agency/Content.tsx` — refactor (hub: filtre + toggle + render board/list)
- `src/components/content/ContentBoard.tsx` — **NOU** (kanban dnd-kit, reutilizabil; prop `clientId?`)
- `src/components/content/ContentCard.tsx` — **NOU** (card kanban)
- `src/components/content/ContentList.tsx` — **NOU** (extras din tabelul curent, restilizat)
- `src/lib/contentBoard.ts` — **NOU** (definiția coloanelor + `statusToColumn`, `columnToStatus`)
- `src/lib/__tests__/contentBoard.test.ts` — **NOU** (unit pe mapare)
- `src/components/content/ContentEditor.tsx` — rescris (secțiuni + upload)
- `src/components/content/AssetUploader.tsx` — **NOU** (drag-drop → Storage `agency-files`)
- `src/pages/agency/ClientProfile.tsx` — adaugă montarea `<ContentBoard clientId>` (verific tabs existente)
- `supabase/migrations/<ts>_videos_link_post.sql` — `content_post_id` pe `videos`

### 5) Teste
- Unit: `statusToColumn`/`columnToStatus` (toate enum values mapate, drag într-o coloană setează status canonic, status deja în setul coloanei rămâne nemodificat).
- Manual E2E (tenant test): creare cu upload → apare în coloana corectă → drag schimbă status → filtru client funcționează → editare păstrează datele.

### Note non-scope
- Fără modificări la AI/Gemini.
- Fără tabele noi (doar 1 coloană pe `videos`, opțional).
- Texte UI 100% în română, ton conversațional.
