import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id, scheduled_date } = await req.json();

    if (!store_id || !scheduled_date) {
      return jsonResponse({ error: "store_id e scheduled_date são obrigatórios" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("preorder_config")
      .eq("id", store_id)
      .single();

    if (storeError || !store) {
      return jsonResponse({ error: "Loja não encontrada" }, 404);
    }

    const preorderConfig = (store.preorder_config as { daily_limit?: number } | null) || {};
    const dailyLimit = Number(preorderConfig.daily_limit || 0);

    if (!dailyLimit || dailyLimit <= 0) {
      return jsonResponse({
        reached: false,
        limit: 0,
        count: 0,
        remaining: null,
        unlimited: true,
      });
    }

    const [{ count: ordersCount, error: ordersError }, { count: pendingCount, error: pendingError }] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store_id)
        .eq("order_type", "preorder")
        .eq("scheduled_date", scheduled_date)
        .neq("status", "cancelled"),
      supabase
        .from("pending_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store_id)
        .eq("order_type", "preorder")
        .eq("scheduled_date", scheduled_date)
        .in("status", ["pending", "paid"]),
    ]);

    if (ordersError || pendingError) {
      console.error("[check-preorder-limit] Count error", { ordersError, pendingError });
      return jsonResponse({ error: "Erro ao verificar limite diário" }, 500);
    }

    const totalCount = Number(ordersCount || 0) + Number(pendingCount || 0);
    const reached = totalCount >= dailyLimit;

    return jsonResponse({
      reached,
      limit: dailyLimit,
      count: totalCount,
      remaining: Math.max(0, dailyLimit - totalCount),
      unlimited: false,
    });
  } catch (err) {
    console.error("check-preorder-limit error:", err);
    return jsonResponse({ error: (err as Error).message || "Erro interno" }, 500);
  }
});
