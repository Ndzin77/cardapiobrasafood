import { useCart } from "@/hooks/useCart";
import { StoreInfo, CartItem } from "@/types/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, PackageX, PartyPopper, Truck, Package, Clock, ArrowRightLeft, MapPin, Globe, Eye, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { CheckoutModal } from "./CheckoutModal";
import { CartUpsell } from "./CartUpsell";
import { useProducts } from "@/hooks/useStore";
import { useUpsellSuggestions } from "@/hooks/useUpsell";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { getZoneFeeRange } from "@/lib/deliveryZones";

interface DynamicCartSheetProps {
  store: StoreInfo;
  storeId: string;
  slug?: string;
  initialCheckoutId?: string | null;
  initialCheckoutStatus?: "paid" | "pending" | null;
  initialCheckoutUrl?: string | null;
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
  onCheckoutHandled?: () => void;
}

export function DynamicCartSheet({ store, storeId, slug, initialCheckoutId, initialCheckoutStatus, initialCheckoutUrl, forceOpen, onForceOpenHandled, onCheckoutHandled }: DynamicCartSheetProps) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, subtotal, clearCart, instantItems, preorderItems, moveToPreorder, moveToInstant, instantSubtotal, preorderSubtotal } = useCart();

  const [showCheckout, setShowCheckout] = useState(!!initialCheckoutId);
  const [checkoutOrderType, setCheckoutOrderType] = useState<"instant" | "preorder">("instant");
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);

  // Force open checkout modal from external trigger (e.g., PendingCheckoutBanner)
  useEffect(() => {
    if (forceOpen && !showCheckout) {
      setShowCheckout(true);
      onForceOpenHandled?.();
    }
  }, [forceOpen]);

  const { data: liveProducts } = useProducts(storeId || undefined);

  const { data: storeConfig } = useQuery({
    queryKey: ["store-upsell-config", storeId],
    queryFn: async (): Promise<{ upsell_enabled: boolean; upsell_mode: string } | null> => {
      const { data } = await supabase
        .from("public_stores" as any)
        .select("upsell_enabled, upsell_mode")
        .eq("id", storeId)
        .single();
      return data as any;
    },
    enabled: !!storeId,
  });

  const cartProductIds = useMemo(() => items.map(i => i.product.id), [items]);
  const cartCategoryIds = useMemo(() =>
    [...new Set(items.map(i => i.product.category).filter(Boolean))],
    [items]
  );

  const upsellSuggestions = useUpsellSuggestions(
    storeId,
    cartProductIds,
    cartCategoryIds,
    liveProducts || [],
    storeConfig?.upsell_enabled ?? false,
    storeConfig?.upsell_mode || "auto",
  );

  // Delivery fee preview from zones
  const { data: deliveryZones = [] } = useDeliveryZones(storeId);
  const feePreview = useMemo(() => {
    if (store.deliveryZoneEnabled && deliveryZones.length > 0) {
      const range = getZoneFeeRange(deliveryZones);
      if (range.min === range.max) return range.min > 0 ? `frete R$ ${range.min.toFixed(2).replace(".", ",")}` : "frete grátis";
      return `frete R$ ${range.min.toFixed(2).replace(".", ",")} ~ R$ ${range.max.toFixed(2).replace(".", ",")}`;
    }
    if (store.deliveryFee > 0) return `frete R$ ${store.deliveryFee.toFixed(2).replace(".", ",")}`;
    return "frete no checkout";
  }, [store.deliveryZoneEnabled, store.deliveryFee, deliveryZones]);

  // Check stock for items
  const getAvailableAndOOS = (sectionItems: CartItem[]) => {
    const available: CartItem[] = [];
    const oos: { item: CartItem; reason: string }[] = [];
    sectionItems.forEach((item) => {
      const live = liveProducts?.find(p => p.id === item.product.id);
      if (live && !live.available) {
        oos.push({ item, reason: "Produto indisponível" });
      } else if (live && live.stock_enabled && typeof live.stock_quantity === "number" && live.stock_quantity === 0) {
        oos.push({ item, reason: "Estoque esgotado" });
      } else {
        available.push(item);
      }
    });
    return { available, oos };
  };

  const instantAvail = getAvailableAndOOS(instantItems);
  const preorderAvail = getAvailableAndOOS(preorderItems);
  const allAvailable = [...instantAvail.available, ...preorderAvail.available];
  const allOOS = [...instantAvail.oos, ...preorderAvail.oos];

  const instantTotal = instantSubtotal; // delivery fee calculated at checkout
  const preorderTotal = preorderSubtotal; // delivery fee handled in checkout

  const meetsMinOrderInstant = instantSubtotal >= store.minOrder || instantItems.length === 0;
  const meetsMinOrderPreorder = preorderSubtotal >= store.minOrder || preorderItems.length === 0;

  // Progress for instant
  const instantProgressPct = store.minOrder > 0 && instantItems.length > 0 ? Math.min(100, (instantSubtotal / store.minOrder) * 100) : 100;

  // CTA shimmer on milestone
  const [ctaShimmer, setCtaShimmer] = useState(false);
  const prevMeetsMin = useRef(meetsMinOrderInstant);
  useEffect(() => {
    if (meetsMinOrderInstant && !prevMeetsMin.current) {
      setCtaShimmer(true);
      const t = setTimeout(() => setCtaShimmer(false), 3000);
      return () => clearTimeout(t);
    }
    prevMeetsMin.current = meetsMinOrderInstant;
  }, [meetsMinOrderInstant]);

  // ─── Pending checkout card inside cart ───
  const [pendingData, setPendingData] = useState<{ id: string; url: string } | null>(null);
  const [pendingExpiresAt, setPendingExpiresAt] = useState<Date | null>(null);
  const [pendingCountdown, setPendingCountdown] = useState("");
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);

  const readPendingStorage = useCallback(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem(`vitrine-pending-checkout-${slug}`);
      if (!raw) { setPendingData(null); return; }
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.url) setPendingData(parsed);
      else setPendingData(null);
    } catch { setPendingData(null); }
  }, [slug]);

  useEffect(() => {
    readPendingStorage();
    const handler = () => readPendingStorage();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [readPendingStorage]);

  // Validate pending checkout status
  useEffect(() => {
    if (!pendingData?.id) { setPendingExpiresAt(null); setPendingTotal(null); return; }
    const check = async () => {
      const { data: row, error } = await supabase
        .rpc("get_checkout_status", { p_checkout_id: pendingData.id }) as { data: { status: string; expires_at: string; total: number } | null; error: any };
      if (error || !row || row.status !== "pending") {
        if (slug) localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setPendingData(null);
        return;
      }
      const exp = new Date(row.expires_at);
      if (exp.getTime() < Date.now()) {
        if (slug) localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setPendingData(null);
        return;
      }
      setPendingExpiresAt(exp);
      setPendingTotal(Number(row.total));
    };
    check();
    const interval = setInterval(() => { if (document.hidden) return; check(); }, 15000);
    return () => clearInterval(interval);
  }, [pendingData?.id, slug]);

  // Countdown ticker
  useEffect(() => {
    if (!pendingExpiresAt) { setPendingCountdown(""); return; }
    const tick = () => {
      const diff = pendingExpiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setPendingCountdown("00:00");
        if (slug) localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        setPendingData(null);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setPendingCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(() => { if (document.hidden) return; tick(); }, 1000);
    return () => clearInterval(interval);
  }, [pendingExpiresAt, slug]);

  const hasPendingCheckout = !!pendingData && !!pendingCountdown && pendingCountdown !== "00:00";
  const pendingIsUrgent = pendingCountdown <= "05:00" && pendingCountdown > "00:00";

  const getRemaining = (productId: string): number | null => {
    const live = liveProducts?.find(p => p.id === productId);
    if (live && live.stock_enabled && typeof live.stock_quantity === "number") {
      return live.stock_quantity;
    }
    return null;
  };

  const handleCheckout = (orderType: "instant" | "preorder") => {
    const sectionItems = orderType === "instant" ? instantItems : preorderItems;
    
    let adjusted = false;
    sectionItems.forEach((item) => {
      const remaining = getRemaining(item.product.id);
      if (remaining !== null && item.quantity > remaining) {
        if (remaining > 0) {
          updateQuantity(item.product.id, remaining, item.notes);
          adjusted = true;
        }
      }
    });

    const sectionOOS = orderType === "instant" ? instantAvail.oos : preorderAvail.oos;
    sectionOOS.forEach(({ item }) => {
      removeItem(item.product.id, item.notes);
    });

    if (adjusted || sectionOOS.length > 0) {
      toast.info("Seu pedido foi ajustado conforme o estoque disponível.", {
        duration: 3000,
        position: "bottom-center",
      });
      return;
    }

    setCheckoutOrderType(orderType);
    setCheckoutItems(sectionItems);
    setShowCheckout(true);
  };

  const renderCartItem = (item: CartItem, canToggle: boolean) => {
    const minQty = item.product.minQuantity ?? 1;
    const remaining = getRemaining(item.product.id);
    const isLowStock = remaining !== null && remaining > 0 && remaining < item.quantity;
    const isBoth = item.product.fulfillmentMode === "both";
    const effectiveFulfillment = item.fulfillmentOverride || "instant";

    return (
      <div
        key={`${item.product.id}-${item.notes || ''}`}
        className="bg-secondary/50 rounded-xl p-3 animate-scale-in"
      >
        <div className="flex gap-3">
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground text-sm line-clamp-1">
              {item.product.name}
            </h4>
            {item.notes && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {item.notes}
              </p>
            )}
            <p className="text-primary font-semibold text-sm mt-0.5">
              R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
            </p>

            {remaining !== null && remaining > 0 && (
              <p className={`text-xs mt-0.5 ${isLowStock ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                {isLowStock
                  ? `⚠️ Restam apenas ${remaining} un.`
                  : `${remaining} un. disponíveis`}
              </p>
            )}

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = item.quantity - minQty;
                    if (next < minQty) removeItem(item.product.id, item.notes);
                    else updateQuantity(item.product.id, next, item.notes);
                  }}
                  disabled={item.quantity <= minQty}
                  className="w-7 h-7 flex items-center justify-center bg-background rounded-full border border-border hover:bg-muted transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-medium text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity + minQty, item.notes)}
                  className="w-7 h-7 flex items-center justify-center bg-background rounded-full border border-border hover:bg-muted transition-colors active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Toggle fulfillment for "both" products */}
                {canToggle && isBoth && (
                  <button
                    onClick={() => {
                      if (effectiveFulfillment === "instant") {
                        moveToPreorder(item.product.id, item.notes);
                        toast.success(`${item.product.name} movido para encomenda 📦`, { duration: 1500, position: "bottom-center" });
                      } else {
                        moveToInstant(item.product.id, item.notes);
                        toast.success(`${item.product.name} movido para pronta entrega ⚡`, { duration: 1500, position: "bottom-center" });
                      }
                    }}
                    className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
                    title={effectiveFulfillment === "instant" ? "Mover para encomenda" : "Mover para pronta entrega"}
                  >








                    {/*ndx <ArrowRightLeft className="w-3.5 h-3.5" />  ndx*/}
<span className="text-xs font-semibold">
  {effectiveFulfillment === "instant" ? "mover para encomenda 📦" : "mover para pronta entrega ⚡"}
</span>








                  </button>
                )}
                <button
                  onClick={() => removeItem(item.product.id, item.notes)}
                  className="text-destructive hover:text-destructive/80 p-1 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasInstant = instantItems.length > 0;
  const hasPreorder = preorderItems.length > 0;
  const hasBothSections = hasInstant && hasPreorder;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Seu Pedido
              <span className="text-sm font-normal text-muted-foreground">
                ({items.length} {items.length === 1 ? "item" : "itens"})
              </span>
            </SheetTitle>
          </SheetHeader>

          {/* Pending Checkout Card — always visible, non-dismissable */}
          {hasPendingCheckout && (
            <div className={`shrink-0 border-b px-4 py-3 transition-colors duration-500 ${
              pendingIsUrgent 
                ? "bg-destructive/10 border-destructive/30" 
                : "bg-orange-500/10 border-orange-500/20"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  pendingIsUrgent ? "bg-destructive/20" : "bg-orange-500/15"
                }`}>
                  <Clock className={`w-5 h-5 ${pendingIsUrgent ? "text-destructive animate-pulse" : "text-orange-600 animate-pulse"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${pendingIsUrgent ? "text-destructive" : "text-orange-700"}`}>
                    {pendingIsUrgent ? "⚠️ Seu pedido está expirando!" : "Pagamento pendente"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`font-mono text-sm font-bold tabular-nums ${pendingIsUrgent ? "text-destructive" : "text-orange-600"}`}>
                      {pendingCountdown}
                    </span>
                    {pendingTotal !== null && (
                      <span className="text-xs text-muted-foreground font-medium">
                        · R$ {pendingTotal.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <Button
                  onClick={() => window.open(pendingData!.url, "_blank")}
                  size="sm"
                  className={`flex-1 h-9 text-xs font-bold gap-1.5 transition-shadow ${
                    pendingIsUrgent ? "shadow-[0_0_12px_hsl(var(--destructive)/0.4)]" : ""
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Pagar agora
                </Button>
                <Button
                  onClick={() => {
                    setShowCheckout(true);
                    onForceOpenHandled?.();
                  }}
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs font-medium gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Detalhes
                </Button>
              </div>
            </div>
          )}

          {items.length === 0 && !hasPendingCheckout ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-4xl mb-4">
                🛒
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Carrinho vazio
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Adicione produtos para fazer seu pedido
              </p>
              <Button onClick={() => setIsOpen(false)} variant="outline">
                Ver cardápio
              </Button>
            </div>
          ) : items.length === 0 && hasPendingCheckout ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
                <AlertTriangle className="w-7 h-7 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Finalize o pagamento acima ou adicione novos itens
              </p>
              <Button onClick={() => setIsOpen(false)} variant="outline" className="mt-3">
                Ver cardápio
              </Button>
            </div>
          ) : (
            <>
              {/* ZONA 1: Scroll — separated sections */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-0">
                {/* Savings badge */}
                {(() => {
                  const totalSavings = allAvailable.reduce((sum, item) => {
                    const orig = item.product.originalPrice;
                    if (orig && orig > item.product.price) {
                      return sum + (orig - item.product.price) * item.quantity;
                    }
                    return sum;
                  }, 0);
                  if (totalSavings <= 0) return null;
                  return (
                    <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2 animate-slide-up">
                      <span className="text-lg">💰</span>
                      <span className="text-sm font-semibold text-accent">
                        Você está economizando R$ {totalSavings.toFixed(2).replace(".", ",")} neste pedido!
                      </span>
                    </div>
                  );
                })()}

                {/* ⚡ PRONTA ENTREGA */}
                {hasInstant && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Truck className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">Pronta Entrega</span>
                      </div>
                      {hasBothSections && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {instantAvail.available.length} {instantAvail.available.length === 1 ? "item" : "itens"}
                        </span>
                      )}
                    </div>

                    {/* Nudge: instant closed, suggest preorder */}
                    {store.canOrderInstant === false && store.canOrderPreorder && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2 animate-slide-up">
                        <span className="text-lg">📦</span>
                        <p className="text-xs text-amber-700 font-medium flex-1">
                          Loja fechada para pronta entrega. Mova os itens para encomenda para agendar!
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {instantAvail.available.map((item) => renderCartItem(item, true))}
                    </div>

                    {/* Instant section CTA + min order */}
                    {hasBothSections && (
                      <div className="space-y-2 pt-1">
                        {store.minOrder > 0 && !meetsMinOrderInstant && (
                          <div className="space-y-1">
                            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                                style={{ width: `${instantProgressPct}%` }}
                              />
                            </div>
                            <p className="text-[10px] font-semibold text-center text-muted-foreground">
                              Faltam R$ {(store.minOrder - instantSubtotal).toFixed(2).replace(".", ",")} para pedido mínimo
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={() => handleCheckout("instant")}
                          disabled={!meetsMinOrderInstant || instantAvail.available.length === 0 || store.canOrderInstant === false}
                          className={`w-full h-10 text-sm font-semibold gap-2 relative overflow-hidden ${
                            ctaShimmer ? "animate-glow-pulse-accent shadow-glow-accent" : ""
                          }`}
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {store.canOrderInstant === false ? "⏰ Loja fechada" : `Finalizar Pedido · R$ ${instantSubtotal.toFixed(2).replace(".", ",")}`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider between sections */}
                {hasBothSections && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* 📦 ENCOMENDA */}
                {hasPreorder && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="relative">
                          <Package className="w-3.5 h-3.5 text-amber-600" />
                          <Clock className="w-2 h-2 text-amber-600 absolute -bottom-0.5 -right-1" />
                        </span>
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">Encomenda</span>
                      </div>
                      {hasBothSections && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {preorderAvail.available.length} {preorderAvail.available.length === 1 ? "item" : "itens"}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {preorderAvail.available.map((item) => renderCartItem(item, true))}
                    </div>

                    {/* Preorder section CTA */}
                    {hasBothSections && (
                      <div className="pt-1">
                        <Button
                          onClick={() => handleCheckout("preorder")}
                          disabled={!meetsMinOrderPreorder || preorderAvail.available.length === 0 || store.canOrderPreorder === false}
                          variant="outline"
                          className="w-full h-10 text-sm font-semibold gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          size="sm"
                        >
                          <Package className="w-4 h-4" />
                          Agendar Encomenda · R$ {preorderSubtotal.toFixed(2).replace(".", ",")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Out of stock items */}
                {allOOS.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <PackageX className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Esgotado
                      </span>
                    </div>
                    {allOOS.map(({ item, reason }) => (
                      <div
                        key={`oos-${item.product.id}-${item.notes || ''}`}
                        className="bg-muted/40 rounded-xl p-3 opacity-60 mb-2"
                      >
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 grayscale">
                            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm line-clamp-1">{item.product.name}</h4>
                            <p className="text-xs text-destructive font-medium mt-0.5">{reason}</p>
                          </div>
                          <button onClick={() => removeItem(item.product.id, item.notes)} className="text-muted-foreground hover:text-destructive p-1 self-center">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ZONA 2: Upsell */}
              {upsellSuggestions.length > 0 && allAvailable.length > 0 && (
                <div className="shrink-0 border-t border-border/40 bg-background px-3 pt-2 pb-2">
                  <CartUpsell suggestions={upsellSuggestions} />
                </div>
              )}

              {/* ZONA 3: Footer — single CTA when only one section */}
              {!hasBothSections && (
                <div className="shrink-0 border-t border-border px-3 pt-2.5 pb-3 space-y-2 bg-card safe-area-bottom">
                  {/* Price line */}
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {allAvailable.length} {allAvailable.length === 1 ? "item" : "itens"} · {feePreview}
                    </span>
                    <span className="font-bold text-primary text-base">
                      R$ {(hasInstant ? instantSubtotal : preorderSubtotal).toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  {/* Min order progress */}
                  {store.minOrder > 0 && !(hasInstant ? meetsMinOrderInstant : meetsMinOrderPreorder) && (
                    <div className="space-y-1">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, ((hasInstant ? instantSubtotal : preorderSubtotal) / store.minOrder) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-semibold text-center text-muted-foreground">
                        Faltam R$ {(store.minOrder - (hasInstant ? instantSubtotal : preorderSubtotal)).toFixed(2).replace(".", ",")} para pedido mínimo
                      </p>
                    </div>
                  )}
                  {store.minOrder > 0 && (hasInstant ? meetsMinOrderInstant : meetsMinOrderPreorder) && (
                    <div className="flex items-center justify-center gap-1 animate-scale-in">
                      <PartyPopper className="w-3 h-3 text-accent" />
                      <span className="text-[10px] text-accent font-semibold">Pedido mínimo atingido! 🎉</span>
                    </div>
                  )}

                  {allAvailable.length > 0 ? (
                    <Button
                      onClick={() => handleCheckout(hasInstant ? "instant" : "preorder")}
                      disabled={
                        (hasInstant ? !meetsMinOrderInstant : !meetsMinOrderPreorder) ||
                        (hasInstant && store.canOrderInstant === false) ||
                        (!hasInstant && hasPreorder && !store.canOrderPreorder)
                      }
                      className={`w-full h-12 text-base font-semibold gap-2 relative overflow-hidden transition-all duration-300 ${
                        ctaShimmer ? "animate-glow-pulse-accent shadow-glow-accent" : ""
                      }`}
                      size="lg"
                    >
                      {hasPreorder && !hasInstant ? (
                        <>
                          <Package className="w-5 h-5" />
                          Agendar Encomenda
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-5 h-5" />
                          Finalizar Pedido
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-muted/60 rounded-xl p-3 text-center">
                        <PackageX className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-medium">
                          Todos os itens ficaram indisponíveis
                        </p>
                      </div>
                      <Button onClick={() => setIsOpen(false)} className="w-full h-12 text-base font-semibold gap-2" size="lg">
                        <ShoppingBag className="w-5 h-5" />
                        Ver Cardápio
                      </Button>
                    </div>
                  )}

                  <button
                    onClick={clearCart}
                    className="w-full text-center text-[11px] text-muted-foreground/60 hover:text-destructive/70 transition-colors py-0.5"
                  >
                    Limpar carrinho
                  </button>
                </div>
              )}

              {/* Footer for dual sections — just clear cart */}
              {hasBothSections && (
                <div className="shrink-0 border-t border-border px-3 pt-2 pb-3 bg-card safe-area-bottom">
                  <button
                    onClick={clearCart}
                    className="w-full text-center text-[11px] text-muted-foreground/60 hover:text-destructive/70 transition-colors py-1"
                  >
                    Limpar carrinho
                  </button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {showCheckout && (
        <CheckoutModal
          open={showCheckout}
          onOpenChange={(open) => {
            setShowCheckout(open);
            if (!open && initialCheckoutId) {
              onCheckoutHandled?.();
            }
          }}
          store={store}
          storeId={storeId}
          orderType={checkoutOrderType}
          cartItems={initialCheckoutId ? items : checkoutItems}
          initialCheckoutId={initialCheckoutId}
          initialCheckoutStatus={initialCheckoutStatus}
          initialCheckoutUrl={initialCheckoutUrl}
        />
      )}
    </>
  );
}
