// AI Action Approval & Execution dispatcher.
// Single endpoint for approve | reject | execute, with risk-vs-role gating.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, logEvent } from "../_shared/openai.ts";

type Decision = "approve" | "reject" | "execute";

const ALLOWED_TYPES = new Set([
  "create_task","update_task","create_content_idea","create_calendar_item",
  "generate_report","send_report_to_client","create_strategy",
  "update_prompt_version","create_lovable_prompt",
  "suggest_database_change","suggest_ui_change","suggest_pricing_change","suggest_security_change",
]);

function canApprove(risk: string, role: string | null, isOwner: boolean, isAdmin: boolean) {
  if (isAdmin) return true;
  if (risk === "critical") return false;
  if (risk === "high") return isOwner;
  return role === "agency_owner" || role === "agency_team" || isOwner;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);

    const { action_id, decision, edited_payload, rejection_reason } = await req.json() as {
      action_id?: string; decision?: Decision; edited_payload?: any; rejection_reason?: string;
    };
    if (!action_id || !decision || !["approve","reject","execute"].includes(decision)) {
      return jsonResponse({ error: "Bad request" }, 400);
    }

    const { data: action } = await svc.from("ai_action_requests").select("*").eq("id", action_id).maybeSingle();
    if (!action) return jsonResponse({ error: "Not found" }, 404);

    const { data: profile } = await svc.from("profiles").select("role,is_saas_admin").eq("id", userId).maybeSingle();
    const isAdmin = !!profile?.is_saas_admin;
    let isOwner = isAdmin;
    if (action.agency_id && !isAdmin) {
      const { data: m } = await svc.from("agency_members").select("role").eq("agency_id", action.agency_id).eq("user_id", userId).maybeSingle();
      if (!m) return jsonResponse({ error: "Forbidden" }, 403);
      isOwner = m.role === "agency_owner";
    }

    if (decision === "reject") {
      if (action.status !== "pending") return jsonResponse({ error: "Only pending can be rejected" }, 400);
      await svc.from("ai_action_requests").update({
        status: "rejected", rejected_by: userId, rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason ?? null,
      }).eq("id", action_id);
      await logEvent(svc, action.agency_id, "info", "ai_action_rejected", { action_id, action_type: action.action_type }, userId);
      return jsonResponse({ ok: true, status: "rejected" });
    }

    if (decision === "approve") {
      if (action.status !== "pending") return jsonResponse({ error: "Only pending can be approved" }, 400);
      if (!canApprove(action.risk_level, profile?.role ?? null, isOwner, isAdmin)) {
        return jsonResponse({ error: `Insufficient role to approve ${action.risk_level} risk` }, 403);
      }
      await svc.from("ai_action_requests").update({
        status: "approved", approved_by: userId, approved_at: new Date().toISOString(),
        ...(edited_payload !== undefined ? { edited_payload } : {}),
      }).eq("id", action_id);
      await logEvent(svc, action.agency_id, "info", "ai_action_approved", { action_id, action_type: action.action_type, risk: action.risk_level }, userId);
      return jsonResponse({ ok: true, status: "approved" });
    }

    // EXECUTE
    if (action.status !== "approved") return jsonResponse({ error: "Action must be approved before execute" }, 400);
    if (!canApprove(action.risk_level, profile?.role ?? null, isOwner, isAdmin)) {
      return jsonResponse({ error: `Insufficient role to execute ${action.risk_level} risk` }, 403);
    }
    if (!ALLOWED_TYPES.has(action.action_type)) {
      return jsonResponse({ error: `Unknown action_type: ${action.action_type}` }, 400);
    }

    const payload = action.edited_payload ?? action.payload ?? {};
    let result: any = { acknowledged: true };
    try {
      switch (action.action_type) {
        case "create_task": {
          const { data, error } = await supa.from("tasks").insert({
            agency_id: action.agency_id, client_id: action.client_id ?? null,
            title: payload.title ?? action.title,
            description: payload.description ?? action.description ?? null,
            status: payload.status ?? "todo",
            priority: payload.priority ?? "medium",
            due_date: payload.due_date ?? null,
            assigned_to: payload.assigned_to ?? null,
          }).select("id").single();
          if (error) throw error;
          result = { task_id: data.id }; break;
        }
        case "update_task": {
          const { id, ...patch } = payload;
          if (!id) throw new Error("payload.id required");
          const { error } = await supa.from("tasks").update(patch).eq("id", id);
          if (error) throw error;
          result = { updated: id }; break;
        }
        case "create_content_idea":
        case "create_calendar_item": {
          const { data, error } = await supa.from("content_posts").insert({
            agency_id: action.agency_id, client_id: action.client_id,
            title: payload.title ?? action.title,
            hook: payload.hook ?? null, caption: payload.caption ?? null,
            platform: payload.platform ?? "instagram",
            content_type: payload.content_type ?? "post",
            scheduled_for: payload.scheduled_for ?? null,
            status: action.action_type === "create_calendar_item" ? "scheduled" : "idea",
          }).select("id").single();
          if (error) throw error;
          result = { post_id: data.id }; break;
        }
        case "create_strategy": {
          const { data, error } = await supa.from("monthly_strategies").insert({
            agency_id: action.agency_id, client_id: action.client_id,
            month: payload.month ?? new Date().toISOString().slice(0,10),
            content: payload.content ?? {},
            status: "draft",
          }).select("id").single();
          if (error) throw error;
          result = { strategy_id: data.id }; break;
        }
        case "generate_report": {
          // Mark intent only — actual generation happens in dedicated edge functions.
          result = { queued: true, note: "Trigger report generator separately." }; break;
        }
        case "send_report_to_client": {
          if (!isAdmin && !isOwner) throw new Error("Only owner or admin can send reports");
          if (!payload.report_id) throw new Error("payload.report_id required");
          const { error } = await supa.from("monthly_reports").update({
            status: "sent", sent_at: new Date().toISOString(),
          }).eq("id", payload.report_id);
          if (error) throw error;
          result = { sent: payload.report_id }; break;
        }
        case "update_prompt_version": {
          if (!isAdmin) throw new Error("Only super admin can flip active prompt version");
          if (!payload.prompt_id) throw new Error("payload.prompt_id required");
          const { data: target } = await svc.from("ai_prompts").select("key,agency_id").eq("id", payload.prompt_id).maybeSingle();
          if (!target) throw new Error("prompt not found");
          await svc.from("ai_prompts").update({ is_active: false }).eq("key", target.key).match({ agency_id: target.agency_id });
          await svc.from("ai_prompts").update({ is_active: true }).eq("id", payload.prompt_id);
          result = { activated: payload.prompt_id }; break;
        }
        case "create_lovable_prompt":
        case "suggest_ui_change":
        case "suggest_database_change":
        case "suggest_pricing_change":
        case "suggest_security_change": {
          // Review-only. Execution = acknowledgement; humans act in Lovable / DB.
          result = { acknowledged: true, note: "Review-only suggestion. No automated mutation performed." };
          break;
        }
      }
      await svc.from("ai_action_requests").update({
        status: "executed", executed_at: new Date().toISOString(), execution_result: result,
      }).eq("id", action_id);
      await logEvent(svc, action.agency_id, "info", "ai_action_executed", { action_id, action_type: action.action_type }, userId);
      return jsonResponse({ ok: true, status: "executed", result });
    } catch (e: any) {
      await svc.from("ai_action_requests").update({
        status: "failed", execution_error: String(e?.message ?? e),
      }).eq("id", action_id);
      await logEvent(svc, action.agency_id, "error", "ai_action_failed", { action_id, error: String(e?.message ?? e) }, userId);
      return jsonResponse({ error: String(e?.message ?? e) }, 500);
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
