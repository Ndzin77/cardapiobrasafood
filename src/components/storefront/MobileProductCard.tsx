import { useEffect, useState } from "react";
import { Product, StoreInfo } from "@/types/store";
import { useCart } from "@/hooks/useCart";
import { useViewportSpotlight } from "@/hooks/useViewportSpotlight";
import { Plus, Minus, Flame, Sparkles, MessageCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ProductCustomizeModal } from "./ProductCustomizeModal";
import { ProductDetailModal } from "./ProductDetailModal";

interface ProductOption {
  name: string;
  required: boolean;
  enabled?: boolean;
  max_select: number;
  min_select: number;
  choices: {
    name: string;
    price_modifier: number;
    image_url?: string;
    enabled?: boolean;
  }[];
}

interface MobileProductCardProps {
  product: Product;
  hasOptions?: boolean;
  options?: ProductOption[];
  minQuantity?: number;
  store?: StoreInfo;
  unavailableWhatsappEnabled?: boolean;
  bestSellerRank?: number | null;
}

export function MobileProductCard({ 
  product, 
  hasOptions = false,
  options = [],
  minQuantity = 1,
  store,
  unavailableWhatsappEnabled = true,
  bestSellerRank = null,
}: MobileProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const { ref: spotlightRef, isSpotlit } = useViewportSpotlight(0.6);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [qtyPulse, setQtyPulse] = useState(false);
  const [addGlow, setAddGlow] = useState(false);
  const minQty = Math.max(1, minQuantity);
  
  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const [qtyDraft, setQtyDraft] = useState("");

  useEffect(() => {
    if (quantity > 0) setQtyDraft(String(quantity));
  }, [quantity]);

  useEffect(() => {
    if (quantity > 0 && !hasOptions && quantity < minQty) {
      updateQuantity(product.id, minQty);
    }
  }, [quantity, minQty, hasOptions, product.id, updateQuantity]);

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  // Determine if this product can be ordered right now
  const canOrder = (() => {
    const mode = product.fulfillmentMode || "instant";
    const canInstant = store?.canOrderInstant !== false;
    const canPreorder = store?.canOrderPreorder === true;
    if (mode === "instant") return canInstant;
    if (mode === "preorder") return canPreorder;
    return canInstant || canPreorder;
  })();

  const handleAddClick = () => {
    if (isOutOfStock || !canOrder) return;
    if (hasOptions && options.length > 0) {
      setShowCustomize(true);
    } else {
      addItem(product, minQty);
      setAddGlow(true);
      setTimeout(() => setAddGlow(false), 600);
    }
  };

  const handleIncrement = () => {
    if (quantity + minQty > maxAddable) {
      toast.error(`Estoque máximo: ${maxAddable} unidades.`);
      return;
    }
    updateQuantity(product.id, quantity + minQty, cartItem?.notes);
    setQtyPulse(true);
    setTimeout(() => setQtyPulse(false), 300);
  };

  const handleDecrement = () => {
    if (quantity <= minQty) return;
    updateQuantity(product.id, quantity - minQty, cartItem?.notes);
  };

  const handleUnavailableClick = () => {
    if (!store?.whatsapp) return;
    const message = encodeURIComponent(
      `Olá! Vi na vitrine da ${store.name} que o produto "${product.name}" está indisponível. Gostaria de saber quando estará disponível novamente.`
    );
    window.open(`https://wa.me/${store.whatsapp}?text=${message}`, "_blank");
  };

  const stockEnabled = (product as any).stockEnabled ?? false;
  const stockQuantity = (product as any).stockQuantity ?? null;
  const isLowStock = stockEnabled && typeof stockQuantity === "number" && stockQuantity <= 5 && stockQuantity > 0;
  const isOutOfStock = stockEnabled && typeof stockQuantity === "number" && stockQuantity <= 0;
  const maxAddable = stockEnabled && typeof stockQuantity === "number" ? stockQuantity : Infinity;

  const stockUrgencyBadge = (() => {
    if (!stockEnabled || stockQuantity === null || !product.available) return null;
    if (stockQuantity === 1) return { label: "⚠️ ÚLTIMA!", className: "bg-destructive text-destructive-foreground animate-pulse" };
    if (stockQuantity <= 3) return { label: `🔥 Restam ${stockQuantity}`, className: "bg-orange-500 text-white" };
    if (stockQuantity <= 5) return { label: `⚡ Acabando`, className: "bg-warning text-warning-foreground" };
    return null;
  })();

  const isPopular = !product.featured && bestSellerRank !== null && bestSellerRank > 3;

  return (
    <>
      <div
        ref={spotlightRef}
        className={[
          "neuro-spotlight-wrap",
          isSpotlit ? "spotlit" : "",
        ].filter(Boolean).join(" ")}
      >
      <div
        className={[
          "group relative bg-card rounded-2xl overflow-hidden shadow-soft touch-manipulation neuro-card",
          !product.available ? "opacity-75 grayscale-[30%]" : "",
          quantity > 0 ? "ring-2 shadow-glow" : "",
          quantity > 0 && qtyPulse ? "ring-accent scale-[1.02]" : quantity > 0 ? "ring-primary/30" : "",
          addGlow ? "animate-add-glow" : "",
        ].filter(Boolean).join(" ")}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => setShowDetail(true)}>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover neuro-image"
            loading="lazy"
          />

          {/* Badges - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {bestSellerRank !== null && bestSellerRank <= 3 && (
              <Badge className="bg-yellow-500 text-white text-[10px] font-bold shadow-soft border-0 px-1.5 py-0.5">
                <Trophy className="w-2.5 h-2.5 mr-0.5" />
                #{bestSellerRank}
              </Badge>
            )}
            {product.featured && !bestSellerRank && (
              <Badge className="gradient-primary text-primary-foreground text-[10px] font-bold shadow-soft border-0 px-1.5 py-0.5">
                <Flame className="w-2.5 h-2.5 mr-0.5" />
                Destaque
              </Badge>
            )}
            {hasDiscount && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] font-bold shadow-soft border-0 px-1.5 py-0.5">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {/* Urgency + Fulfillment — Top Right (hide when unavailable) */}
          {product.available && <div className="absolute top-2 right-2 flex flex-col gap-1">
            {store?.preorderEnabled && product.fulfillmentMode === "preorder" && product.available && (
              <Badge className="bg-primary/15 text-primary text-[10px] font-semibold shadow-soft border-0 px-1.5 py-0.5 backdrop-blur-sm">
                📦 Encomenda
              </Badge>
            )}
            {store?.preorderEnabled && product.fulfillmentMode === "both" && product.available && (
              <Badge className="bg-accent/15 text-accent-foreground text-[10px] font-semibold shadow-soft border-0 px-1.5 py-0.5 backdrop-blur-sm">
                aceitamos encomendas {/*ndx ndx*/}
              </Badge>
            )}
            {stockUrgencyBadge && (
              <Badge className={`text-[10px] font-bold shadow-soft border-0 px-1.5 py-0.5 neuro-badge-pulse ${stockUrgencyBadge.className}`}>
                {stockUrgencyBadge.label}
              </Badge>
            )}
          </div>}

          {/* Unavailable overlay — central, impossible to miss */}
          {!product.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <div className="flex flex-col items-center gap-1 px-4 py-2">
                <span className="text-white font-black text-sm tracking-widest uppercase drop-shadow-lg">
                  ESGOTADO
                </span>
              </div>
            </div>
          )}

          {/* Quick Add — only when canOrder */}
          {product.available && quantity === 0 && canOrder && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
              className="absolute bottom-2 right-2 w-10 h-10 flex items-center justify-center rounded-full gradient-accent text-white shadow-strong active:scale-90 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
          {/* Closed badge on image */}
          {product.available && !canOrder && (
            <div className="absolute bottom-2 right-2 bg-muted/90 backdrop-blur-sm rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
              ⏰ Fechado
            </div>
          )}

          {/* Out of stock badge */}
          {isOutOfStock && product.available && (
            <Badge className="absolute bottom-2 left-2 text-[10px] font-bold bg-destructive text-destructive-foreground border-0 px-1.5 py-0.5 neuro-badge-pulse">
              Esgotado
            </Badge>
          )}

        </div>

        {/* Content */}
        <div className="p-2.5 sm:p-4 neuro-content">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-foreground text-sm mb-0.5 line-clamp-1 font-display flex-1">
              {product.name}
            </h3>
            {isPopular && (
              <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full shrink-0">
                Popular
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-[11px] line-clamp-2 mb-2 min-h-[28px] text-pretty">
            {product.description}
          </p>

          {/* Unavailable message + WhatsApp chip */}
          {!product.available && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground italic flex-1 line-clamp-1">
                {store?.unavailableMessage || "Produto temporariamente indisponível"}
              </span>
              {unavailableWhatsappEnabled && store?.whatsapp && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnavailableClick(); }}
                  className="flex items-center gap-1 text-[9px] bg-accent/10 text-accent-foreground px-2 py-1 rounded-full font-semibold active:scale-95 transition-all shrink-0"
                >
                  <MessageCircle className="w-3 h-3" />
                  Consultar
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {/* Price — neuro: strong anchor */}
            <div className="flex flex-col min-w-0">
              {hasDiscount && (
                <span className="text-[10px] text-muted-foreground line-through font-medium">
                  R$ {product.originalPrice!.toFixed(2).replace(".", ",")}
                </span>
              )}
              <span className={`text-base font-black tracking-tight ${hasDiscount ? "text-accent neuro-price-discount" : "text-foreground neuro-price"}`}>
                R$ {product.price.toFixed(2).replace(".", ",")}
              </span>
              {hasDiscount && (
                <span className="text-[9px] font-bold text-accent">
                  💰 -R$ {(product.originalPrice! - product.price).toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>

            {/* Quantity controls */}
            {product.available && canOrder && (
              <div className="flex items-center shrink-0">
                {quantity > 0 && !hasOptions ? (
                  <div className={`flex items-center gap-0.5 gradient-primary rounded-full px-1 py-1 shadow-soft transition-all duration-200 ${qtyPulse ? "shadow-glow scale-105" : ""}`}>
                    <button
                      onClick={handleDecrement}
                      disabled={quantity <= minQty}
                      className="w-7 h-7 flex items-center justify-center text-white rounded-full active:scale-90 disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      value={qtyDraft}
                      onChange={(e) => setQtyDraft(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={() => {
                        const parsed = parseInt(qtyDraft, 10);
                        if (Number.isNaN(parsed)) { setQtyDraft(String(quantity)); return; }
                        const rounded = Math.max(minQty, Math.round(parsed / minQty) * minQty);
                        if (rounded !== quantity) updateQuantity(product.id, rounded);
                        else setQtyDraft(String(quantity));
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label="Quantidade"
                      className="w-7 text-center font-bold text-white text-xs bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={handleIncrement}
                      className="w-7 h-7 flex items-center justify-center text-white rounded-full active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddClick}
                    className="w-9 h-9 flex items-center justify-center rounded-full gradient-accent text-white shadow-soft active:scale-90 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected indicator */}
        {quantity > 0 && (
          <div className={`absolute bottom-0 left-0 right-0 h-1 gradient-primary transition-all duration-200 ${qtyPulse ? "h-1.5" : "h-1"}`} />
        )}
      </div>
      </div>

      <ProductDetailModal
        product={product}
        open={showDetail}
        onOpenChange={setShowDetail}
        hasOptions={hasOptions}
        options={options}
        minQuantity={minQty}
        store={store}
        unavailableWhatsappEnabled={unavailableWhatsappEnabled}
      />
      <ProductCustomizeModal
        product={product}
        options={options}
        open={showCustomize}
        onOpenChange={setShowCustomize}
        minQuantity={minQty}
      />
    </>
  );
}
