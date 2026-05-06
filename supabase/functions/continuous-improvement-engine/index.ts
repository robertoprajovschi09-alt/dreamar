// Continuous Improvement Engine — runs the 7-step controlled loop.
// Collect -> Evaluate -> Detect Patterns -> Recommend -> Human Review (queue)
// -> Implement (via approval system) -> Measure Again
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, logEvent } from "../_shared/openai.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type RunType = "weekly_agency" | "monthly_strategy" | "manual" | "platform";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

async function safeFrom(svc: any, _table: string, build: (q: any) => any): Promise<any[]> {
  try {
    const { data, error } = await build(svc.from(_table));
    if (error) return [];
    return data || [];
  } catch { return []; }
}

async function collect(svc: any, agency_id: string | null, sinceDays: number) {
  const since = daysAgoIso(sinceDays);
  const a = (q: any) => agency_id ? q.eq("agency_id", agency_id) : q;
  return {
    analytics_entries: await safeFrom(svc, "analytics_entries", q => a(q.select("id,client_id,date_start,date_end,metrics").gte("date_end", since)).limit(500)),
    content_metrics: await safeFrom(svc, "content_metrics", q => q.select("*").gte("captured_at", since).limit(500)),
    monthly_reports: await safeFrom(svc, "monthly_reports", q => a(q.select("id,client_id,period_start,period_end,status,sent_at,client_feedback").gte("period_end", since)).limit(200)),
    monthly_strategies: await safeFrom(svc, "monthly_strategies", q => a(q.select("id,client_id,status,approved_at,rejected_at,created_at").gte("created_at", since)).limit(200)),
    ai_outputs: await safeFrom(svc, "ai_outputs", q => a(q.select("id,feature,status,confidence_score,missing_data,prompt_version_id,created_at").gte("created_at", since)).limit(1000)),
    ai_feedback: await safeFrom(svc, "ai_feedback", q => a(q.select("ai_feature,rating,was_useful,feedback_type,correction,created_at").gte("created_at", since)).limit(1000)),
    approvals: await safeFrom(svc, "post_approvals", q => q.select("id,status,responded_at,client_message").gte("created_at", since).limit(500)),
    tasks: await safeFrom(svc, "tasks", q => a(q.select("id,status,priority,source,completed_at,created_at").gte("created_at", since)).limit(500)),
    client_health_scores: await safeFrom(svc, "client_health_scores", q => q.select("client_id,total_score,score_status,period_end").gte("period_end", since).limit(500)),
    client_risk_alerts: await safeFrom(svc, "client_risk_alerts", q => q.select("client_id,risk_level,risk_score,status,detected_at").gte("detected_at", since).limit(500)),
    swipe_files: await safeFrom(svc, "swipe_files", q => a(q.select("id,niche,format,performance_score,created_at").gte("created_at", since)).limit(500)),
    competitor_observations: await safeFrom(svc, "competitor_observations", q => q.select("id,client_id,observed_at,metrics").gte("observed_at", since).limit(500)),
    documents: await safeFrom(svc, "documents", q => a(q.select("id,kind,created_at").gte("created_at", since)).limit(200)),
  };
}

function evaluate(c: any) {
  const out = c.ai_outputs || [];
  const fb = c.ai_feedback || [];
  const usefulCount = fb.filter((f: any) => f.was_useful === true).length;
  const notUseful = fb.filter((f: any) => f.was_useful === false).length;
  const ratings = fb.map((f: any) => Number(f.rating)).filter((n: number) => !isNaN(n));
  const avgRating = ratings.length ? ratings.reduce((s: number, n: number) => s + n, 0) / ratings.length : null;
  const rejected = (c.monthly_strategies || []).filter((s: any) => s.rejected_at).length;
  const approved = (c.monthly_strategies || []).filter((s: any) => s.approved_at).length;
  const completedTasks = (c.tasks || []).filter((t: any) => t.status === "completed").length;
  const aiSourcedTasks = (c.tasks || []).filter((t: any) => String(t.source || "").startsWith("ai")).length;
  const aiSourcedCompleted = (c.tasks || []).filter((t: any) => String(t.source || "").startsWith("ai") && t.status === "completed").length;

  const versionStats: Record<string, { total: number; success: number; missing: number; blocked: number }> = {};
  for (const o of out) {
    const k = String(o.prompt_version_id || "unknown");
    versionStats[k] ??= { total: 0, success: 0, missing: 0, blocked: 0 };
    versionStats[k].total++;
    if (o.status === "success") versionStats[k].success++;
    if (o.status === "missing_data") versionStats[k].missing++;
    if (o.status === "blocked") versionStats[k].blocked++;
  }

  return {
    feedback: { useful: usefulCount, not_useful: notUseful, avg_rating: avgRating, total: fb.length },
    strategies: { approved, rejected },
    tasks: { total: (c.tasks || []).length, completed: completedTasks, ai_sourced: aiSourcedTasks, ai_sourced_completed: aiSourcedCompleted },
    ai_outputs: { total: out.length },
    prompt_versions: versionStats,
  };
}

