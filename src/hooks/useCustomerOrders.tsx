import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OrderItem, Order } from "./useOrders";

const CUSTOMER_PHONE_KEY = "vitrine-customer-phone";
const CUSTOMER_NAME_KEY = "vitrine-customer-name";
const CUSTOMER_ADDRESS_KEY = "vitrine-customer-address";
const CUSTOMER_ADDRESSES_LIST_KEY = "vitrine-customer-addresses";

export interface CustomerInfo {
  phone: string;
  name: string;
}

export interface CustomerAddressInfo {
  id?: string;
  label?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  is_default?: boolean;
  google_maps_url?: string;
  // Extra contact data saved with address
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

// Save customer info to localStorage
export function saveCustomerInfo(info: CustomerInfo) {
  try {
    localStorage.setItem(CUSTOMER_PHONE_KEY, info.phone);
    localStorage.setItem(CUSTOMER_NAME_KEY, info.name);
  } catch (e) {
    console.warn("Failed to save customer info:", e);
  }
}

// Save customer address to localStorage (legacy single-address compat)
export function saveCustomerAddress(addr: CustomerAddressInfo) {
  try {
    localStorage.setItem(CUSTOMER_ADDRESS_KEY, JSON.stringify(addr));
    // Also add to address list
    addToAddressList(addr);
  } catch (e) {
    console.warn("Failed to save customer address:", e);
  }
}

// Load customer info from localStorage
export function loadCustomerInfo(): CustomerInfo | null {
  try {
    const phone = localStorage.getItem(CUSTOMER_PHONE_KEY);
    const name = localStorage.getItem(CUSTOMER_NAME_KEY);
    if (phone) return { phone, name: name || "" };
  } catch (e) {
    console.warn("Failed to load customer info:", e);
  }
  return null;
}

// Load customer address from localStorage
export function loadCustomerAddress(): CustomerAddressInfo | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_ADDRESS_KEY);
    if (raw) return JSON.parse(raw) as CustomerAddressInfo;
  } catch (e) {
    console.warn("Failed to load customer address:", e);
  }
  return null;
}

// ── Address List (localStorage, max 3 for visitors) ──

export function loadAddressList(): CustomerAddressInfo[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_ADDRESSES_LIST_KEY);
    if (raw) return JSON.parse(raw) as CustomerAddressInfo[];
  } catch (e) {
    console.warn("Failed to load address list:", e);
  }
  return [];
}

export function saveAddressList(list: CustomerAddressInfo[]) {
  try {
    localStorage.setItem(CUSTOMER_ADDRESSES_LIST_KEY, JSON.stringify(list.slice(0, 3)));
  } catch (e) {
    console.warn("Failed to save address list:", e);
  }
}

export function addToAddressList(addr: CustomerAddressInfo) {
  if (!addr.cep || !addr.street) return;
  const list = loadAddressList();
  // Check if already exists (by cep+street+number)
  const key = `${addr.cep}-${addr.street}-${addr.number || ""}`;
  const existing = list.findIndex(a => `${a.cep}-${a.street}-${a.number || ""}` === key);
  
  const newAddr: CustomerAddressInfo = {
    ...addr,
    id: addr.id || `local-${Date.now()}`,
    label: addr.label || suggestLabel(addr, list),
    is_default: list.length === 0 ? true : addr.is_default,
  };

  if (existing >= 0) {
    list[existing] = { ...list[existing], ...newAddr };
  } else {
    // If setting as default, unset others
    if (newAddr.is_default) {
      list.forEach(a => a.is_default = false);
    }
    list.unshift(newAddr);
  }

  saveAddressList(list);
}

export function removeFromAddressList(id: string) {
  const list = loadAddressList().filter(a => a.id !== id);
  saveAddressList(list);
}

export function setDefaultInAddressList(id: string) {
  const list = loadAddressList();
  list.forEach(a => a.is_default = a.id === id);
  saveAddressList(list);
}

function suggestLabel(addr: CustomerAddressInfo, existing: CustomerAddressInfo[]): string {
  const labels = existing.map(a => a.label?.toLowerCase() || "");
  if (!labels.includes("casa")) return "Casa";
  if (!labels.includes("trabalho")) return "Trabalho";
  return `Endereço ${existing.length + 1}`;
}

// Clear customer info from localStorage
export function clearCustomerInfo() {
  try {
    localStorage.removeItem(CUSTOMER_PHONE_KEY);
    localStorage.removeItem(CUSTOMER_NAME_KEY);
    localStorage.removeItem(CUSTOMER_ADDRESS_KEY);
  } catch (e) {
    console.warn("Failed to clear customer info:", e);
  }
}

// Normalize phone number for comparison (remove non-digits)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Hook to fetch customer orders by phone number for a specific store
export function useCustomerOrders(storeId: string | undefined, customerPhone: string | null) {
  return useQuery({
    queryKey: ["customer-orders", storeId, customerPhone],
    queryFn: async () => {
      if (!storeId || !customerPhone) return [];
      const normalizedPhone = normalizePhone(customerPhone);
      if (normalizedPhone.length < 8) return [];
      const { data, error } = await supabase.rpc(
        "get_customer_orders_by_phone" as any,
        { p_store_id: storeId, p_phone: normalizedPhone }
      );
      if (error) throw error;
      return ((data as any[]) || []).map((order: any) => ({
        ...order,
        items: (order.items as unknown as OrderItem[]) || [],
        subtotal: Number(order.subtotal),
        delivery_fee: Number(order.delivery_fee),
        total: Number(order.total),
      })) as Order[];
    },
    enabled: !!storeId && !!customerPhone && normalizePhone(customerPhone).length >= 8,
  });
}
