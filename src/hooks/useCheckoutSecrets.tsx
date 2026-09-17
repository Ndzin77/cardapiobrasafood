import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to read/write checkout secrets from the secure `store_checkout_secrets` table.
 * Only store owners can access this data (RLS enforced).
 */
export function useCheckoutSecrets(storeId: string | undefined) {
  return useQuery({
    queryKey: ["checkout-secrets", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const { data, error } = await supabase
        .from("store_checkout_secrets" as any)
        .select("id, store_id, checkout_config")
        .eq("store_id", storeId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching checkout secrets:", error);
        return null;
      }
      return data as unknown as { id: string; store_id: string; checkout_config: Record<string, any> } | null;
    },
    enabled: !!storeId,
  });
}

export function useUpsertCheckoutSecrets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      checkoutConfig,
    }: {
      storeId: string;
      checkoutConfig: Record<string, any>;
    }) => {
      // Try update first, then insert if not exists
      const { data: existing } = await supabase
        .from("store_checkout_secrets" as any)
        .select("id")
        .eq("store_id", storeId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("store_checkout_secrets" as any)
          .update({ checkout_config: checkoutConfig })
          .eq("store_id", storeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_checkout_secrets" as any)
          .insert({ store_id: storeId, checkout_config: checkoutConfig });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["checkout-secrets", vars.storeId] });
    },
    onError: (error) => {
      console.error("Error saving checkout secrets:", error);
      toast.error("Erro ao salvar credenciais de checkout.");
    },
  });
}