function detectPatterns(c: any, evalRes: any) {
  const patterns: any[] = [];
  for (const [id, s] of Object.entries(evalRes.prompt_versions || {})) {
    const v: any = s;
    if (v.total >= 5 && (v.success / v.total) < 0.6) {
      patterns.push({ kind: "weak_prompt_version", prompt_version_id: id, success_rate: v.success / v.total, total: v.total });
    }
    if (v.total >= 5 && (v.missing / v.total) > 0.4) {
      patterns.push({ kind: "frequent_missing_data", prompt_version_id: id, missing_rate: v.missing / v.total });
    }
  }
  if (evalRes.feedback.total >= 10 && evalRes.feedback.not_useful > evalRes.feedback.useful) {
    patterns.push({ kind: "ai_feedback_negative", useful: evalRes.feedback.useful, not_useful: evalRes.feedback.not_useful });
  }
  const tot = evalRes.strategies.approved + evalRes.strategies.rejected;
  if (tot >= 3 && evalRes.strategies.rejected / tot > 0.4) {
    patterns.push({ kind: "strategy_rejection_high", ratio: evalRes.strategies.rejected / tot });
  }
  const risks = (c.client_risk_alerts || []).filter((r: any) => r.status === "active" && (r.risk_level === "high" || r.risk_level === "critical"));
  if (risks.length) patterns.push({ kind: "clients_at_risk", count: risks.length, sample: risks.slice(0, 5) });
  const bySwipeNiche: Record<string, { sum: number; n: number }> = {};
  for (const s of c.swipe_files || []) {
    if (!s.niche || s.performance_score == null) continue;
    bySwipeNiche[s.niche] ??= { sum: 0, n: 0 };
    bySwipeNiche[s.niche].sum += Number(s.performance_score) || 0;
    bySwipeNiche[s.niche].n++;
  }
  const winningNiches = Object.entries(bySwipeNiche)
    .map(([n, v]) => ({ niche: n, avg: v.sum / v.n, n: v.n }))
    .filter(x => x.n >= 2 && x.avg >= 0.7)
    .sort((a, b) => b.avg - a.avg).slice(0, 5);
  if (winningNiches.length) patterns.push({ kind: "winning_niches", niches: winningNiches });
  if (evalRes.tasks.ai_sourced >= 5 && evalRes.tasks.ai_sourced_completed / evalRes.tasks.ai_sourced < 0.3) {
    patterns.push({ kind: "ai_tasks_low_completion", ratio: evalRes.tasks.ai_sourced_completed / evalRes.tasks.ai_sourced });
  }
  return patterns;
}

async function recommend(patterns: any[], evalRes: any) {
  const recs: any[] = [];
  for (const p of patterns) {
    if (p.kind === "weak_prompt_version") {
      recs.push({ action_type: "update_prompt_version", risk_level: "high", title: "Propose new prompt version", reasoning: `Prompt version ${p.prompt_version_id} success rate ${(p.success_rate*100).toFixed(0)}%`, payload: { prompt_version_id: p.prompt_version_id } });
    }
    if (p.kind === "frequent_missing_data") {
      recs.push({ action_type: "create_task", risk_level: "low", title: "Ask client to complete missing data", reasoning: "Many AI runs flagged missing_data", payload: { title: "Collect missing data from client", priority: "medium" } });
    }
    if (p.kind === "ai_feedback_negative") {
      recs.push({ action_type: "create_lovable_prompt", risk_level: "medium", title: "Improve weakest AI feature", reasoning: `Negative feedback exceeds positive (${p.not_useful} vs ${p.useful})`, payload: { area: "ai_quality" } });
    }
    if (p.kind === "strategy_rejection_high") {
      recs.push({ action_type: "create_strategy", risk_level: "medium", title: "Re-draft strategy template", reasoning: `Strategy rejection ratio ${(p.ratio*100).toFixed(0)}%`, payload: {} });
    }
    if (p.kind === "clients_at_risk") {
      recs.push({ action_type: "create_task", risk_level: "medium", title: "Outreach to at-risk clients", reasoning: `${p.count} clients flagged high/critical`, payload: { title: "Recovery outreach", priority: "high" } });
    }
    if (p.kind === "winning_niches") {
      recs.push({ action_type: "create_content_idea", risk_level: "low", title: "New swipe ideas for winning niches", reasoning: "Top performing niches detected", payload: { niches: p.niches.map((n: any) => n.niche) } });
    }
    if (p.kind === "ai_tasks_low_completion") {
      recs.push({ action_type: "suggest_ui_change", risk_level: "low", title: "Improve AI task surfacing", reasoning: `AI tasks completion ${(p.ratio*100).toFixed(0)}%`, payload: { area: "tasks_ui" } });
    }
  }

  if (LOVABLE_API_KEY && patterns.length) {
    try {
      const sys = "You convert detected patterns into concrete improvement actions. Reply with JSON: {\"recommendations\":[{action_type, risk_level (low|medium|high|critical), title, reasoning, payload}]}. Only use action_type from: update_prompt_version, create_task, create_lovable_prompt, create_strategy, create_content_idea, suggest_ui_change, suggest_database_change, create_ai_memory_item.";
      const r = await fetch(LOVABLE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify({ patterns, evaluation: evalRes }) },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}");
        if (Array.isArray(parsed.recommendations)) {
          for (const rec of parsed.recommendations.slice(0, 20)) recs.push(rec);
        }
      }
    } catch { /* ignore */ }
  }
  return recs;
}

