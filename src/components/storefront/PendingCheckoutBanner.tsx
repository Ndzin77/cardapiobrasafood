import { useState, useEffect, useCallback } from "react";
import { Globe, Clock, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PendingCheckoutBannerProps {
  slug: string;
  checkoutModalOpen: boolean;
  onOpenCheckoutModal: () => void;
}

interface PendingData {
  id: string;
  url: string;
  createdAt: string;
}

export function PendingCheckoutBanner({ slug, checkoutModalOpen, onOpenCheckoutModal }: PendingCheckoutBannerProps) {
  const [data, setData] = useState<PendingData | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [dismissed30sTimeout, setDismissed30sTimeout] = useState<NodeJS.Timeout | null>(null);

  // Read localStorage
  const readStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(`vitrine-pending-checkout-${slug}`);
      if (!raw) { setData(null); return; }
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.url) {
        setData(parsed);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
  }, [slug]);

  useEffect(() => {
    readStorage();
    // Re-check on storage events from other tabs
    const handler = () => readStorage();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [readStorage]);

  // Fetch status + expires_at
  useEffect(() => {
    if (!data?.id) return;

    const check = async () => {
      const { data: row, error } = await supabase
        .rpc("get_checkout_status", { p_checkout_id: data.id }) as { data: { status: string; expires_at: string; total: number } | null; error: any };

      if (error || !row) {
        localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setData(null);
        return;
      }

      if (row.status === "paid" || row.status === "expired" || row.status === "failed") {
        localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setData(null);
        return;
      }

      const exp = new Date(row.expires_at);
      if (exp.getTime() < Date.now()) {
        localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setData(null);
        return;
      }

      setExpiresAt(exp);
      setTotal(Number(row.total));
    };

    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [data?.id, slug]);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setData(null);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, slug]);

  // Handle dismiss with 30s re-show
  const handleDismiss = () => {
    setDismissed(true);
    if (dismissed30sTimeout) clearTimeout(dismissed30sTimeout);
    const t = setTimeout(() => setDismissed(false), 30000);
    setDismissed30sTimeout(t);
  };

  useEffect(() => {
    return () => {
      if (dismissed30sTimeout) clearTimeout(dismissed30sTimeout);
    };
  }, [dismissed30sTimeout]);

  // Don't render if no data, modal is open, or dismissed
  if (!data || checkoutModalOpen || dismissed || !countdown || countdown === "00:00") return null;

  const isUrgent = countdown <= "05:00";

  return (
    <div className={`fixed top-0 left-0 right-0 z-[60] animate-slide-down ${
      isUrgent 
        ? "bg-gradient-to-r from-orange-500 to-red-500" 
        : "bg-gradient-to-r from-amber-500 to-orange-500"
    } text-white shadow-lg`}>
      <div className="container px-3 py-2 flex items-center gap-2 sm:gap-3">
        <Clock className="w-4 h-4 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs sm:text-sm font-bold font-mono tabular-nums">{countdown}</span>
          {total !== null && (
            <span className="text-xs sm:text-sm font-medium opacity-90">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          )}
          <span className="text-xs opacity-80 hidden sm:inline">Pagamento pendente</span>
        </div>
        <button
          onClick={() => window.open(data.url, "_blank")}
          className="shrink-0 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1"
        >
          <Globe className="w-3.5 h-3.5" />
          Pagar
        </button>
        <button
          onClick={onOpenCheckoutModal}
          className="shrink-0 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors flex items-center gap-1"
        >
          <Eye className="w-3 h-3" />
          <span className="hidden sm:inline">Detalhes</span>
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
