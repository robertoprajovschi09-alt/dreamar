// Shared OpenAI helpers + safety + logging for the AI Core Engine.
// Imported by ai-core-* edge functions.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
export const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.2";
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

export function userClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function requireUser(supabase: SupabaseClient, req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const token = auth.slice(7);
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return { userId: data.claims.sub as string, claims: data.claims };
}

export async function getActivePrompt(svc: SupabaseClient, key: string, agencyId?: string | null) {
  // prefer agency-specific active version, fallback to global
  if (agencyId) {
    const { data } = await svc.from("ai_prompts").select("*")
      .eq("key", key).eq("is_active", true).eq("agency_id", agencyId)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  const { data } = await svc.from("ai_prompts").select("*")
    .eq("key", key).eq("is_active", true).is("agency_id", null)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  return data;
}

// Cost rates per 1M tokens (USD). Tweak as needed.
const COST_RATES: Record<string, { in: number; out: number }> = {
  "gpt-5.5": { in: 5, out: 15 },
  "gpt-5.4": { in: 3, out: 10 },
  "gpt-5.4-mini": { in: 0.5, out: 2 },
  "gpt-5.2": { in: 2, out: 8 },
  "gpt-5": { in: 2.5, out: 10 },
  "gpt-5-mini": { in: 0.3, out: 1.2 },
  "gpt-5-nano": { in: 0.05, out: 0.2 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
};

export function estimateCost(model: string, tokensIn: number, tokensOut: number) {
  const r = COST_RATES[model] ?? { in: 1, out: 3 };
  return ((tokensIn * r.in) + (tokensOut * r.out)) / 1_000_000;
}

export type SafetyCheckResult = {
  action: "allow" | "warn" | "block" | "require_approval";
  flags: { rule_key: string; matched: string }[];
};

export async function runSafety(svc: SupabaseClient, agencyId: string | null, text: string): Promise<SafetyCheckResult> {
  const flags: { rule_key: string; matched: string }[] = [];
  let highest: SafetyCheckResult["action"] = "allow";
  const { data: rules } = await svc.from("ai_safety_rules").select("rule_key,pattern,action,enabled,agency_id")
    .eq("enabled", true)
    .or(`agency_id.is.null${agencyId ? `,agency_id.eq.${agencyId}` : ""}`);
  for (const r of rules ?? []) {
    try {
      const re = new RegExp(r.pattern, "i");
      const m = text.match(re);
      if (m) {
        flags.push({ rule_key: r.rule_key, matched: m[0].slice(0, 200) });
        if (r.action === "block") highest = "block";
        else if (r.action === "require_approval" && highest !== "block") highest = "require_approval";
        else if (r.action === "warn" && highest === "allow") highest = "warn";
      }
    } catch { /* ignore bad regex */ }
  }
  return { action: highest, flags };
}

export async function logRun(svc: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await svc.from("ai_prompt_runs").insert(row).select("id").single();
  if (error) console.error("logRun error", error);
  return data?.id as string | undefined;
}

export async function logEvent(svc: SupabaseClient, agencyId: string | null, level: string, event: string, payload: unknown, userId?: string | null) {
  await svc.from("ai_audit_events").insert({ agency_id: agencyId, level, event, payload, user_id: userId ?? null, source: "edge" });
}

export async function callOpenAI(body: Record<string, unknown>, stream = false) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream }),
  });
  return resp;
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