function snapshot(evalRes: any) {
  return {
    avg_rating: evalRes.feedback.avg_rating,
    feedback_total: evalRes.feedback.total,
    useful_ratio: evalRes.feedback.total ? evalRes.feedback.useful / evalRes.feedback.total : null,
    strategies_approved: evalRes.strategies.approved,
    strategies_rejected: evalRes.strategies.rejected,
    tasks_completed: evalRes.tasks.completed,
    ai_outputs: evalRes.ai_outputs.total,
    snapshot_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);

    const body = await req.json().catch(() => ({}));
    const run_type: RunType = (body?.run_type as RunType) || "manual";
    const agency_id: string | null = body?.agency_id ?? null;
    const measure_run_id: string | null = body?.measure_run_id ?? null;
    const sinceDays: number = body?.since_days
      ?? (run_type === "weekly_agency" ? 7 : run_type === "monthly_strategy" ? 30 : 14);

    const { data: profile } = await svc.from("profiles").select("is_saas_admin").eq("id", userId).maybeSingle();
    const isAdmin = !!profile?.is_saas_admin;
    if (!isAdmin) {
      if (!agency_id) return jsonResponse({ error: "agency_id required" }, 400);
      const { data: mem } = await svc.from("agency_members").select("user_id").eq("user_id", userId).eq("agency_id", agency_id).maybeSingle();
      if (!mem) return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (measure_run_id) {
      const { data: prev } = await svc.from("continuous_improvement_runs").select("*").eq("id", measure_run_id).maybeSingle();
      if (!prev) return jsonResponse({ error: "Run not found" }, 404);
      const collected = await collect(svc, prev.agency_id, sinceDays);
      const evalRes = evaluate(collected);
      const after = snapshot(evalRes);
      await svc.from("continuous_improvement_runs").update({ performance_after: after, status: "completed" }).eq("id", measure_run_id);
      await logEvent(svc, prev.agency_id, "info", "cie_measured", { run_id: measure_run_id }, userId);
      return jsonResponse({ ok: true, run_id: measure_run_id, performance_before: prev.performance_before, performance_after: after });
    }

    const { data: run, error: insErr } = await svc.from("continuous_improvement_runs").insert({
      agency_id, run_type, status: "collecting", triggered_by: userId,
    }).select().single();
    if (insErr) return jsonResponse({ error: insErr.message }, 400);

    try {
      const collected = await collect(svc, agency_id, sinceDays);
      const inputSummary = Object.fromEntries(Object.entries(collected).map(([k, v]) => [k, (v as any[]).length]));
      await svc.from("continuous_improvement_runs").update({ status: "evaluating", input_summary: inputSummary }).eq("id", run.id);

      const evalRes = evaluate(collected);
      const before = snapshot(evalRes);
      const patterns = detectPatterns(collected, evalRes);
      const recommendations = await recommend(patterns, evalRes);

      let queued = 0;
      if (recommendations.length) {
        const rows = recommendations.map((r: any) => ({
          agency_id,
          action_type: r.action_type,
          title: r.title || `Improvement: ${r.action_type}`,
          description: `From Continuous Improvement Engine run ${run.id}`,
          payload: r.payload || {},
          reasoning: r.reasoning || "",
          risk_level: ["low","medium","high","critical"].includes(r.risk_level) ? r.risk_level : "medium",
          status: "pending",
        }));
        const { error: aErr, data: aData } = await svc.from("ai_action_requests").insert(rows).select("id");
        if (!aErr) queued = aData?.length || 0;
      }

      await svc.from("continuous_improvement_runs").update({
        detected_patterns: patterns,
        recommended_improvements: recommendations,
        performance_before: before,
        status: "awaiting_review",
      }).eq("id", run.id);

      await logEvent(svc, agency_id, "info", "cie_run_completed", {
        run_id: run.id, run_type, patterns: patterns.length, recommendations: recommendations.length, queued,
      }, userId);

      return jsonResponse({
        ok: true, run_id: run.id, run_type,
        input_summary: inputSummary, patterns, recommendations,
        performance_before: before, queued_for_review: queued,
      });
    } catch (e: any) {
      await svc.from("continuous_improvement_runs").update({ status: "failed" }).eq("id", run.id);
      throw e;
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
