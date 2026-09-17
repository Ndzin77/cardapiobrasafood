import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  store_id: string;
  phone: string;
  name: string;
  has_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  order_count?: number;
  total_revenue?: number;
  last_order_at?: string | null;
}

const FALLBACK_SUPABASE_URL = "https://mqbhbarhosxfuivuksvr.supabase.co";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  ((supabase as any)?.supabaseUrl as string | undefined) ||
  FALLBACK_SUPABASE_URL;

const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  ((supabase as any)?.supabaseKey as string | undefined) ||
  "";

// Hook to fetch all customers for a store (admin use) - SAFE RPC (no password_hash)
export function useStoreCustomers(storeId: string | undefined) {
  return useQuery({
    queryKey: ["store-customers", storeId],
    queryFn: async (): Promise<Customer[]> => {
      if (!storeId) return [];

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      // Get customers via RPC
      const { data: customers, error } = await (supabase as any).rpc("get_store_customers_safe", { _store_id: storeId });
      if (error) throw new Error(error.message || "Erro ao buscar clientes");

      // Get all orders to compute order_count, total_revenue, last_order_at per phone
      const { data: orders } = await supabase
        .from("orders")
        .select("customer_phone, total, created_at")
        .eq("store_id", storeId)
        .neq("status", "cancelled");

      const phoneStats: Record<string, { count: number; revenue: number; lastOrderAt: string | null }> = {};
      if (orders) {
        orders.forEach((order) => {
          const phone = (order.customer_phone || "").replace(/\D/g, "");
          if (!phone) return;
          if (!phoneStats[phone]) {
            phoneStats[phone] = { count: 0, revenue: 0, lastOrderAt: null };
          }
          phoneStats[phone].count += 1;
          phoneStats[phone].revenue += order.total || 0;
          if (
            !phoneStats[phone].lastOrderAt ||
            new Date(order.created_at) > new Date(phoneStats[phone].lastOrderAt!)
          ) {
            phoneStats[phone].lastOrderAt = order.created_at;
          }
        });
      }

      // Merge stats into customers
      return ((customers as Customer[]) || []).map((c) => {
        const normalizedPhone = c.phone.replace(/\D/g, "");
        const stats = phoneStats[normalizedPhone];
        return {
          ...c,
          order_count: stats?.count ?? 0,
          total_revenue: stats?.revenue ?? 0,
          last_order_at: stats?.lastOrderAt ?? null,
        };
      });
    },
    enabled: !!storeId,
  });
}

// Hook to reset customer password (admin use)
export function useResetCustomerPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          action: "reset_password",
          customer_id: customerId,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Erro ao resetar senha");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-customers"] });
    },
  });
}

// Format phone for display
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
