// Edge function: parse-shopping-list
// Recebe texto livre OU foto de nota fiscal e retorna lista estruturada via Lovable AI Gateway
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return jsonResp({ error: "AI gateway não configurado" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? "").toString().trim();
    const imageBase64 = (body?.image_base64 ?? "").toString().trim();
    const mimeType = (body?.mime_type ?? "image/jpeg").toString();
    const existingIngredients = Array.isArray(body?.existing_ingredients) ? body.existing_ingredients : [];

    const isImageMode = imageBase64.length > 0;

    if (!isImageMode) {
      if (!text || text.length < 3) {
        return jsonResp({ error: "Texto vazio ou muito curto" }, 400);
      }
      if (text.length > 8000) {
        return jsonResp({ error: "Texto muito longo (máx 8000 caracteres)" }, 400);
      }
    } else {
      // ~ base64 inflate factor 1.37; cap at ~12MB base64 (≈ 8.7MB binary)
      if (imageBase64.length > 12_000_000) {
        return jsonResp({ error: "Imagem muito grande. Reduza para no máx 8MB." }, 400);
      }
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
      if (!allowedMimes.includes(mimeType.toLowerCase())) {
        return jsonResp({ error: "Formato de imagem não suportado" }, 400);
      }
    }

    const existingNamesHint = existingIngredients.length > 0
      ? `\n\nInsumos já cadastrados na loja (use o nome EXATO se for o mesmo item):\n${existingIngredients.map((i: any) => `- ${i.name} (${i.unit})`).join("\n")}`
      : "";

    const systemPrompt = `Você é um assistente que converte listas de compras (texto OU foto de nota fiscal) em JSON estruturado.

Regras:
- Extraia cada item separado: nome, quantidade (número), unidade, valor total pago em reais.
- Unidades válidas: g, kg, mg, ml, l, un.
- Se a pessoa disser "1kg" ou "1 quilo" → unit="kg", quantity=1.
- Se disser "30 ovos" ou "30un" → unit="un", quantity=30.
- Se disser "500g" → unit="g", quantity=500.
- "1 litro" ou "1L" → unit="l", quantity=1.
- O valor pago é o TOTAL daquele item (ex: "farinha 5kg 25 reais" → total_paid=25).
- Em notas fiscais, IGNORE: cabeçalhos, CNPJ, totais gerais, impostos, descontos. Foque APENAS nos itens comprados.
- Aceite vírgula ou ponto decimal: "12,50" = 12.50.
- Ignore itens sem quantidade ou sem valor.
- Capitalize o nome (Farinha, Açúcar, Leite).
- Se o nome bater com algum insumo já cadastrado, use o NOME EXATO dele (case-sensitive).${existingNamesHint}`;

    // Build user message — text or vision
    const userContent: any = isImageMode
      ? [
          {
            type: "text",
            text: text || "Extraia todos os itens de compra desta nota fiscal/recibo. Retorne nome, quantidade, unidade e valor total pago de cada item.",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ]
      : text;

    // Vision needs gemini-2.5-flash; text-only stays on the cheaper preview
    const model = isImageMode ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_purchases",
              description: "Extrai itens de compra estruturados",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string", enum: ["mg", "g", "kg", "ml", "l", "un"] },
                        total_paid: { type: "number" },
                      },
                      required: ["name", "quantity", "unit", "total_paid"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_purchases" } },
      }),
    });

    if (aiResp.status === 429) {
      return jsonResp({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }, 429);
    }
    if (aiResp.status === 402) {
      return jsonResp({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace." }, 402);
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return jsonResp({ error: "Erro ao processar com IA" }, 500);
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return jsonResp({
        error: isImageMode
          ? "Não consegui ler a imagem. Tente uma foto mais nítida ou digite a lista manualmente."
          : "IA não retornou itens estruturados",
      }, 500);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return jsonResp({ error: "Resposta inválida da IA" }, 500);
    }

    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    const items = rawItems
      .filter((it: any) =>
        it &&
        typeof it.name === "string" && it.name.trim() &&
        typeof it.quantity === "number" && it.quantity > 0 &&
        typeof it.unit === "string" && ["mg", "g", "kg", "ml", "l", "un"].includes(it.unit) &&
        typeof it.total_paid === "number" && it.total_paid > 0
      )
      .map((it: any) => ({
        name: it.name.trim(),
        quantity: it.quantity,
        unit: it.unit,
        total_paid: it.total_paid,
      }));

    if (items.length === 0 && isImageMode) {
      return jsonResp({
        error: "Nenhum item válido encontrado na imagem. Tente uma foto mais nítida ou digite a lista manualmente.",
      }, 422);
    }

    return jsonResp({ items, discarded: rawItems.length - items.length });
  } catch (e) {
    console.error("parse-shopping-list error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function jsonResp(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
