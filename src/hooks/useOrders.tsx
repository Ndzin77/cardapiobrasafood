import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_maps_url: string | null;
  delivery_type: string;
  payment_method: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  status: string;
  order_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  deposit_amount: number | null;
  deposit_status: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  preparing: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  ready: "bg-green-500/20 text-green-700 border-green-500/30",
  delivered: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export function useOrders(storeId: string | undefined) {
  return useQuery({
    queryKey: ["orders", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((order) => ({
        ...order,
        items: (order.items as unknown as OrderItem[]) || [],
        subtotal: Number(order.subtotal),
        delivery_fee: Number(order.delivery_fee),
        total: Number(order.total),
        deposit_amount: order.deposit_amount ? Number(order.deposit_amount) : null,
      })) as Order[];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60, // 1 min - realtime handles freshness
    gcTime: 1000 * 60 * 5,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Omit<Order, "id" | "created_at" | "updated_at">) => {
      // Create the order
      const { error } = await supabase
        .from("orders")
        .insert({
          store_id: order.store_id,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          customer_maps_url: (order as any).customer_maps_url || null,
          delivery_type: order.delivery_type,
          payment_method: order.payment_method,
          items: order.items as unknown as any,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          total: order.total,
          notes: order.notes,
          status: order.status,
          order_type: order.order_type || "instant",
          scheduled_date: order.scheduled_date || null,
          scheduled_time: order.scheduled_time || null,
          deposit_amount: order.deposit_amount || null,
          deposit_status: order.deposit_status || null,
        } as any);

      if (error) throw error;

      // Return the input data (no .select() to avoid RLS SELECT restriction for non-admin users)
      return { store_id: order.store_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders", data.store_id] });
      queryClient.invalidateQueries({ queryKey: ["products", data.store_id] });
    },
    onError: (error) => {
      console.error("Order creation error:", error);
      toast.error("Erro ao criar pedido: " + error.message);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, storeId }: { id: string; status: OrderStatus; storeId: string }) => {
      // Call atomic database function — handles stock + status in a single transaction
      const { data, error } = await supabase.rpc("update_order_status" as any, {
        p_order_id: id,
        p_new_status: status,
        p_store_id: storeId,
      });

      if (error) throw error;

      const result = data as unknown as {
        status: string;
        previous_status: string;
        stock_changes: Array<{ product_id: string; action: string; from: number; to: number }>;
      };

      // Show stock change notifications
      const changes = result.stock_changes || [];
      if (changes.length > 0) {
        const lines = changes.map((c) => {
          const icon = c.action === "decremented" ? "📦" : "🔄";
          return `${icon} ${c.from} → ${c.to}`;
        });

        if (changes[0]?.action === "restored") {
          toast.warning(`⚠️ Pedido cancelado!\nEstoque restaurado:\n${lines.join("\n")}`, { duration: 6000 });
        } else {
          toast.info(`Estoque atualizado!\n${lines.join("\n")}`, { duration: 5000 });
        }
      } else if (status === "cancelled") {
        const wasPending = result.previous_status === "pending";
        if (wasPending) {
          toast.info("Pedido cancelado. Nenhum estoque foi afetado pois o pedido ainda não tinha sido confirmado.");
        }
      }

      return { id, status, storeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders", data.storeId] });
      queryClient.invalidateQueries({ queryKey: ["products", data.storeId] });
      toast.success(`Pedido ${ORDER_STATUS_LABELS[data.status as OrderStatus]}!`);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar pedido: " + error.message);
    },
  });
}
