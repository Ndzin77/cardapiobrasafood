import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IngredientPurchase {
  id: string;
  ingredient_id: string;
  store_id: string;
  quantity_purchased: number;
  quantity_remaining: number;
  total_paid: number;
  cost_per_unit: number;
  purchased_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useIngredientPurchases(ingredientId: string | undefined) {
  return useQuery({
    queryKey: ["ingredient-purchases", ingredientId],
    queryFn: async () => {
      if (!ingredientId) return [];
      const { data, error } = await supabase
        .from("ingredient_purchases" as any)
        .select("*")
        .eq("ingredient_id", ingredientId)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IngredientPurchase[];
    },
    enabled: !!ingredientId,
  });
}

export function useRegisterPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      ingredient_id: string;
      store_id: string;
      quantity: number;
      total_paid: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("register_ingredient_purchase" as any, {
        p_ingredient_id: params.ingredient_id,
        p_store_id: params.store_id,
        p_quantity: params.quantity,
        p_total_paid: params.total_paid,
        p_notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredient-purchases"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["product-profitability"] });
    },
    onError: (e: any) => {
      toast.error(e?.message?.includes("INVALID") ? "Valores inválidos" : "Erro ao registrar compra");
    },
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ingredientId }: { id: string; ingredientId: string }) => {
      // Só permite deletar se quantity_remaining == quantity_purchased (lote intacto)
      const { data: lot, error: e1 } = await supabase
        .from("ingredient_purchases" as any)
        .select("quantity_purchased, quantity_remaining, ingredient_id, store_id")
        .eq("id", id)
        .maybeSingle();
      if (e1) throw e1;
      if (!lot) throw new Error("Lote não encontrado");
      const lotData = lot as any;
      if (Number(lotData.quantity_remaining) !== Number(lotData.quantity_purchased)) {
        throw new Error("Lote já foi parcialmente consumido — não pode ser deletado");
      }

      const { error } = await supabase.from("ingredient_purchases" as any).delete().eq("id", id);
      if (error) throw error;

      // Recalcula stock + cost do insumo
      const { data: remainingRaw } = await supabase
        .from("ingredient_purchases" as any)
        .select("quantity_remaining, cost_per_unit, purchased_at")
        .eq("ingredient_id", ingredientId)
        .order("purchased_at", { ascending: true });
      const remaining = (remainingRaw || []) as unknown as Array<{ quantity_remaining: number; cost_per_unit: number; purchased_at: string }>;
      const total = remaining.reduce((s, p) => s + Number(p.quantity_remaining || 0), 0);
      const nextCost = remaining.find((p) => Number(p.quantity_remaining) > 0)?.cost_per_unit ?? null;

      const updates: any = { stock_quantity: total };
      if (nextCost !== null) updates.cost_per_unit = nextCost;
      await supabase.from("ingredients").update(updates).eq("id", ingredientId);

      return ingredientId;
    },
    onSuccess: (ingredientId) => {
      qc.invalidateQueries({ queryKey: ["ingredient-purchases", ingredientId] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success("Lote removido");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover lote"),
  });
}

// Custo médio ponderado de todos os lotes ativos
export function calculateWeightedAvgCost(purchases: IngredientPurchase[]): number {
  const active = purchases.filter((p) => p.quantity_remaining > 0);
  const totalQty = active.reduce((s, p) => s + p.quantity_remaining, 0);
  if (totalQty <= 0) return 0;
  const totalValue = active.reduce((s, p) => s + p.quantity_remaining * p.cost_per_unit, 0);
  return totalValue / totalQty;
}

export function getNextOutCost(purchases: IngredientPurchase[]): number | null {
  const sorted = [...purchases]
    .filter((p) => p.quantity_remaining > 0)
    .sort((a, b) => new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime());
  return sorted[0]?.cost_per_unit ?? null;
}
