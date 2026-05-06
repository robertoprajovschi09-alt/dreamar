// Generate concrete tasks from a risk alert's recommended_actions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const DEFAULT_ACTIONS = [
  { title: "Schedule strategic call with client", description: "Align on goals, surface blockers, reset expectations.", priority: "high" },
  { title: "Analyze 5 worst-performing videos", description: "Identify common hooks/formats/CTAs that underperformed.", priority: "medium" },
  { title: "Propose 10 new hook variations", description: "Refresh the content angle to reverse engagement decline.", priority: "medium" },
  { title: "Request business impact feedback", description: "Ask client for calls, DMs, sales numbers from last 30 days.", priority: "high" },
  { title: "Build next-month strategy document", description: "Outline themes, posting cadence, and KPIs for next month.", priority: "medium" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { alert_id } = await req.json();
    if (!alert_id) return new Response(JSON.stringify({ error: "alert_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: alert } = await admin.from("client_risk_alerts").select("*").eq("id", alert_id).maybeSingle();
    if (!alert) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", alert.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const actions: any[] = Array.isArray(alert.recommended_actions) && alert.recommended_actions.length > 0
      ? alert.recommended_actions
      : DEFAULT_ACTIONS;

    const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
    const isCriticalish = alert.risk_level === "critical" || alert.risk_level === "high";

    const rows = actions.map((a) => ({
      agency_id: alert.agency_id,
      client_id: alert.client_id,
      title: String(a.title || "Recovery action"),
      description: String(a.description || ""),
      task_type: "recovery",
      priority: (a.priority === "high" || isCriticalish ? "high" : a.priority === "low" ? "low" : "medium"),
      status: "todo",
      deadline,
      created_by: user.id,
    }));

    const { data: inserted, error } = await admin.from("tasks").insert(rows).select("id");
    if (error) throw error;

    return new Response(JSON.stringify({ created: inserted?.length || 0, task_ids: inserted?.map((t: any) => t.id) || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-recovery-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
