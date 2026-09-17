import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on the orders table for a given store.
 * Replaces the expensive refetchInterval polling with Supabase Realtime.
 * Calls onNewOrder when a new INSERT event is detected.
 */
export function useRealtimeOrders(
  storeId: string | undefined,
  onNewOrder?: (orderId: string) => void
) {
  const queryClient = useQueryClient();
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`orders-realtime-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
          if (payload.eventType === "INSERT" && payload.new?.id) {
            onNewOrderRef.current?.(payload.new.id as string);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);
}
