import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS and update pending_checkouts
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: expiredCount, error } = await supabase.rpc(
      "expire_pending_checkouts"
    );

    if (error) {
      console.error("[expire-checkouts] RPC error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = {
      expired_count: expiredCount ?? 0,
      timestamp: new Date().toISOString(),
    };

    if ((expiredCount ?? 0) > 0) {
      console.log(
        `[expire-checkouts] ✅ Expirados: ${expiredCount} checkout(s) — estoque restaurado automaticamente pelo trigger.`
      );
    } else {
      console.log("[expire-checkouts] ✓ Nenhum checkout para expirar.");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[expire-checkouts] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
