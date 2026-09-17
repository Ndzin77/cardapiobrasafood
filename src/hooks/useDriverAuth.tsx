import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriverSession {
  id: string;
  name: string;
  phone: string;
  store_id: string;
}

export function useDriverAuth(storeId: string | null) {
  const storageKey = storeId ? `driver_session_${storeId}` : null;

  const [driver, setDriver] = useState<DriverSession | null>(() => {
    if (!storageKey) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setDriver(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const login = useCallback(async (phone: string, pin: string) => {
    if (!storeId) return false;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("driver_login", {
        p_store_id: storeId,
        p_phone: phone.replace(/\D/g, ""),
        p_pin: pin,
      } as any);

      if (rpcError) throw rpcError;

      // RPC returns null when credentials are wrong
      if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
        setError("Telefone ou PIN incorretos");
        setLoading(false);
        return false;
      }

      const session = data as unknown as DriverSession;
      setDriver(session);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(session));
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Erro ao conectar. Tente novamente.");
      setLoading(false);
      return false;
    }
  }, [storeId, storageKey]);

  const logout = useCallback(() => {
    setDriver(null);
    if (storageKey) localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { driver, loading, error, login, logout };
}
