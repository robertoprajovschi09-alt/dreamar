import { supabase } from "@/integrations/supabase/client";

export type AiActionRiskLevel = "low" | "medium" | "high" | "critical";
export type AiActionType =
  | "create_task" | "update_task" | "create_content_idea" | "create_calendar_item"
  | "generate_report" | "send_report_to_client" | "create_strategy"
  | "update_prompt_version" | "create_lovable_prompt"
  | "suggest_database_change" | "suggest_ui_change" | "suggest_pricing_change" | "suggest_security_change";

const DEFAULT_RISK: Record<AiActionType, AiActionRiskLevel> = {
  create_content_idea: "low", suggest_ui_change: "low",
  create_task: "medium", update_task: "medium", create_calendar_item: "medium",
  create_strategy: "medium", create_lovable_prompt: "medium", generate_report: "medium",
  send_report_to_client: "high", update_prompt_version: "high",
  suggest_database_change: "critical", suggest_pricing_change: "critical", suggest_security_change: "critical",
};

export function defaultRiskFor(t: AiActionType): AiActionRiskLevel { return DEFAULT_RISK[t] ?? "medium"; }

export async function requestAiAction(args: {
  agency_id: string | null;
  client_id?: string | null;
  action_type: AiActionType;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
  reasoning?: string;
  risk_level?: AiActionRiskLevel;
  requested_by_ai_output_id?: string | null;
}) {
  const { data, error } = await supabase.from("ai_action_requests").insert({
    agency_id: args.agency_id ?? undefined,
    client_id: args.client_id ?? undefined,
    action_type: args.action_type,
    title: args.title,
    description: args.description ?? undefined,
    payload: (args.payload ?? {}) as any,
    reasoning: args.reasoning ?? undefined,
    risk_level: args.risk_level ?? defaultRiskFor(args.action_type),
    requested_by_ai_output_id: args.requested_by_ai_output_id ?? undefined,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function decideAiAction(action_id: string, decision: "approve" | "reject" | "execute", opts: { edited_payload?: any; rejection_reason?: string } = {}) {
  const { data, error } = await supabase.functions.invoke("ai-action-decide", {
    body: { action_id, decision, ...opts },
  });
  if (error) throw error;
  return data;
}
