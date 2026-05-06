// Compute embeddings for ai_memory entries (text-embedding-3-small).
import { corsHeaders, jsonResponse, userClient, requireUser, serviceClient, OPENAI_API_KEY, OPENAI_BASE_URL } from "../_shared/openai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const { memory_id } = await req.json();
    if (!memory_id) return jsonResponse({ error: "Bad request" }, 400);
    const { data: row } = await supa.from("ai_memory").select("id,agency_id,title,content").eq("id", memory_id).maybeSingle();
    if (!row) return jsonResponse({ error: "Not found" }, 404);

    const resp = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: `${row.title}\n${row.content}` }),
    });
    if (!resp.ok) return jsonResponse({ error: await resp.text() }, resp.status);
    const data = await resp.json();
    const vec = data.data?.[0]?.embedding;
    if (!vec) return jsonResponse({ error: "No embedding" }, 500);
    // Use service to bypass RLS write column type
    const { error } = await svc.from("ai_memory").update({ embedding: vec as any }).eq("id", memory_id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
