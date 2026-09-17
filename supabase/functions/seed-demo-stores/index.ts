import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: any[] = [];

    const stores = [
      {
        email: "demo-burger@teste.com",
        password: "Demo123!",
        store: {
          name: "Burger House",
          slug: "burger-house",
          description: "Hambúrgueres artesanais feitos com carne premium na brasa. Desde 2018 servindo os melhores smash burgers da cidade!",
          theme_color: "#dc2626",
          address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
          phone: "(11) 98888-1111",
          whatsapp: "5511988881111",
          instagram: "@burgerhouse",
          delivery_fee: 6.99,
          min_order: 30,
          estimated_time: "25-40 min",
          is_open: true,
          cover_image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=500&fit=crop",
          logo_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop",
          accepted_payments: ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"],
          opening_hours: [
            { day: "Segunda", hours: "11:00 - 23:00", isOpen: true },
            { day: "Terça", hours: "11:00 - 23:00", isOpen: true },
            { day: "Quarta", hours: "11:00 - 23:00", isOpen: true },
            { day: "Quinta", hours: "11:00 - 23:00", isOpen: true },
            { day: "Sexta", hours: "11:00 - 00:00", isOpen: true },
            { day: "Sábado", hours: "11:00 - 00:00", isOpen: true },
            { day: "Domingo", hours: "12:00 - 22:00", isOpen: true },
          ],
          rating: 4.8,
          review_count: 342,
          checkout_mode: "whatsapp",
          help_button_enabled: true,
        },
        categories: [
          { name: "Burgers", icon: "🍔", sort_order: 0 },
          { name: "Combos", icon: "🎁", sort_order: 1 },
          { name: "Acompanhamentos", icon: "🍟", sort_order: 2 },
          { name: "Bebidas", icon: "🥤", sort_order: 3 },
          { name: "Sobremesas", icon: "🍰", sort_order: 4 },
        ],
        products: [
          {
            name: "Smash Burger Clássico",
            description: "Dois smash patties 90g, queijo cheddar, cebola caramelizada, picles e molho especial no brioche artesanal.",
            price: 32.90,
            original_price: 38.90,
            image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop",
            category_name: "Burgers",
            featured: true,
            has_options: true,
            options: [
              { name: "Ponto da Carne", required: true, enabled: true, min_select: 1, max_select: 1, choices: [
                { name: "Mal passado", price_modifier: 0, enabled: true },
                { name: "Ao ponto", price_modifier: 0, enabled: true },
                { name: "Bem passado", price_modifier: 0, enabled: true },
              ]},
              { name: "Extras", required: false, enabled: true, min_select: 0, max_select: 5, choices: [
                { name: "Bacon extra", price_modifier: 5, enabled: true },
                { name: "Cheddar extra", price_modifier: 4, enabled: true },
                { name: "Ovo frito", price_modifier: 4, enabled: true },
                { name: "Cebola crispy", price_modifier: 3, enabled: true },
              ]},
            ],
          },
          {
            name: "Burger Bacon BBQ",
            description: "Patty 180g, bacon crocante, onion rings, queijo pepper jack e molho BBQ defumado.",
            price: 36.90,
            image_url: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&h=600&fit=crop",
            category_name: "Burgers",
            featured: true,
          },
          {
            name: "Burger Trufado",
            description: "Patty 200g de wagyu, queijo brie, rúcula, cebola roxa e maionese trufada.",
            price: 44.90,
            image_url: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&h=600&fit=crop",
            category_name: "Burgers",
            featured: true,
          },
          {
            name: "Chicken Burger",
            description: "Filé de frango empanado, alface, tomate, maionese de ervas e queijo prato.",
            price: 28.90,
            image_url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&h=600&fit=crop",
            category_name: "Burgers",
          },
          {
            name: "Combo Smash Duplo",
            description: "Smash Burger Clássico + Fritas G + Refrigerante 500ml.",
            price: 49.90,
            original_price: 56.70,
            image_url: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&h=600&fit=crop",
            category_name: "Combos",
            featured: true,
          },
          {
            name: "Combo Kids",
            description: "Mini burger + Fritas P + Suco de caixinha + Brinde surpresa.",
            price: 29.90,
            image_url: "https://images.unsplash.com/photo-1572802419224-296b0aeee15d?w=800&h=600&fit=crop",
            category_name: "Combos",
          },
          {
            name: "Fritas Cheddar & Bacon",
            description: "Porção generosa de fritas cobertas com cheddar cremoso e bacon picado.",
            price: 24.90,
            image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&h=600&fit=crop",
            category_name: "Acompanhamentos",
          },
          {
            name: "Onion Rings",
            description: "Anéis de cebola empanados com massa crocante. Acompanha molho barbecue.",
            price: 19.90,
            image_url: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&h=600&fit=crop",
            category_name: "Acompanhamentos",
          },
          {
            name: "Milkshake Ovomaltine",
            description: "Milkshake cremoso de Ovomaltine com chantilly. 500ml.",
            price: 18.90,
            image_url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&h=600&fit=crop",
            category_name: "Bebidas",
            has_options: true,
            options: [
              { name: "Tamanho", required: true, enabled: true, min_select: 1, max_select: 1, choices: [
                { name: "400ml", price_modifier: 0, enabled: true },
                { name: "600ml", price_modifier: 6, enabled: true },
              ]},
            ],
          },
          {
            name: "Refrigerante 600ml",
            description: "Coca-Cola, Guaraná Antarctica ou Fanta. Garrafa 600ml.",
            price: 8.90,
            image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=600&fit=crop",
            category_name: "Bebidas",
          },
          {
            name: "Brownie com Sorvete",
            description: "Brownie quentinho de chocolate belga com bola de sorvete de creme e calda.",
            price: 22.90,
            image_url: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=800&h=600&fit=crop",
            category_name: "Sobremesas",
          },
        ],
      },
      {
        email: "demo-pastel@teste.com",
        password: "Demo123!",
        store: {
          name: "Pastel da Vila",
          slug: "pastel-da-vila",
          description: "Pastéis crocantes feitos na hora com recheios generosos! Tradição de família desde 1995.",
          theme_color: "#f59e0b",
          address: "Rua Augusta, 500 - Consolação, São Paulo - SP",
          phone: "(11) 97777-2222",
          whatsapp: "5511977772222",
          instagram: "@pasteldavila",
          delivery_fee: 4.99,
          min_order: 20,
          estimated_time: "20-35 min",
          is_open: true,
          cover_image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&h=500&fit=crop",
          logo_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop",
          accepted_payments: ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Vale Refeição"],
          opening_hours: [
            { day: "Segunda", hours: "07:00 - 20:00", isOpen: true },
            { day: "Terça", hours: "07:00 - 20:00", isOpen: true },
            { day: "Quarta", hours: "07:00 - 20:00", isOpen: true },
            { day: "Quinta", hours: "07:00 - 20:00", isOpen: true },
            { day: "Sexta", hours: "07:00 - 21:00", isOpen: true },
            { day: "Sábado", hours: "08:00 - 21:00", isOpen: true },
            { day: "Domingo", hours: "08:00 - 18:00", isOpen: true },
          ],
          rating: 4.9,
          review_count: 587,
          checkout_mode: "whatsapp",
          help_button_enabled: true,
        },
        categories: [
          { name: "Pastéis Salgados", icon: "🥟", sort_order: 0 },
          { name: "Pastéis Doces", icon: "🍫", sort_order: 1 },
          { name: "Caldos", icon: "🍲", sort_order: 2 },
          { name: "Bebidas", icon: "🧃", sort_order: 3 },
        ],
        products: [
          {
            name: "Pastel de Carne",
            description: "Recheio generoso de carne moída temperada com cebola, azeitonas e ovo. Massa crocante feita na hora.",
            price: 12.90,
            image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop",
            category_name: "Pastéis Salgados",
            featured: true,
            has_options: true,
            options: [
              { name: "Tamanho", required: true, enabled: true, min_select: 1, max_select: 1, choices: [
                { name: "Normal", price_modifier: 0, enabled: true },
                { name: "Grande", price_modifier: 5, enabled: true },
                { name: "Gigante", price_modifier: 10, enabled: true },
              ]},
            ],
          },
          {
            name: "Pastel de Queijo",
            description: "Queijo muçarela derretido com orégano. Crocante por fora, cremoso por dentro.",
            price: 11.90,
            image_url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop",
            category_name: "Pastéis Salgados",
            featured: true,
          },
          {
            name: "Pastel de Frango",
            description: "Frango desfiado com catupiry cremoso e temperos especiais.",
            price: 13.90,
            image_url: "https://images.unsplash.com/photo-1630409346824-4f0e7b080087?w=800&h=600&fit=crop",
            category_name: "Pastéis Salgados",
            featured: true,
          },
          {
            name: "Pastel de Palmito",
            description: "Palmito picado com molho branco e queijo parmesão gratinado.",
            price: 14.90,
            image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&h=600&fit=crop",
            category_name: "Pastéis Salgados",
          },
          {
            name: "Pastel de Camarão",
            description: "Camarões frescos com catupiry, temperados com ervas finas.",
            price: 18.90,
            image_url: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&h=600&fit=crop",
            category_name: "Pastéis Salgados",
            featured: true,
          },
          {
            name: "Pastel de Chocolate",
            description: "Chocolate ao leite cremoso com morango fresco. Perfeito para sobremesa!",
            price: 13.90,
            image_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop",
            category_name: "Pastéis Doces",
          },
          {
            name: "Pastel de Doce de Leite",
            description: "Doce de leite artesanal com canela. Uma explosão de sabor!",
            price: 12.90,
            image_url: "https://images.unsplash.com/photo-1558326567-98ae2405596b?w=800&h=600&fit=crop",
            category_name: "Pastéis Doces",
          },
          {
            name: "Pastel de Banana com Canela",
            description: "Banana madura caramelizada com açúcar e canela. Irresistível!",
            price: 11.90,
            image_url: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=800&h=600&fit=crop",
            category_name: "Pastéis Doces",
          },
          {
            name: "Caldo Verde",
            description: "Caldo de batata com couve e linguiça calabresa. 400ml.",
            price: 16.90,
            image_url: "https://images.unsplash.com/photo-1547592166-23ac45744aec?w=800&h=600&fit=crop",
            category_name: "Caldos",
          },
          {
            name: "Caldo de Feijão",
            description: "Caldo de feijão preto com bacon e tempero caseiro. 400ml.",
            price: 14.90,
            image_url: "https://images.unsplash.com/photo-1604152135912-04a022e23696?w=800&h=600&fit=crop",
            category_name: "Caldos",
          },
          {
            name: "Caldo de Cana 500ml",
            description: "Caldo de cana natural, gelado e refrescante.",
            price: 8.90,
            image_url: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800&h=600&fit=crop",
            category_name: "Bebidas",
          },
          {
            name: "Suco Natural 400ml",
            description: "Laranja, abacaxi, maracujá ou limão. Feito na hora!",
            price: 9.90,
            image_url: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=800&h=600&fit=crop",
            category_name: "Bebidas",
            has_options: true,
            options: [
              { name: "Sabor", required: true, enabled: true, min_select: 1, max_select: 1, choices: [
                { name: "Laranja", price_modifier: 0, enabled: true },
                { name: "Abacaxi", price_modifier: 0, enabled: true },
                { name: "Maracujá", price_modifier: 0, enabled: true },
                { name: "Limão", price_modifier: 0, enabled: true },
              ]},
            ],
          },
        ],
      },
      {
        email: "demo-pizza@teste.com",
        password: "Demo123!",
        store: {
          name: "Pizza Nova",
          slug: "pizza-nova",
          description: "Pizzas artesanais com massa de fermentação natural de 72h e ingredientes premium importados da Itália.",
          theme_color: "#16a34a",
          address: "Rua Oscar Freire, 800 - Jardins, São Paulo - SP",
          phone: "(11) 96666-3333",
          whatsapp: "5511966663333",
          instagram: "@pizzanova",
          delivery_fee: 7.99,
          min_order: 35,
          estimated_time: "35-50 min",
          is_open: true,
          cover_image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&h=500&fit=crop",
          logo_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop",
          accepted_payments: ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"],
          opening_hours: [
            { day: "Segunda", hours: "", isOpen: false },
            { day: "Terça", hours: "18:00 - 23:00", isOpen: true },
            { day: "Quarta", hours: "18:00 - 23:00", isOpen: true },
            { day: "Quinta", hours: "18:00 - 23:00", isOpen: true },
            { day: "Sexta", hours: "18:00 - 00:00", isOpen: true },
            { day: "Sábado", hours: "18:00 - 00:00", isOpen: true },
            { day: "Domingo", hours: "18:00 - 23:00", isOpen: true },
          ],
          rating: 4.7,
          review_count: 215,
          checkout_mode: "whatsapp",
          help_button_enabled: true,
        },
        categories: [
          { name: "Pizzas Tradicionais", icon: "🍕", sort_order: 0 },
          { name: "Pizzas Premium", icon: "👑", sort_order: 1 },
          { name: "Bebidas", icon: "🍷", sort_order: 2 },
          { name: "Sobremesas", icon: "🍫", sort_order: 3 },
        ],
        products: [
          {
            name: "Margherita",
            description: "Molho de tomate San Marzano, muçarela de búfala, manjericão fresco e azeite extra virgem.",
            price: 49.90,
            image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
            category_name: "Pizzas Tradicionais",
            featured: true,
            has_options: true,
            options: [
              { name: "Tamanho", required: true, enabled: true, min_select: 1, max_select: 1, choices: [
                { name: "Média (6 fatias)", price_modifier: 0, enabled: true },
                { name: "Grande (8 fatias)", price_modifier: 15, enabled: true },
                { name: "Família (12 fatias)", price_modifier: 30, enabled: true },
              ]},
              { name: "Borda", required: false, enabled: true, min_select: 0, max_select: 1, choices: [
                { name: "Borda recheada cheddar", price_modifier: 8, enabled: true },
                { name: "Borda recheada catupiry", price_modifier: 8, enabled: true },
                { name: "Borda vulcão", price_modifier: 12, enabled: true },
              ]},
            ],
          },
          {
            name: "Pepperoni",
            description: "Pepperoni artesanal importado, muçarela especial e orégano fresco.",
            price: 54.90,
            image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&h=600&fit=crop",
            category_name: "Pizzas Tradicionais",
            featured: true,
          },
          {
            name: "Quatro Queijos",
            description: "Muçarela, gorgonzola, parmesão e provolone. Para os amantes de queijo.",
            price: 52.90,
            image_url: "https://images.unsplash.com/photo-1573821663912-569905455b1c?w=800&h=600&fit=crop",
            category_name: "Pizzas Tradicionais",
          },
          {
            name: "Calabresa",
            description: "Calabresa fatiada, cebola roxa, azeitonas pretas e orégano.",
            price: 46.90,
            image_url: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&h=600&fit=crop",
            category_name: "Pizzas Tradicionais",
          },
          {
            name: "Portuguesa",
            description: "Presunto, ovo, cebola, azeitonas, ervilha e muçarela.",
            price: 48.90,
            image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
            category_name: "Pizzas Tradicionais",
          },
          {
            name: "Pizza Trufa Negra",
            description: "Creme de trufa negra, muçarela de búfala, presunto de parma e rúcula.",
            price: 69.90,
            image_url: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=800&h=600&fit=crop",
            category_name: "Pizzas Premium",
            featured: true,
          },
          {
            name: "Pizza Salmão Premium",
            description: "Salmão defumado, cream cheese, alcaparras e dill fresco.",
            price: 64.90,
            image_url: "https://images.unsplash.com/photo-1600628421060-939639517883?w=800&h=600&fit=crop",
            category_name: "Pizzas Premium",
          },
          {
            name: "Pizza Costela BBQ",
            description: "Costela desfiada no BBQ, cebola roxa caramelizada, bacon e molho barbecue.",
            price: 62.90,
            image_url: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&h=600&fit=crop",
            category_name: "Pizzas Premium",
            featured: true,
          },
          {
            name: "Vinho Tinto Taça",
            description: "Vinho tinto selecionado. Taça 150ml.",
            price: 18.90,
            image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop",
            category_name: "Bebidas",
          },
          {
            name: "Refrigerante 2L",
            description: "Coca-Cola, Guaraná ou Fanta. Garrafa 2 litros.",
            price: 14.90,
            image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=600&fit=crop",
            category_name: "Bebidas",
          },
          {
            name: "Petit Gâteau",
            description: "Bolinho de chocolate com interior cremoso, sorvete de creme e calda de frutas vermelhas.",
            price: 26.90,
            image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=600&fit=crop",
            category_name: "Sobremesas",
          },
        ],
      },
    ];

    for (const s of stores) {
      // 1. Create auth user
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,
      });

      if (authError) {
        // User might already exist
        if (authError.message?.includes("already been registered")) {
          results.push({ email: s.email, status: "already_exists", slug: s.store.slug });
          continue;
        }
        throw authError;
      }

      const userId = authData.user.id;

      // 2. Wait a moment for the trigger to create the store
      await new Promise((r) => setTimeout(r, 1500));

      // 3. Get the store created by the trigger
      const { data: storeRow, error: storeErr } = await admin
        .from("stores")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (storeErr || !storeRow) throw new Error(`Store not found for user ${userId}`);

      const storeId = storeRow.id;

      // 4. Update store with full branding
      const { error: updateErr } = await admin
        .from("stores")
        .update({
          ...s.store,
          opening_hours: s.store.opening_hours,
        })
        .eq("id", storeId);

      if (updateErr) throw updateErr;

      // 5. Delete default categories (if any)
      await admin.from("categories").delete().eq("store_id", storeId);

      // 6. Insert categories
      const catInserts = s.categories.map((c) => ({
        store_id: storeId,
        name: c.name,
        icon: c.icon,
        sort_order: c.sort_order,
        is_active: true,
      }));

      const { data: cats, error: catErr } = await admin
        .from("categories")
        .insert(catInserts)
        .select("id, name");

      if (catErr) throw catErr;

      const catMap = new Map(cats!.map((c: any) => [c.name, c.id]));

      // 7. Insert products
      const prodInserts = s.products.map((p: any) => ({
        store_id: storeId,
        name: p.name,
        description: p.description,
        price: p.price,
        original_price: p.original_price || null,
        image_url: p.image_url,
        category_id: catMap.get(p.category_name),
        available: true,
        featured: p.featured || false,
        has_options: p.has_options || false,
        options: p.options || [],
        fulfillment_mode: "instant",
      }));

      const { error: prodErr } = await admin.from("products").insert(prodInserts);
      if (prodErr) throw prodErr;

      results.push({
        email: s.email,
        password: s.password,
        slug: s.store.slug,
        store_id: storeId,
        status: "created",
        categories: cats!.length,
        products: prodInserts.length,
      });
    }

    return new Response(JSON.stringify({ success: true, stores: results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
