// Source-cited memory upsert. Validates auth + agency membership and enforces
// that every memory item carries a non-empty source_type and source_id.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser } from "../_shared/openai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const body = await req.json().catch(() => ({}));
    const {
      id = null,
      agency_id,
      client_id = null,
      memory_type,
      title,
      content,
      source_type,
      source_id,
      confidence_score = 0.5,
      visibility = "internal_agency",
      is_active = true,
    } = body || {};

    if (!agency_id || !memory_type || !title || !content) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }
    if (!source_type || !String(source_type).trim() || !source_id || !String(source_id).trim()) {
      return jsonResponse({ error: "source_type and source_id are required (no memory without a source)" }, 400);
    }

    const { data: profile } = await svc.from("profiles")
      .select("is_saas_admin").eq("id", userId).maybeSingle();
    const isAdmin = !!profile?.is_saas_admin;

    if (!isAdmin) {
      const { data: mem } = await svc.from("agency_members")
        .select("user_id").eq("user_id", userId).eq("agency_id", agency_id).maybeSingle();
      if (!mem) return jsonResponse({ error: "Forbidden" }, 403);
    }

    const row = {
      agency_id, client_id, memory_type, title, content,
      source_type, source_id,
      confidence_score, visibility, is_active,
      created_by: userId,
    };

    if (id) {
      const { data, error } = await svc.from("ai_memory_items")
        .update({ ...row, created_by: undefined })
        .eq("id", id).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ memory: data });
    }
    const { data, error } = await svc.from("ai_memory_items").insert(row).select().single();
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ memory: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});