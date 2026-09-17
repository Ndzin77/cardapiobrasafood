import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UpsellRule {
  id: string;
  store_id: string;
  source_type: "product" | "category";
  source_id: string;
  suggested_product_ids: string[];
  priority: number;
  created_at: string;
}

export function useUpsellRules(storeId: string | undefined) {
  return useQuery({
    queryKey: ["upsell-rules", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("upsell_rules")
        .select("*")
        .eq("store_id", storeId)
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as UpsellRule[];
    },
    enabled: !!storeId,
  });
}

export function useCreateUpsellRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Omit<UpsellRule, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("upsell_rules")
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["upsell-rules", data.store_id] });
      toast.success("Regra de upsell criada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateUpsellRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UpsellRule> & { id: string; store_id: string }) => {
      const { data, error } = await supabase
        .from("upsell_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["upsell-rules", data.store_id] });
      toast.success("Regra atualizada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteUpsellRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storeId }: { id: string; storeId: string }) => {
      const { error } = await supabase
        .from("upsell_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, storeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["upsell-rules", data.storeId] });
      toast.success("Regra removida!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

/**
 * Hook that returns upsell suggestions for items currently in the cart.
 * Combines automatic (same category / popular) and custom rules.
 */
export function useUpsellSuggestions(
  storeId: string | undefined,
  cartProductIds: string[],
  cartCategoryIds: string[],
  allProducts: any[],
  upsellEnabled: boolean,
  upsellMode: string,
) {
  const { data: rules } = useUpsellRules(storeId);

  if (!upsellEnabled || cartProductIds.length === 0) return [];

  const suggestions = new Map<string, { product: any; score: number }>();

  const addSuggestion = (product: any, score: number) => {
    if (cartProductIds.includes(product.id)) return; // Don't suggest what's already in cart
    if (!product.available) return;
    if (product.stock_enabled && typeof product.stock_quantity === "number" && product.stock_quantity <= 0) return;
    const existing = suggestions.get(product.id);
    if (!existing || existing.score < score) {
      suggestions.set(product.id, { product, score });
    }
  };

  // Custom rules
  if (upsellMode === "custom" || upsellMode === "both") {
    rules?.forEach((rule) => {
      const isMatch =
        (rule.source_type === "product" && cartProductIds.includes(rule.source_id)) ||
        (rule.source_type === "category" && cartCategoryIds.includes(rule.source_id));
      if (isMatch) {
        rule.suggested_product_ids.forEach((pid) => {
          const p = allProducts.find((pr) => pr.id === pid);
          if (p) addSuggestion(p, 100 + rule.priority);
        });
      }
    });
  }

  // Auto suggestions
  if (upsellMode === "auto" || upsellMode === "both") {
    // Same category products
    allProducts.forEach((p) => {
      if (cartCategoryIds.includes(p.category_id || "")) {
        addSuggestion(p, 30);
      }
    });
    // Featured products
    allProducts.forEach((p) => {
      if (p.featured) {
        addSuggestion(p, 20);
      }
    });
  }

  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.product);
}
