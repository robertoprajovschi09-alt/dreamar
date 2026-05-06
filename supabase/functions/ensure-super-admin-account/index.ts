// Ensures the allowlisted Super Admin account exists with a known initial password.
// Safe to call from /admin-login. Uses service role; only operates on hardcoded email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "robert@cascodent.ro";
const INITIAL_PASSWORD = "Robi234vc";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Find the user by listing (admin.getUserByEmail isn't available in v2.45)
    let userId: string | null = null;
    let page = 1;
    while (page <= 20 && !userId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const found = data.users.find((u) => (u.email || "").toLowerCase() === ADMIN_EMAIL);
      if (found) userId = found.id;
      if (data.users.length < 200) break;
      page++;
    }

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: INITIAL_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Super Admin" },
      });
      if (error) throw error;
      userId = data.user!.id;
    } else {
      // Reset password to known value so the admin can always log in
      await admin.auth.admin.updateUserById(userId, {
        password: INITIAL_PASSWORD,
        email_confirm: true,
      });
    }

    await admin.from("profiles").upsert(
      { id: userId, email: ADMIN_EMAIL, is_saas_admin: true },
      { onConflict: "id" }
    );
    await admin.from("profiles").update({ is_saas_admin: true }).eq("id", userId);

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
