// Execute an approved AI action with the user's identity (RLS enforced).
import { corsHeaders, jsonResponse, userClient, requireUser, serviceClient, logEvent } from "../_shared/openai.ts";

const CRITICAL: Record<string, true> = { delete_post: true, send_strategy_to_client: true, modify_billing: true };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const { action_id } = await req.json();
    if (!action_id) return jsonResponse({ error: "Bad request" }, 400);
    const { data: action } = await supa.from("ai_actions").select("*").eq("id", action_id).maybeSingle();
    if (!action) return jsonResponse({ error: "Not found" }, 404);
    if (action.status !== "approved") return jsonResponse({ error: "Action not approved" }, 400);

    if (CRITICAL[action.action_type]) {
      const { data: m } = await supa.from("agency_members").select("role").eq("agency_id", action.agency_id).eq("user_id", userId).maybeSingle();
      if (!m || !["agency_owner", "saas_admin"].includes(m.role)) {
        return jsonResponse({ error: "Critical action requires owner role" }, 403);
      }
    }

    let result: any = { ok: true };
    try {
      switch (action.action_type) {
        case "create_task": {
          const { data, error } = await supa.from("monthly_goals").insert({
            agency_id: action.agency_id, client_id: action.client_id,
            objective: action.payload.objective, metric: action.payload.metric, target: action.payload.target,
            month: action.payload.month ?? new Date().toISOString().slice(0, 10),
          }).select("id").single();
          if (error) throw error;
          result = { goal_id: data.id };
          break;
        }
        case "create_content_post": {
          const { data, error } = await supa.from("content_posts").insert({
            agency_id: action.agency_id, client_id: action.client_id,
            title: action.payload.title, hook: action.payload.hook, caption: action.payload.caption,
            platform: action.payload.platform, content_type: action.payload.content_type,
            scheduled_for: action.payload.scheduled_for ?? null, status: "idea",
          }).select("id").single();
          if (error) throw error;
          result = { post_id: data.id };
          break;
        }
        case "send_strategy_to_client": {
          const { error } = await supa.from("monthly_strategies").update({
            status: "sent_to_client", sent_to_client_at: new Date().toISOString(),
          }).eq("id", action.payload.strategy_id);
          if (error) throw error;
          break;
        }
        case "code_suggestion":
          // No-op: maintainer suggestions are review-only.
          result = { acknowledged: true };
          break;
        default:
          throw new Error(`Unknown action_type: ${action.action_type}`);
      }
      await supa.from("ai_actions").update({ status: "executed", executed_at: new Date().toISOString(), result }).eq("id", action_id);
      await logEvent(svc, action.agency_id, "info", "ai_action_executed", { action_id, action_type: action.action_type }, userId);
      return jsonResponse({ ok: true, result });
    } catch (e: any) {
      await supa.from("ai_actions").update({ status: "failed", result: { error: e.message } }).eq("id", action_id);
      await logEvent(svc, action.agency_id, "error", "ai_action_failed", { action_id, error: e.message }, userId);
      return jsonResponse({ error: e.message }, 500);
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
