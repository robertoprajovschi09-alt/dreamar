# AI Knowledge Base & Memory

Builds a controlled, source-cited memory layer the AI uses (never invents) on top of the existing `ai_memory` table (which we keep for backward compatibility with the current `AiMemory.tsx` page).

## 1. Database (migration)

### Enums
- `ai_memory_type`: `agency_preference`, `client_brand_voice`, `client_goal`, `niche_insight`, `content_pattern`, `winning_hook`, `failed_hook`, `reporting_preference`, `business_context`, `audience_insight`, `competitor_insight`
- `ai_memory_visibility`: `internal_agency`, `client_visible`, `super_admin_only`
- `ai_knowledge_source_status`: `pending`, `processing`, `processed`, `failed`, `archived`

### Table `ai_memory_items`
Columns: `id`, `agency_id` (not null), `client_id` (nullable), `memory_type` (enum), `title`, `content`, `source_type` (text, **not null**), `source_id` (text, **not null**), `confidence_score` (numeric, default 0.5), `is_active` (bool default true), `visibility` (enum default `internal_agency`), `created_by` (uuid), `created_at`, `updated_at`. Trigger `tg_set_updated_at`. CHECK ensuring `source_type` and `source_id` are non-empty (rule: AI can never save memory without a source).

### Table `ai_knowledge_sources`
Columns: `id`, `agency_id`, `client_id` nullable, `source_type` (e.g. `document`, `report`, `brief`, `feedback`, `analytics`, `competitor`), `source_id`, `title`, `content_summary` (text), `extracted_facts` (jsonb), `status` (enum), `last_processed_at`, `created_at`, `updated_at`. Unique `(agency_id, source_type, source_id)`.

### RLS
- **Read** `ai_memory_items`:
  - `is_saas_admin(auth.uid())` → all
  - `is_member_of(auth.uid(), agency_id)` AND `visibility <> 'super_admin_only'` → agency members see internal + client_visible
  - `is_client_viewer_of(auth.uid(), client_id)` AND `visibility = 'client_visible'` → client users only see `client_visible`
- **Insert/Update/Delete**: agency members or saas_admin. Client viewers cannot write.
- `ai_knowledge_sources`: read/write for agency members + saas_admin; client viewer no access.

## 2. Edge functions

- **`ai-memory-upsert`**: validates auth + agency membership, requires `source_type` + `source_id`, inserts/updates an `ai_memory_items` row. Used by other AI functions (e.g. report generation that wants to remember a winning hook from a specific post).
- **`ai-knowledge-ingest`**: takes a source (document/report/feedback/brief), summarizes content with Lovable AI (gemini-2.5-flash), extracts structured `facts[]` JSON, stores in `ai_knowledge_sources`, and (optionally) proposes one or more `ai_memory_items` via the existing `ai_action_requests` queue (so a human approves before the memory goes live for high-impact types like `client_brand_voice`).
- Update **`openai-ai-core`** context loader: when `client_id` is present, loads relevant active `ai_memory_items` (filtered by visibility for the calling user’s role) and injects them into the system prompt under `KNOWN_FACTS:` with citations `[source_type:source_id]`. Also adds the rule: *"If no memory item is relevant, only use current data; never invent."*

## 3. Frontend

- **Rewrite `src/pages/agency/AiMemory.tsx`** to use `ai_memory_items`:
  - Tabs: *Memories* (list, filter by `memory_type`, `client`, `visibility`, `is_active`) and *Knowledge Sources* (list of ingested docs/reports/feedback with status + extracted facts preview).
  - Row actions: edit, toggle active, change visibility, delete. Each row shows source citation badge `source_type · source_id`.
  - "Add memory" dialog: requires title, content, type, visibility, client (optional), and **mandatory** source_type + source_id (or "manual" + free-text reference).
- **`src/lib/aiMemory.ts`** helper: `listMemories`, `upsertMemory`, `setMemoryActive`, `deleteMemory`, `listKnowledgeSources`, `ingestKnowledgeSource`.
- Existing `AiMemory.tsx`'s old `ai_memory` table queries are removed; old table is kept in DB but no longer surfaced in UI.

## 4. Rules enforced
- DB CHECK + edge function validation: no memory without `source_type`/`source_id`.
- Visibility filter in RLS prevents Client User from seeing internal/super_admin memories.
- AI core injects memory + citations; if none relevant, system prompt instructs "use only current data".
- Auto-ingestion proposals route through `ai_action_requests` for human approval before becoming active.

## Files
- `supabase/migrations/<ts>_ai_knowledge_base.sql`
- `supabase/functions/ai-memory-upsert/index.ts`
- `supabase/functions/ai-knowledge-ingest/index.ts`
- edit `supabase/functions/openai-ai-core/index.ts` (memory injection)
- `src/lib/aiMemory.ts`
- rewrite `src/pages/agency/AiMemory.tsx`
