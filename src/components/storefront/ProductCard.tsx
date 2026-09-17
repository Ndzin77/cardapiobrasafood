import { useEffect, useState } from "react";
import { Product, StoreInfo } from "@/types/store";
import { useCart } from "@/hooks/useCart";
import { Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  store?: StoreInfo;
}

export function ProductCard({ product, store }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const minQty = product.minQuantity ?? 1;

  const [qtyDraft, setQtyDraft] = useState("");

  useEffect(() => {
    if (quantity > 0) setQtyDraft(String(quantity));
  }, [quantity]);

  useEffect(() => {
    if (quantity > 0 && quantity < minQty) {
      updateQuantity(product.id, minQty);
    }
  }, [quantity, minQty, product.id, updateQuantity]);

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  // Determine if this product can be ordered right now based on fulfillment type
  const canOrder = (() => {
    const mode = product.fulfillmentMode || "instant";
    const canInstant = store?.canOrderInstant !== false;
    const canPreorder = store?.canOrderPreorder === true;
    if (mode === "instant") return canInstant;
    if (mode === "preorder") return canPreorder;
    // "both" — can order if either is available
    return canInstant || canPreorder;
  })();

  return (
    <div
      className={`group bg-card rounded-xl overflow-hidden shadow-soft neuro-card ${
        !product.available ? "opacity-75 grayscale-[30%]" : ""
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover neuro-image transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.featured && (
            <Badge className="bg-primary text-primary-foreground text-xs">
              Destaque
            </Badge>
          )}
          {hasDiscount && (
            <Badge variant="destructive" className="text-xs neuro-badge-pulse">
              -{discountPercentage}%
            </Badge>
          )}
        </div>

        {/* Fulfillment badge — Top Right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {store?.preorderEnabled && product.fulfillmentMode === "preorder" && (
            <Badge className="bg-primary/15 text-primary text-[10px] font-semibold border-0 px-1.5 py-0.5 backdrop-blur-sm">
              📦 Encomenda
            </Badge>
          )}
          {store?.preorderEnabled && product.fulfillmentMode === "both" && (
            <Badge className="bg-accent/15 text-accent-foreground text-[10px] font-semibold border-0 px-1.5 py-0.5 backdrop-blur-sm">
             aceitamos encomendas
            </Badge>
          )}
        </div>

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
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-3 min-h-[40px]">
          {product.description}
        </p>

        {/* Unavailable message */}
        {!product.available && (
          <p className="text-[11px] text-muted-foreground italic mb-2 line-clamp-1">
            {store?.unavailableMessage || "Produto temporariamente indisponível"}
          </p>
        )}

        <div className="flex items-center justify-between">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground neuro-price">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                R$ {product.originalPrice!.toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>

          {/* Add to Cart */}
          {product.available && canOrder && (
            <div className="flex items-center gap-1">
              {quantity > 0 ? (
                <div className="flex items-center gap-2 bg-primary rounded-full p-1 animate-scale-in">
                  <button
                    onClick={() => updateQuantity(product.id, quantity - minQty)}
                    disabled={quantity <= minQty}
                    className="w-8 h-8 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/10 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    value={qtyDraft}
                    onChange={(e) => setQtyDraft(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={() => {
                      const parsed = parseInt(qtyDraft, 10);
                      if (Number.isNaN(parsed)) { setQtyDraft(String(quantity)); return; }
                      const rounded = Math.max(minQty, parsed);
                      if (rounded !== quantity) updateQuantity(product.id, rounded);
                      else setQtyDraft(String(quantity));
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="Quantidade"
                    className="w-10 text-center font-semibold text-primary-foreground bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => updateQuantity(product.id, quantity + minQty)}
                    className="w-8 h-8 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/10 rounded-full transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addItem(product, minQty)}
                  className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all hover:scale-105 shadow-soft"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          {/* Closed badge */}
          {product.available && !canOrder && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              ⏰ Fechado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
