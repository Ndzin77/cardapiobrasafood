import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DeliveryZone } from "@/lib/deliveryZones";

// ── Public query (storefront) ──
export function useDeliveryZones(storeId: string | undefined) {
  return useQuery({
    queryKey: ["delivery-zones", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("delivery_zones" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map(mapZone);
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 3,
  });
}

// ── Admin mutations ──
export function useCreateDeliveryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (zone: Omit<DeliveryZone, "id">) => {
      const { data, error } = await supabase
        .from("delivery_zones" as any)
        .insert(zone as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["delivery-zones", data.store_id] });
      toast.success("Zona de entrega criada!");
    },
    onError: (e: any) => toast.error("Erro ao criar zona: " + e.message),
  });
}

export function useUpdateDeliveryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryZone> & { id: string }) => {
      const { data, error } = await supabase
        .from("delivery_zones" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["delivery-zones", data.store_id] });
    },
    onError: (e: any) => toast.error("Erro ao atualizar zona: " + e.message),
  });
}

export function useDeleteDeliveryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storeId }: { id: string; storeId: string }) => {
      const { error } = await supabase
        .from("delivery_zones" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, storeId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["delivery-zones", data.storeId] });
      toast.success("Zona removida!");
    },
    onError: (e: any) => toast.error("Erro ao remover zona: " + e.message),
  });
}

function mapZone(row: any): DeliveryZone {
  return {
    id: row.id,
    store_id: row.store_id,
    zone_type: row.zone_type,
    label: row.label,
    delivery_fee: Number(row.delivery_fee) || 0,
    config: row.config || {},
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active ?? true,
  };
}
