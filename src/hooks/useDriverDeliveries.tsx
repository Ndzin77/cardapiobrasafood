import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Delivery {
  id: string;
  order_id: string;
  status: "assigned" | "collected" | "delivered" | "cancelled";
  assigned_at: string;
  collected_at: string | null;
  delivered_at: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  customer_maps_url: string | null;
  total: number;
  items: any[];
  delivery_type: string;
  order_created_at: string;
  order_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
}

export function useDriverDeliveries(driverId: string | null, storeId: string | null) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchDeliveries = useCallback(async () => {
    if (!driverId || !storeId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_driver_deliveries", {
        p_driver_id: driverId,
        p_store_id: storeId,
      } as any);
      if (rpcError) throw rpcError;
      setDeliveries((data as any) || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("Error fetching deliveries:", err);
      const msg = err?.message || "Erro ao buscar entregas";
      setError(msg);
      toast({
        title: "Erro ao carregar entregas",
        description: msg,
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [driverId, storeId, toast]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Realtime subscription
  useEffect(() => {
    if (!driverId || !storeId) return;

    const channel = supabase
      .channel(`deliveries-driver-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `driver_id=eq.${driverId}` },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, storeId, fetchDeliveries]);

  // Polling fallback every 30s
  useEffect(() => {
    if (!driverId || !storeId) return;
    const interval = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(interval);
  }, [driverId, storeId, fetchDeliveries]);

  const updateStatus = useCallback(async (deliveryId: string, newStatus: string) => {
    if (!driverId) return;
    try {
      const { error } = await supabase.rpc("update_delivery_status", {
        p_delivery_id: deliveryId,
        p_driver_id: driverId,
        p_new_status: newStatus,
      } as any);
      if (error) throw error;

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);

      toast({
        title: newStatus === "collected" ? "Pedido coletado! 📦" : "Entrega concluída! ✅",
        description: newStatus === "collected" ? "Siga para o endereço do cliente" : "Ótimo trabalho!",
      });

      fetchDeliveries();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }, [driverId, fetchDeliveries, toast]);

  const assigned = deliveries.filter((d) => d.status === "assigned");
  const collected = deliveries.filter((d) => d.status === "collected");
  const delivered = deliveries.filter((d) => d.status === "delivered");

  return {
    deliveries,
    assigned,
    collected,
    delivered,
    loading,
    error,
    lastRefresh,
    updateStatus,
    refresh: fetchDeliveries,
  };
}
