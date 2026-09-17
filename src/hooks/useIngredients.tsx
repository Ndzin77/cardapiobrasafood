import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Ingredient {
  id: string;
  store_id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  stock_quantity: number;
  min_stock_alert: number;
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity_used: number;
  created_at: string;
  ingredient?: Ingredient;
}

export function useIngredients(storeId: string | undefined) {
  return useQuery({
    queryKey: ["ingredients", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("store_id", storeId)
        .order("name");
      if (error) throw error;
      return data as Ingredient[];
    },
    enabled: !!storeId,
  });
}

export function useLowStockIngredients(storeId: string | undefined) {
  return useQuery({
    queryKey: ["ingredients-low-stock", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("store_id", storeId)
        .order("stock_quantity", { ascending: true });
      if (error) throw error;
      return (data as Ingredient[]).filter(
        (i) => i.min_stock_alert > 0 && i.stock_quantity <= i.min_stock_alert
      );
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Ingredient, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("ingredients").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success("Insumo criado!");
    },
    onError: () => toast.error("Erro ao criar insumo"),
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ingredient> & { id: string }) => {
      const { error } = await supabase.from("ingredients").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success("Insumo atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar insumo"),
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["product-ingredients"] });
      toast.success("Insumo excluído!");
    },
    onError: () => toast.error("Erro ao excluir insumo"),
  });
}

export function useDeleteIngredientsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return { ok: 0, fail: 0 };
      const { error } = await supabase.from("ingredients").delete().in("id", ids);
      if (error) throw error;
      return { ok: ids.length, fail: 0 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["product-ingredients"] });
      qc.invalidateQueries({ queryKey: ["ingredient-usage-counts"] });
      if (res && res.ok > 0) toast.success(`${res.ok} insumo(s) excluído(s)!`);
    },
    onError: () => toast.error("Erro ao excluir insumos selecionados"),
  });
}

// Count how many products use each ingredient
export function useIngredientUsageCounts(storeId: string | undefined) {
  return useQuery({
    queryKey: ["ingredient-usage-counts", storeId],
    queryFn: async () => {
      if (!storeId) return {};
      const { data, error } = await supabase
        .from("product_ingredients")
        .select("ingredient_id, ingredient:ingredients!inner(store_id)")
        .eq("ingredient.store_id", storeId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.ingredient_id] = (counts[row.ingredient_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

// Product ingredients
export function useProductIngredients(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-ingredients", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_ingredients")
        .select("*, ingredient:ingredients!product_ingredients_ingredient_fk(*)")
        .eq("product_id", productId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        ingredient: d.ingredient as Ingredient,
      })) as ProductIngredient[];
    },
    enabled: !!productId,
  });
}

export function useLinkIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { product_id: string; ingredient_id: string; quantity_used: number }) => {
      const { error } = await supabase.from("product_ingredients").upsert(
        data as any,
        { onConflict: "product_id,ingredient_id" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-ingredients", vars.product_id] });
    },
    onError: () => toast.error("Erro ao vincular insumo"),
  });
}

export function useUnlinkIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_ingredients").delete().eq("id", id);
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      qc.invalidateQueries({ queryKey: ["product-ingredients", productId] });
    },
    onError: () => toast.error("Erro ao desvincular insumo"),
  });
}

export function calculateProductCost(productIngredients: ProductIngredient[]): number {
  return productIngredients.reduce((sum, pi) => {
    const cost = pi.ingredient?.cost_per_unit ?? 0;
    return sum + pi.quantity_used * cost;
  }, 0);
}

export function calculateMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

// ── Option Choice Ingredients (Adicionais → Insumos) ──
export interface OptionChoiceIngredient {
  id: string;
  store_id: string;
  option_group_name: string;
  choice_name: string;
  ingredient_id: string;
  quantity_used: number;
  created_at: string;
  ingredient?: Ingredient;
}

export function useOptionChoiceIngredients(storeId: string | undefined) {
  return useQuery({
    queryKey: ["option-choice-ingredients", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("option_choice_ingredients")
        .select("*, ingredient:ingredients!option_choice_ingredients_ingredient_fk(*)")
        .eq("store_id", storeId)
        .order("option_group_name")
        .order("choice_name");
      if (error) throw error;
      return (data || []) as OptionChoiceIngredient[];
    },
    enabled: !!storeId,
  });
}

export function useUpsertOptionChoiceIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      store_id: string;
      option_group_name: string;
      choice_name: string;
      ingredient_id: string;
      quantity_used: number;
    }) => {
      const { error } = await supabase
        .from("option_choice_ingredients")
        .upsert(data as any, { onConflict: "store_id,option_group_name,choice_name,ingredient_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["option-choice-ingredients"] });
      toast.success("Vínculo salvo!");
    },
    onError: () => toast.error("Erro ao vincular adicional a insumo"),
  });
}

export function useDeleteOptionChoiceIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("option_choice_ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["option-choice-ingredients"] });
      toast.success("Vínculo removido!");
    },
    onError: () => toast.error("Erro ao remover vínculo"),
  });
}

// Get all distinct option groups/choices from products in this store
export function useStoreOptionChoices(storeId: string | undefined) {
  return useQuery({
    queryKey: ["store-option-choices", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("options")
        .eq("store_id", storeId)
        .eq("has_options", true);
      if (error) throw error;

      const choices: { group: string; choice: string }[] = [];
      const seen = new Set<string>();
      for (const product of data || []) {
        const options = product.options as any[];
        if (!Array.isArray(options)) continue;
        for (const opt of options) {
          if (!opt.name || !Array.isArray(opt.choices)) continue;
          for (const ch of opt.choices) {
            const key = `${opt.name}||${ch.name}`;
            if (!seen.has(key)) {
              seen.add(key);
              choices.push({ group: opt.name, choice: ch.name });
            }
          }
        }
      }
      return choices.sort((a, b) => a.group.localeCompare(b.group) || a.choice.localeCompare(b.choice));
    },
    enabled: !!storeId,
  });
}


// ── Product Profitability Intelligence ──
export interface ProductProfit {
  productId: string;
  productName: string;
  price: number;
  cost: number;
  margin: number;
  maxProducible: number;
  potentialProfit: number;
  suggestedPrice40: number;
  imageUrl: string | null;
}

export function useProductProfitability(storeId: string | undefined) {
  return useQuery({
    queryKey: ["product-profitability", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      // Get all products
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("store_id", storeId);
      if (pErr) throw pErr;

      // Get all product_ingredients with ingredient data
      const { data: piData, error: piErr } = await supabase
        .from("product_ingredients")
        .select("product_id, quantity_used, ingredient:ingredients!product_ingredients_ingredient_fk(id, cost_per_unit, stock_quantity, unit)")
        .in("product_id", (products || []).map(p => p.id));
      if (piErr) throw piErr;

      // Group by product
      const piByProduct: Record<string, Array<{ quantity_used: number; ingredient: Ingredient }>> = {};
      (piData || []).forEach((pi: any) => {
        if (!pi.ingredient) return;
        if (!piByProduct[pi.product_id]) piByProduct[pi.product_id] = [];
        piByProduct[pi.product_id].push({
          quantity_used: pi.quantity_used,
          ingredient: pi.ingredient as Ingredient,
        });
      });

      const results: ProductProfit[] = [];

      for (const product of (products || [])) {
        const ingredients = piByProduct[product.id];
        if (!ingredients || ingredients.length === 0) continue;

        const cost = ingredients.reduce((s, pi) => s + pi.quantity_used * (pi.ingredient.cost_per_unit ?? 0), 0);
        const margin = product.price > 0 ? Math.round(((product.price - cost) / product.price) * 100) : 0;

        // Max producible = min of (stock / qty_used) across all ingredients
        const maxProducible = Math.floor(
          Math.min(...ingredients.map(pi => {
            if (pi.quantity_used <= 0) return Infinity;
            return (pi.ingredient.stock_quantity ?? 0) / pi.quantity_used;
          }))
        );

        const potentialProfit = Math.max(0, (product.price - cost) * maxProducible);
        const suggestedPrice40 = cost > 0 ? Math.ceil((cost / 0.6) * 100) / 100 : 0;

        results.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          cost,
          margin,
          maxProducible: isFinite(maxProducible) ? maxProducible : 0,
          potentialProfit,
          suggestedPrice40,
          imageUrl: product.image_url,
        });
      }

      return results.sort((a, b) => b.margin - a.margin);
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}
