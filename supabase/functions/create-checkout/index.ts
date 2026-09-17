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

/** Replace {{placeholder}} tokens in a URL template */
async function signCheckoutId(checkoutId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(checkoutId));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, encodeURIComponent(value));
  }
  return result;
}

async function createMercadoPagoCheckout(
  config: Record<string, string>,
  order: { id: string; total: number; description: string; store_name: string },
  backUrl: string,
): Promise<string> {
  const accessToken = config.access_token;
  if (!accessToken) throw new Error("Mercado Pago: access_token não configurado");

  const body = {
    items: [
      {
        title: `Pedido ${order.store_name}`,
        description: order.description.slice(0, 255),
        quantity: 1,
        currency_id: "BRL",
        unit_price: order.total,
      },
    ],
    external_reference: order.id,
    back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
    auto_return: "approved",
  };

  const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("MP error:", errText);
    throw new Error(`Mercado Pago API error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.init_point || data.sandbox_init_point;
}

async function createInfinityPayCheckout(
  config: Record<string, string>,
  order: {
    id: string;
    total: number;
    items: Array<{ quantity: number; unit_price: number; name: string }>;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    customer_address_structured?: {
      zip_code: string; street: string; number: string;
      complement?: string; neighborhood: string; city: string; state: string;
    };
    delivery_fee?: number;
  },
  backUrl: string,
  webhookUrl: string,
): Promise<string> {
  const handle = config.handle;
  if (!handle) throw new Error("InfinityPay: handle (InfiniteTag) não configurado");

  // Calcular soma bruta dos items + frete para detectar encomenda com sinal
  const itemsSum = order.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    + (order.delivery_fee || 0);
  const isPartialPayment = order.total < itemsSum - 0.01; // tolerância de centavo

  let itens: Array<{ quantity: number; price: number; description: string }>;

  if (isPartialPayment) {
    // Encomenda com sinal: enviar item consolidado com o valor exato do "Paga agora"
    itens = [{
      quantity: 1,
      price: Math.round(order.total * 100),
      description: `Pagamento antecipado - Pedido #${order.id.slice(0, 8)}`,
    }];
  } else {
    itens = order.items.map((item) => ({
      quantity: item.quantity,
      price: Math.round(item.unit_price * 100),
      description: item.name.slice(0, 140),
    }));

    // Adicionar frete como item separado (se aplicável)
    if (order.delivery_fee && order.delivery_fee > 0) {
      itens.push({
        quantity: 1,
        price: Math.round(order.delivery_fee * 100),
        description: "Taxa de entrega",
      });
    }

    if (itens.length === 0) {
      itens.push({
        quantity: 1,
        price: Math.round(order.total * 100),
        description: `Pedido #${order.id.slice(0, 8)}`,
      });
    }
  }

  const payload: Record<string, unknown> = {
    handle,
    items: itens,
    order_nsu: order.id,
    webhook_url: webhookUrl,
  };

  // Redirect URL com checkout_id para retomada automática
  const baseRedirectUrl = config.redirect_url || backUrl;
  try {
    const redirectWithId = new URL(baseRedirectUrl);
    redirectWithId.searchParams.set("checkout_id", order.id);
    payload.redirect_url = redirectWithId.toString();
  } catch {
    payload.redirect_url = baseRedirectUrl;
  }

  // Pré-preenchimento de dados do cliente na InfinityPay
  if (order.customer_name || order.customer_phone || order.customer_email) {
    const customer: Record<string, unknown> = {};
    if (order.customer_name) customer.name = order.customer_name;
    if (order.customer_phone) customer.phone_number = order.customer_phone;
    if (order.customer_email) customer.email = order.customer_email;
    // Endereço estruturado (CEP, rua, número, bairro, cidade, estado)
    if (order.customer_address_structured) {
      const addr = order.customer_address_structured;
      customer.address = {
        zip_code: addr.zip_code,
        street: addr.street,
        number: addr.number,
        complement: addr.complement || "",
        neighborhood: addr.neighborhood,
        city: addr.city,
        state: addr.state,
      };
    } else if (order.customer_address) {
      customer.address = { street: order.customer_address };
    }
    payload.customer = customer;
  }

  console.log("[InfinityPay] Payload:", JSON.stringify(payload));

  const resp = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("InfinityPay error:", errText);
    throw new Error(`InfinityPay API error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.url || data.checkout_url || data.link;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      store_id, order_id, total, items_description,
      customer_name, customer_phone, customer_email, items,
      customer_address, customer_address_structured, customer_maps_url, delivery_type, subtotal, delivery_fee, notes,
      store_url, expires_minutes,
      // Preorder metadata
      order_type, scheduled_date, scheduled_time, deposit_amount, has_mixed_cart, delivery_fee_mode,
    } = await req.json();

    if (!store_id || !total) {
      return jsonResponse({ error: "store_id e total são obrigatórios" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Expirar checkouts antigos (libera reservas de estoque) ──
    const { error: expireErr } = await supabase.rpc("expire_pending_checkouts" as any);
    if (expireErr) {
      console.warn("[create-checkout] expire_pending_checkouts failed (non-fatal):", expireErr.message);
    }

    // Fetch store info
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("checkout_provider, name, slug, preorder_config")
      .eq("id", store_id)
      .single();

    if (storeErr || !store) {
      return jsonResponse({ error: "Loja não encontrada" }, 404);
    }

    if (order_type === "preorder" && scheduled_date) {
      const preorderConfig = (store.preorder_config as { daily_limit?: number } | null) || {};
      const dailyLimit = Number(preorderConfig.daily_limit || 0);

      if (dailyLimit > 0) {
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
          console.error("[create-checkout] preorder daily limit count failed", { ordersError, pendingError });
          return jsonResponse({ error: "Erro ao verificar limite diário de encomendas" }, 500);
        }

        const totalReserved = Number(ordersCount || 0) + Number(pendingCount || 0);
        if (totalReserved >= dailyLimit) {
          return jsonResponse({ error: "PREORDER_DAILY_LIMIT_REACHED", limit: dailyLimit, count: totalReserved }, 409);
        }
      }
    }

    const provider = store.checkout_provider || "none";

    // Fetch sensitive checkout config (includes expires_minutes)
    const { data: secretsRow } = await supabase
      .from("store_checkout_secrets")
      .select("checkout_config")
      .eq("store_id", store_id)
      .single();

    const config = ((secretsRow?.checkout_config as Record<string, string>) || {});

    // Determine expiry: body > config > default 30 min
    const expiresMinutes = Number(expires_minutes) || Number(config.expires_minutes) || 30;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

    if (provider === "none") {
      return jsonResponse({ error: "Checkout online não configurado para esta loja" }, 400);
    }

    const orderItems = Array.isArray(items) ? items : [];

    // ── RESERVA DE ESTOQUE (soft-lock atômico antes de criar o checkout) ──
    // Decrementa provisoriamente. Se falhar (estoque insuficiente), retorna erro ao cliente.
    if (orderItems.length > 0) {
      const { error: stockErr } = await supabase.rpc("reserve_checkout_stock" as any, {
        p_checkout_id: null,
        p_items: orderItems,
      });

      if (stockErr) {
        const msg = String(stockErr.message || "");
        console.warn("[create-checkout] Reserva de estoque falhou:", msg);

        // Parse: INSUFFICIENT_STOCK:<name>:<available>:<requested>
        if (msg.includes("INSUFFICIENT_STOCK:")) {
          const parts = msg.split("INSUFFICIENT_STOCK:")[1]?.split(":") || [];
          const productName = parts[0]?.trim() || "Produto";
          const available = parseInt(parts[1]?.trim() || "0", 10);
          const requested = parseInt(parts[2]?.trim() || "0", 10);

          return jsonResponse({
            error: "INSUFFICIENT_STOCK",
            product_name: productName,
            available,
            requested,
          }, 409);
        }

        return jsonResponse({
          error: "Estoque insuficiente para um ou mais produtos.",
        }, 409);
      }

      console.log("[create-checkout] Estoque reservado com sucesso.");
    }

    // ── Create pending checkout ──
    const { data: pendingCheckout, error: pcError } = await supabase
      .from("pending_checkouts")
      .insert({
        store_id,
        provider,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_address: customer_address || null,
        customer_maps_url: customer_maps_url || null,
        delivery_type: delivery_type || "delivery",
        items: orderItems,
        subtotal: Number(subtotal) || 0,
        delivery_fee: Number(delivery_fee) || 0,
        total: Number(total),
        notes: notes || null,
        expires_at: expiresAt,
        stock_reserved: orderItems.length > 0,
        // Preorder metadata
        order_type: order_type || "instant",
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null,
        deposit_amount: deposit_amount != null ? Number(deposit_amount) : null,
        deposit_status: deposit_amount != null && Number(deposit_amount) > 0 ? "pending" : null,
        has_mixed_cart: !!has_mixed_cart,
        delivery_fee_mode: delivery_fee_mode || "instant_only",
      })
      .select()
      .single();

    if (pcError || !pendingCheckout) {
      console.error("Pending checkout error:", pcError);
      // Se falhou ao criar o checkout, devolve a reserva via RPC atômico
      if (orderItems.length > 0) {
        // Sem checkout ID, restauramos estoque manualmente item a item
        for (const item of orderItems) {
          const qty = item.quantity || 1;
          const { data: prod } = await supabase
            .from("products")
            .select("stock_enabled, stock_quantity")
            .eq("id", item.product_id)
            .single();
          if (prod?.stock_enabled && typeof prod.stock_quantity === "number") {
            await supabase
              .from("products")
              .update({
                stock_quantity: prod.stock_quantity + qty,
                available: true,
              })
              .eq("id", item.product_id);
          }
        }
      }
      return jsonResponse({ error: "Erro ao criar checkout pendente" }, 500);
    }

    const checkoutId = pendingCheckout.id;
    const orderTotal = Number(total);
    const description = items_description || `Pedido #${checkoutId.slice(0, 8)}`;
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const backUrl = store_url || referer || `${supabaseUrl.replace('.supabase.co', '')}/loja/${store.slug}`;
    const webhookToken = await signCheckoutId(
      checkoutId,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const webhookUrl =
      `${supabaseUrl}/functions/v1/payment-webhook?provider=infinitypay&t=${webhookToken}`;

    let checkoutUrl: string;

    switch (provider) {
      case "mercadopago": {
        checkoutUrl = await createMercadoPagoCheckout(
          config,
          { id: checkoutId, total: orderTotal, description, store_name: store.name },
          backUrl,
        );
        break;
      }
      case "infinitypay": {
        checkoutUrl = await createInfinityPayCheckout(
          config,
          {
            id: checkoutId,
            total: orderTotal,
            items: orderItems,
            customer_name,
            customer_phone,
            customer_email,
            customer_address: customer_address || undefined,
            customer_address_structured: customer_address_structured || undefined,
            delivery_fee: Number(delivery_fee) || 0,
          },
          backUrl,
          webhookUrl,
        );
        break;
      }
      case "kiwify":
      case "custom_link": {
        const template = config.url_template;
        if (!template) {
          return jsonResponse({ error: "URL template não configurado" }, 400);
        }
        checkoutUrl = renderTemplate(template, {
          total: orderTotal.toFixed(2),
          order_id: checkoutId,
          store_name: store.name,
        });
        break;
      }
      default:
        return jsonResponse({ error: `Provedor '${provider}' não suportado` }, 400);
    }

    if (!checkoutUrl) {
      return jsonResponse({ error: "Não foi possível gerar o link de pagamento" }, 500);
    }

    // Save checkout URL back
    await supabase
      .from("pending_checkouts")
      .update({ checkout_url: checkoutUrl })
      .eq("id", checkoutId);

    console.log(`[create-checkout] ✅ Checkout criado: ${checkoutId} (provider: ${provider})`);
    return jsonResponse({ checkout_url: checkoutUrl, checkout_id: checkoutId });
  } catch (err) {
    console.error("create-checkout error:", err);
    return jsonResponse({ error: (err as Error).message || "Erro interno" }, 500);
  }
});
