import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function buildHtml(agencyName: string, clientName: string, acceptUrl: string) {
  const a = escapeHtml(agencyName);
  const c = escapeHtml(clientName);
  const url = escapeHtml(acceptUrl);
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">${a}</div>
          <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#111827;">Bine ai venit în portalul clientului</h1>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#374151;">Salut,</p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
            <strong>${a}</strong> a pregătit portalul tău dedicat pentru <strong>${c}</strong>. De aici poți urmări conținutul, aproba postări, vedea rapoarte și colabora în timp real.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 24px 32px;">
          <a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">Accesează portalul</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px 32px;">
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6b7280;">Dacă butonul nu funcționează, copiază linkul de mai jos în browser:</p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#374151;word-break:break-all;"><a href="${url}" style="color:#374151;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Linkul expiră în 7 zile. Dacă nu așteptai această invitație, poți ignora acest email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return json({ ok: false, error: "Missing token" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: invite, error: iErr } = await supabase
      .from("client_invites")
      .select("email, status, client_id, agency_id, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (iErr) return json({ ok: false, error: iErr.message }, 500);
    if (!invite) return json({ ok: false, error: "Invite not found" }, 404);
    if (["revoked", "expired", "accepted"].includes(invite.status)) {
      return json({ ok: false, error: `Invite is ${invite.status}` }, 400);
    }

    const [{ data: client }, { data: agency }] = await Promise.all([
      supabase.from("clients").select("name").eq("id", invite.client_id).maybeSingle(),
      supabase.from("agencies").select("name").eq("id", invite.agency_id).maybeSingle(),
    ]);

    const agencyName = agency?.name?.trim() || "Echipa ta";
    const clientName = client?.name?.trim() || "contul tău";
    const acceptUrl = `https://dreamar.lovable.app/accept-invite?token=${encodeURIComponent(token)}`;
    const from = Deno.env.get("INVITE_FROM_EMAIL") || "onboarding@resend.dev";
    const subject = `${agencyName} te-a invitat în portalul clientului`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [invite.email],
        subject,
        html: buildHtml(agencyName, clientName, acceptUrl),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return json({ ok: false, error: `Resend ${resp.status}: ${text}` }, 502);
    }

    await supabase
      .from("client_invites")
      .update({
        status: invite.status === "pending" ? "sent" : invite.status,
        last_sent_at: new Date().toISOString(),
      })
      .eq("token", token);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
