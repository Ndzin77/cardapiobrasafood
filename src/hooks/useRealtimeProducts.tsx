import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on the products table for a given store.
 * When stock_quantity or availability changes, the products query cache is
 * automatically invalidated so the UI reflects the latest data instantly.
 */
export function useRealtimeProducts(storeId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`products-realtime-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          // Invalidate the products query so React Query refetches
          queryClient.invalidateQueries({ queryKey: ["products", storeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);
}
