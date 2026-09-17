import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface OpeningHour {
  day: string;
  hours: string;
  isOpen: boolean;
}

export interface DbStore {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  google_maps_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp_message: string | null;
  instagram: string | null;
  delivery_fee: number;
  min_order: number;
  estimated_time: string;
  accepted_payments: string[];
  is_open: boolean;
  opening_hours: OpeningHour[];
  theme_color: string;
  rating: number;
  review_count: number;
  checkout_link: string | null;
  custom_payments: { id: string; name: string; description?: string }[];
  help_button_enabled: boolean;
  help_button_message: string | null;
  payment_icons: Record<string, any> | null;
  checkout_provider: string;
  checkout_config: Record<string, any> | null;
  checkout_mode: string;
  upsell_enabled: boolean;
  upsell_mode: string;
  preorder_enabled: boolean;
  preorder_config: Record<string, any>;
  show_watermark: boolean;
  unavailable_mode: string;
  unavailable_message: string;
  delivery_zone_enabled: boolean;
  ordering_mode: string;
  ordering_hours: OpeningHour[];
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  store_id: string;
  name: string;
  icon: string;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbProduct {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  sort_order: number;
  has_options: boolean;
  options: any;
  min_order_quantity: number;
  stock_enabled: boolean;
  stock_quantity: number | null;
  fulfillment_mode: string;
  created_at: string;
  updated_at: string;
}

// Helper to convert DB row to DbStore
function toDbStore(row: any): DbStore {
  return {
    ...row,
    opening_hours: (row.opening_hours as OpeningHour[]) || [],
  };
}

export function useMyStore() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return toDbStore(data);
    },
    enabled: !!user,
  });
}

export function useStoreBySlug(slug: string) {
  return useQuery({
    queryKey: ["store", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_stores" as any)
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return toDbStore(data);
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 min - store info rarely changes
    gcTime: 1000 * 60 * 10,
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<DbStore>) => {
      if (!user) throw new Error("Not authenticated");

      // Do not include primary key / ownership fields in the UPDATE payload.
      // We use them only to target the row.
      const { id: storeId, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...safeUpdates } =
        (updates as any) ?? {};

      // Convert opening_hours to Json compatible format
      const dbUpdates = {
        ...safeUpdates,
        opening_hours: (safeUpdates as any).opening_hours as unknown as Json,
      };
      
      // Prefer targeting by store id (when provided) to avoid ambiguity and ensure RLS matches.
      // Fallback to user_id for backward compatibility.
      let query = supabase
        .from("stores")
        .update(dbUpdates)
        .select();

      if (storeId) {
        query = query.eq("id", storeId).eq("user_id", user.id);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.single();
      
      if (error) throw error;
      return toDbStore(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Loja atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar loja: " + error.message);
    },
  });
}

export function useCategories(storeId: string | undefined) {
  return useQuery({
    queryKey: ["categories", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as DbCategory[];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 3, // 3 min
    gcTime: 1000 * 60 * 10,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<DbCategory, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("categories")
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories", data.store_id] });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories", data.store_id] });
      toast.success("Categoria atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, storeId }: { id: string; storeId: string }) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { id, storeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories", data.storeId] });
      toast.success("Categoria removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover categoria: " + error.message);
    },
  });
}

export function useProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as DbProduct[];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2, // 2 min - realtime handles updates
    gcTime: 1000 * 60 * 10,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<DbProduct, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products", data.store_id] });
      toast.success("Produto criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products", data.store_id] });
      toast.success("Produto atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, storeId }: { id: string; storeId: string }) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { id, storeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products", data.storeId] });
      toast.success("Produto removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover produto: " + error.message);
    },
  });
}
