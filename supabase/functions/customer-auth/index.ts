const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──────────────────────────────────────────────

interface RegisterRequest { action: "register"; store_id: string; phone: string; name: string; password: string; }
interface LoginRequest { action: "login"; store_id: string; phone: string; password: string; }
interface SetPasswordRequest { action: "set_password"; customer_id: string; password: string; }
interface ResetPasswordRequest { action: "reset_password"; customer_id: string; }
interface ListAddressesRequest { action: "list_addresses"; customer_id: string; store_id: string; }
interface SaveAddressRequest {
  action: "save_address"; customer_id: string; store_id: string;
  address: { id?: string; label: string; cep: string; street: string; number?: string; complement?: string; neighborhood: string; city: string; state: string; is_default?: boolean; };
}
interface DeleteAddressRequest { action: "delete_address"; customer_id: string; address_id: string; }
interface SetDefaultAddressRequest { action: "set_default_address"; customer_id: string; address_id: string; }

type RequestBody = RegisterRequest | LoginRequest | SetPasswordRequest | ResetPasswordRequest
  | ListAddressesRequest | SaveAddressRequest | DeleteAddressRequest | SetDefaultAddressRequest;

// ── Helpers ────────────────────────────────────────────

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizePhone(phone: string) { return String(phone || "").replace(/\D/g, ""); }

function base64FromBytes(bytes: Uint8Array) { let b = ""; for (const v of bytes) b += String.fromCharCode(v); return btoa(b); }
function bytesFromBase64(b64: string) { const b = atob(b64); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256" as const;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH }, km, 256);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${base64FromBytes(salt)}$${base64FromBytes(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4) return false;
  const [alg, iterStr, saltB64, hashB64] = parts;
  if (alg !== "pbkdf2_sha256") return false;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;
  const salt = bytesFromBase64(saltB64);
  const expected = bytesFromBase64(hashB64);
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: PBKDF2_HASH }, km, expected.length * 8);
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

function getEnv(name: string) { const v = Deno.env.get(name); if (!v) throw new Error(`Missing env var: ${name}`); return v; }

function restHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function restGet<T>(pathWithQuery: string, key: string): Promise<T> {
  const res = await fetch(`${getEnv("SUPABASE_URL")}${pathWithQuery}`, { headers: restHeaders(key) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`);
  return data as T;
}

async function restPost<T>(path: string, body: unknown, key: string, preferReturn = true): Promise<T> {
  const res = await fetch(`${getEnv("SUPABASE_URL")}${path}`, {
    method: "POST", headers: { ...restHeaders(key), ...(preferReturn ? { Prefer: "return=representation" } : {}) }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`);
  return data as T;
}

async function restPatch<T>(pathWithQuery: string, body: unknown, key: string, preferReturn = false): Promise<T> {
  const res = await fetch(`${getEnv("SUPABASE_URL")}${pathWithQuery}`, {
    method: "PATCH", headers: { ...restHeaders(key), ...(preferReturn ? { Prefer: "return=representation" } : {}) }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`);
  return data as T;
}

async function restDelete(pathWithQuery: string, key: string): Promise<void> {
  const res = await fetch(`${getEnv("SUPABASE_URL")}${pathWithQuery}`, {
    method: "DELETE", headers: restHeaders(key),
  });
  if (!res.ok) { const data = await res.json().catch(() => null); throw new Error((data as any)?.message || `HTTP ${res.status}`); }
}

async function getUserIdFromAuthHeader(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_PUBLIC_KEY") || "";
  if (!anonKey) return null;
  const res = await fetch(`${getEnv("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => null);
  if (!res.ok) return null;
  return (data as any)?.id || null;
}

// ── Main Handler ───────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const body: RequestBody = await req.json();

    switch (body.action) {

      // ═══════════════ REGISTER ═══════════════
      case "register": {
        const { store_id, phone, name, password } = body as RegisterRequest;
        if (!store_id || !phone || !name || !password) return json(400, { error: "Campos obrigatórios faltando" });
        if (password.length < 4) return json(400, { error: "Senha deve ter no mínimo 4 caracteres" });

        const normalizedPhone = normalizePhone(phone);
        const query = new URLSearchParams({ select: "id,name,password_hash", store_id: `eq.${store_id}`, phone: `eq.${normalizedPhone}`, limit: "1" });
        const existingArr = await restGet<any[]>(`/rest/v1/customers?${query}`, serviceKey);
        const existing = existingArr?.[0];

        if (existing) {
          if (existing.password_hash) return json(409, { error: "Este telefone já está cadastrado. Faça login." });
          const ph = await hashPassword(password);
          await restPatch(`/rest/v1/customers?id=eq.${existing.id}`, { password_hash: ph, name }, serviceKey);
          return json(200, { success: true, customer_id: existing.id, customer_name: name, message: "Senha criada com sucesso" });
        }

        const ph = await hashPassword(password);
        const created = await restPost<any[]>("/rest/v1/customers", { store_id, phone: normalizedPhone, name, password_hash: ph }, serviceKey, true);
        const nc = created?.[0];
        if (!nc?.id) throw new Error("Falha ao criar cliente");
        return json(201, { success: true, customer_id: nc.id, customer_name: name, message: "Conta criada com sucesso" });
      }

      // ═══════════════ LOGIN ═══════════════
      case "login": {
        const { store_id, phone, password } = body as LoginRequest;
        if (!store_id || !phone || !password) return json(400, { error: "Campos obrigatórios faltando" });
        const normalizedPhone = normalizePhone(phone);
        const query = new URLSearchParams({ select: "id,name,password_hash", store_id: `eq.${store_id}`, phone: `eq.${normalizedPhone}`, limit: "1" });
        const arr = await restGet<any[]>(`/rest/v1/customers?${query}`, serviceKey);
        const customer = arr?.[0];
        if (!customer) return json(404, { error: "Telefone não encontrado. Cadastre-se primeiro." });
        if (!customer.password_hash) return json(401, { error: "Senha não definida", needs_password: true, customer_id: customer.id, customer_name: customer.name });
        const isValid = await verifyPassword(password, customer.password_hash);
        if (!isValid) return json(401, { error: "Senha incorreta" });
        await restPatch(`/rest/v1/customers?id=eq.${customer.id}`, { last_login_at: new Date().toISOString() }, serviceKey);
        return json(200, { success: true, customer_id: customer.id, customer_name: customer.name });
      }

      // ═══════════════ SET PASSWORD ═══════════════
      case "set_password": {
        const { customer_id, password } = body as SetPasswordRequest;
        if (!customer_id || !password) return json(400, { error: "Campos obrigatórios faltando" });
        if (password.length < 4) return json(400, { error: "Senha deve ter no mínimo 4 caracteres" });
        const ph = await hashPassword(password);
        await restPatch(`/rest/v1/customers?id=eq.${customer_id}`, { password_hash: ph, last_login_at: new Date().toISOString() }, serviceKey);
        return json(200, { success: true, message: "Senha definida com sucesso" });
      }

      // ═══════════════ RESET PASSWORD ═══════════════
      case "reset_password": {
        const { customer_id } = body as ResetPasswordRequest;
        if (!customer_id) return json(400, { error: "Campos obrigatórios faltando" });
        const userId = await getUserIdFromAuthHeader(req);
        if (!userId) return json(401, { error: "Não autorizado" });
        const qCust = new URLSearchParams({ select: "store_id", id: `eq.${customer_id}`, limit: "1" });
        const custArr = await restGet<any[]>(`/rest/v1/customers?${qCust}`, serviceKey);
        const cust = custArr?.[0];
        if (!cust?.store_id) return json(404, { error: "Cliente não encontrado" });
        const qStore = new URLSearchParams({ select: "user_id", id: `eq.${cust.store_id}`, limit: "1" });
        const storeArr = await restGet<any[]>(`/rest/v1/stores?${qStore}`, serviceKey);
        const store = storeArr?.[0];
        if (!store?.user_id || store.user_id !== userId) return json(403, { error: "Não autorizado" });
        await restPatch(`/rest/v1/customers?id=eq.${customer_id}`, { password_hash: null }, serviceKey);
        return json(200, { success: true, message: "Senha removida. Cliente pode criar nova senha." });
      }

      // ═══════════════ LIST ADDRESSES ═══════════════
      case "list_addresses": {
        const { customer_id, store_id } = body as ListAddressesRequest;
        if (!customer_id || !store_id) return json(400, { error: "Campos obrigatórios faltando" });
        const query = new URLSearchParams({
          select: "id,label,cep,street,number,complement,neighborhood,city,state,is_default,created_at",
          customer_id: `eq.${customer_id}`, store_id: `eq.${store_id}`,
          order: "is_default.desc,updated_at.desc", limit: "5",
        });
        const addresses = await restGet<any[]>(`/rest/v1/customer_addresses?${query}`, serviceKey);
        return json(200, { success: true, addresses: addresses || [] });
      }

      // ═══════════════ SAVE ADDRESS ═══════════════
      case "save_address": {
        const { customer_id, store_id, address } = body as SaveAddressRequest;
        if (!customer_id || !store_id || !address?.cep || !address?.street || !address?.neighborhood || !address?.city) {
          return json(400, { error: "Campos obrigatórios faltando" });
        }

        // If updating existing address
        if (address.id) {
          await restPatch(`/rest/v1/customer_addresses?id=eq.${address.id}&customer_id=eq.${customer_id}`, {
            label: address.label || "Casa", cep: address.cep, street: address.street, number: address.number || null,
            complement: address.complement || null, neighborhood: address.neighborhood, city: address.city, state: address.state || "",
          }, serviceKey);
          return json(200, { success: true, message: "Endereço atualizado" });
        }

        // Check limit (max 5)
        const countQuery = new URLSearchParams({ select: "id", customer_id: `eq.${customer_id}`, store_id: `eq.${store_id}` });
        const existing = await restGet<any[]>(`/rest/v1/customer_addresses?${countQuery}`, serviceKey);
        if ((existing || []).length >= 5) return json(400, { error: "Limite de 5 endereços atingido. Remova um antes de adicionar." });

        // If this is the first address or marked as default, set is_default
        const isFirst = (existing || []).length === 0;
        const isDefault = isFirst || address.is_default === true;

        // If setting as default, unset others
        if (isDefault && !isFirst) {
          await restPatch(`/rest/v1/customer_addresses?customer_id=eq.${customer_id}&store_id=eq.${store_id}&is_default=eq.true`, { is_default: false }, serviceKey);
        }

        const created = await restPost<any[]>("/rest/v1/customer_addresses", {
          customer_id, store_id, label: address.label || "Casa", cep: address.cep, street: address.street,
          number: address.number || null, complement: address.complement || null,
          neighborhood: address.neighborhood, city: address.city, state: address.state || "",
          is_default: isDefault,
        }, serviceKey, true);

        return json(201, { success: true, address: created?.[0], message: "Endereço salvo" });
      }

      // ═══════════════ DELETE ADDRESS ═══════════════
      case "delete_address": {
        const { customer_id, address_id } = body as DeleteAddressRequest;
        if (!customer_id || !address_id) return json(400, { error: "Campos obrigatórios faltando" });
        await restDelete(`/rest/v1/customer_addresses?id=eq.${address_id}&customer_id=eq.${customer_id}`, serviceKey);
        return json(200, { success: true, message: "Endereço removido" });
      }

      // ═══════════════ SET DEFAULT ADDRESS ═══════════════
      case "set_default_address": {
        const { customer_id, address_id } = body as SetDefaultAddressRequest;
        if (!customer_id || !address_id) return json(400, { error: "Campos obrigatórios faltando" });
        // Get store_id from address
        const addrQuery = new URLSearchParams({ select: "store_id", id: `eq.${address_id}`, customer_id: `eq.${customer_id}`, limit: "1" });
        const addrArr = await restGet<any[]>(`/rest/v1/customer_addresses?${addrQuery}`, serviceKey);
        const addr = addrArr?.[0];
        if (!addr) return json(404, { error: "Endereço não encontrado" });
        // Unset all defaults for this customer+store, then set this one
        await restPatch(`/rest/v1/customer_addresses?customer_id=eq.${customer_id}&store_id=eq.${addr.store_id}&is_default=eq.true`, { is_default: false }, serviceKey);
        await restPatch(`/rest/v1/customer_addresses?id=eq.${address_id}`, { is_default: true }, serviceKey);
        return json(200, { success: true, message: "Endereço principal definido" });
      }

      default:
        return json(400, { error: "Ação inválida" });
    }
  } catch (error: any) {
    console.error("Error in customer-auth function:", error);
    return json(500, { error: error?.message || "Erro interno" });
  }
});
