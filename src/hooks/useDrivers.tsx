import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDrivers(storeId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const driversQuery = useQuery({
    queryKey: ["drivers", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("drivers")
        .select("id, store_id, name, phone, is_active, created_at, updated_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const createDriver = useMutation({
    mutationFn: async ({ name, phone, pin }: { name: string; phone: string; pin: string }) => {
      if (!storeId) throw new Error("Store not found");
      const { data, error } = await supabase
        .from("drivers")
        .insert({
          store_id: storeId,
          name,
          phone: phone.replace(/\D/g, ""),
          pin_hash: pin,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers", storeId] });
      toast({ title: "Entregador cadastrado! 🛵" });
    },
    onError: (err: any) => {
      const msg = err.message?.includes("unique") ? "Telefone já cadastrado" : err.message;
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers", storeId] });
    },
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers", storeId] });
      toast({ title: "Entregador removido" });
    },
  });

  const deliveryStatsQuery = useQuery({
    queryKey: ["delivery-stats", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("deliveries")
        .select("driver_id, status, assigned_at, delivered_at")
        .eq("store_id", storeId)
        .gte("assigned_at", today.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
    refetchInterval: 60000,
  });

  return {
    drivers: driversQuery.data || [],
    isLoading: driversQuery.isLoading,
    createDriver,
    toggleActive,
    deleteDriver,
    deliveryStats: deliveryStatsQuery.data || [],
  };
}
