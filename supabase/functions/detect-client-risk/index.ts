// Deterministic risk detector. Computes risk for a single client or all agency clients.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Reason = { code: string; label: string; severity: "low" | "medium" | "high"; value?: string; weight: number };

function levelFor(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return curr > 0 ? 100 : -100;
  return ((curr - prev) / prev) * 100;
}

async function detectForClient(admin: any, client: { id: string; agency_id: string; name: string }) {
  const reasons: Reason[] = [];
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const startCur = new Date(Date.UTC(year, month, 1));
  const startPrev = new Date(Date.UTC(year, month - 1, 1));
  const endCur = new Date(Date.UTC(year, month + 1, 1));
  const startCurISO = startCur.toISOString();
  const startPrevISO = startPrev.toISOString();
  const endCurISO = endCur.toISOString();
  const startCurDate = startCurISO.slice(0, 10);
  const startPrevDate = startPrevISO.slice(0, 10);
  const endCurDate = endCurISO.slice(0, 10);
  const ago30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const ago45 = new Date(now.getTime() - 45 * 86400000).toISOString();

  // Health score (latest)
  const { data: hs } = await admin.from("client_health_scores").select("total_score,month,year")
    .eq("client_id", client.id).order("period_start", { ascending: false }).limit(1);
  const healthScore = hs?.[0]?.total_score ? Number(hs[0].total_score) : null;
  if (healthScore !== null && healthScore < 50) {
    reasons.push({ code: "low_health", label: `Health score is low (${Math.round(healthScore)}/100)`, severity: "high", weight: 15, value: String(Math.round(healthScore)) });
  }

  // Videos engagement MoM
  const aggVideos = async (from: string, to: string) => {
    const { data } = await admin.from("videos").select("views,likes,comments,shares,saves")
      .eq("client_id", client.id).gte("publish_date", from).lt("publish_date", to);
    return (data || []).reduce((acc: any, v: any) => {
      acc.views += Number(v.views || 0);
      acc.eng += Number(v.likes || 0) + Number(v.comments || 0) + Number(v.shares || 0) + Number(v.saves || 0);
      acc.count += 1;
      return acc;
    }, { views: 0, eng: 0, count: 0 });
  };
  const cur = await aggVideos(startCurDate, endCurDate);
  const prv = await aggVideos(startPrevDate, startCurDate);
  if (cur.count + prv.count > 0) {
    const dViews = deltaPct(cur.views, prv.views);
    if (dViews !== null && dViews < -15) {
      reasons.push({ code: "performance_drop", label: `Video views dropped ${Math.round(Math.abs(dViews))}% MoM`, severity: "high", weight: 20, value: `${Math.round(dViews)}%` });
    }
    const dEng = deltaPct(cur.eng, prv.eng);
    if (dEng !== null && dEng < -20) {
      reasons.push({ code: "engagement_drop", label: `Engagement dropped ${Math.round(Math.abs(dEng))}% MoM`, severity: "high", weight: 10, value: `${Math.round(dEng)}%` });
    }
  }

  // Goals
  const { data: goals } = await admin.from("monthly_goals").select("target,progress")
    .eq("client_id", client.id).gte("month", startCurDate).lt("month", endCurDate);
  if (goals && goals.length > 0) {
    const ratios = goals.map((g: any) => g.target ? (Number(g.progress || 0) / Number(g.target)) * 100 : null).filter((r: any) => r !== null) as number[];
    const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    if (ratios.length && avg < 50) {
      reasons.push({ code: "goals_missed", label: `Goals at ${Math.round(avg)}% on average`, severity: "high", weight: 15, value: `${Math.round(avg)}%` });
    }
    if (ratios.length && ratios.every((r) => r === 0)) {
      reasons.push({ code: "no_monthly_progress", label: "No progress logged on any monthly goal", severity: "medium", weight: 10 });
    }
  }

  // Approvals
  const { data: approvals } = await admin.from("content_approvals").select("decision,created_at,updated_at")
    .eq("client_id", client.id).gte("created_at", ago30);
  const pending = (approvals || []).filter((a: any) => a.decision === "pending");
  const decided = (approvals || []).filter((a: any) => a.decision !== "pending");
  if (pending.length >= 3) {
    reasons.push({ code: "late_approvals", label: `${pending.length} pending approvals`, severity: "medium", weight: 10, value: String(pending.length) });
  } else if (decided.length > 0) {
    const avgHours = decided.reduce((s: number, a: any) => s + Math.max(0, (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 36e5), 0) / decided.length;
    if (avgHours > 72) {
      reasons.push({ code: "late_approvals", label: `Avg approval response > ${Math.round(avgHours)}h`, severity: "medium", weight: 10, value: `${Math.round(avgHours)}h` });
    }
  }
  if (decided.length > 0) {
    const rejected = decided.filter((a: any) => a.decision === "rejected").length;
    const rate = rejected / decided.length;
    if (rate > 0.3) {
      reasons.push({ code: "high_rejection", label: `${Math.round(rate * 100)}% of content rejected`, severity: "high", weight: 10, value: `${Math.round(rate * 100)}%` });
    }
  }

  // Business impact entries (last 30d)
  const { data: impact } = await admin.from("business_impact_entries").select("id")
    .eq("client_id", client.id).gte("entry_date", ago30.slice(0, 10));
  if (!impact || impact.length === 0) {
    reasons.push({ code: "no_business_impact", label: "No business impact logged in 30 days", severity: "medium", weight: 8 });
  }

  // Client feedback / brief activity
  const { data: feedback } = await admin.from("client_feedback").select("id")
    .eq("client_id", client.id).gte("created_at", ago30);
  if (!feedback || feedback.length === 0) {
    reasons.push({ code: "no_client_feedback", label: "No client feedback in 30 days", severity: "low", weight: 8 });
  }

  // Reports recency
  const { data: reports } = await admin.from("reports").select("created_at")
    .eq("client_id", client.id).order("created_at", { ascending: false }).limit(1);
  if (!reports || reports.length === 0 || new Date(reports[0].created_at).toISOString() < ago45) {
    reasons.push({ code: "stale_reports", label: "No report sent in 45 days", severity: "low", weight: 7 });
  }

  // Overdue tasks
  const { data: tasks } = await admin.from("tasks").select("id,deadline,status")
    .eq("client_id", client.id).neq("status", "done").not("deadline", "is", null).lt("deadline", now.toISOString());
  if (tasks && tasks.length >= 3) {
    reasons.push({ code: "overdue_tasks", label: `${tasks.length} overdue tasks`, severity: "medium", weight: 7, value: String(tasks.length) });
  }

  // Campaigns running without goal progress
  const { data: campaigns } = await admin.from("campaigns").select("id,status")
    .eq("client_id", client.id).eq("status", "active");
  if (campaigns && campaigns.length > 0 && goals && goals.length > 0) {
    const allEmpty = goals.every((g: any) => !g.progress || Number(g.progress) === 0);
    if (allEmpty) {
      reasons.push({ code: "campaign_no_results", label: `${campaigns.length} active campaign(s) with no goal progress`, severity: "low", weight: 5 });
    }
  }

  const totalScore = Math.min(100, reasons.reduce((s, r) => s + r.weight, 0));
  const level = levelFor(totalScore);

  // Find existing active alert
  const { data: existing } = await admin.from("client_risk_alerts")
    .select("id,status").eq("client_id", client.id).eq("status", "active").maybeSingle();

  if (reasons.length === 0) {
    if (existing) {
      await admin.from("client_risk_alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return { client_id: client.id, alert: null, resolved: !!existing };
  }

  const top = [...reasons].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const summary = `${level.toUpperCase()} risk (${totalScore}/100): ${top.map((r) => r.label).join("; ")}.`;

  const payload = {
    agency_id: client.agency_id,
    client_id: client.id,
    risk_level: level,
    risk_score: totalScore,
    risk_reasons: reasons,
    ai_summary: existing ? undefined : summary,
    detected_at: new Date().toISOString(),
    status: "active",
  };

  let alert;
  if (existing) {
    const { data } = await admin.from("client_risk_alerts").update({
      risk_level: level, risk_score: totalScore, risk_reasons: reasons,
    }).eq("id", existing.id).select().single();
    alert = data;
  } else {
    const { data } = await admin.from("client_risk_alerts").insert(payload).select().single();
    alert = data;
  }
  return { client_id: client.id, alert };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let clients: { id: string; agency_id: string; name: string }[] = [];
    if (body.client_id) {
      const { data } = await admin.from("clients").select("id,agency_id,name").eq("id", body.client_id).maybeSingle();
      if (!data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      clients = [data];
    } else if (body.agency_id) {
      const { data } = await admin.from("clients").select("id,agency_id,name").eq("agency_id", body.agency_id).eq("status", "active");
      clients = data || [];
    } else {
      return new Response(JSON.stringify({ error: "client_id or agency_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (clients.length === 0) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Authorization: caller must be member of all agencies involved
    const agencyIds = [...new Set(clients.map((c) => c.agency_id))];
    const { data: memberships } = await admin.from("agency_members").select("agency_id").eq("user_id", user.id).in("agency_id", agencyIds);
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    const allowed = new Set((memberships || []).map((m: any) => m.agency_id));
    if (!prof?.is_saas_admin) {
      clients = clients.filter((c) => allowed.has(c.agency_id));
    }

    const results = [];
    for (const c of clients) {
      try { results.push(await detectForClient(admin, c)); }
      catch (e) { console.error("risk detect failed for", c.id, e); }
    }
    return new Response(JSON.stringify({ results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("detect-client-risk error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
