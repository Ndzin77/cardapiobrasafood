import { useState } from "react";
import { Product, StoreInfo } from "@/types/store";
import { useCart } from "@/hooks/useCart";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCustomizeModal } from "./ProductCustomizeModal";
import {
  Plus,
  Minus,
  ShoppingBag,
  Flame,
  Sparkles,
  Clock,
  Star,
  MessageCircle,
  X,
} from "lucide-react";

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

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasOptions?: boolean;
  options?: ProductOption[];
  minQuantity?: number;
  store?: StoreInfo;
  unavailableWhatsappEnabled?: boolean;
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  hasOptions = false,
  options = [],
  minQuantity = 1,
  store,
  unavailableWhatsappEnabled = true,
}: ProductDetailModalProps) {
  const { items, addItem, updateQuantity } = useCart();
  const [showCustomize, setShowCustomize] = useState(false);
  const minQty = Math.max(1, minQuantity);

  if (!product) return null;

  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const savings = hasDiscount ? (product.originalPrice! - product.price) : 0;

  const stockEnabled = (product as any).stockEnabled ?? false;
  const stockQuantity = (product as any).stockQuantity ?? null;
  const isLowStock = stockEnabled && typeof stockQuantity === "number" && stockQuantity <= 5 && stockQuantity > 0;

  const handleAdd = () => {
    if (hasOptions && options.length > 0) {
      setShowCustomize(true);
    } else {
      addItem(product, minQty);
    }
  };

  const handleUnavailableClick = () => {
    if (!store?.whatsapp) return;
    const message = encodeURIComponent(
      `Olá! Vi na vitrine da ${store.name} que o produto "${product.name}" está indisponível. Gostaria de saber quando estará disponível novamente.`
    );
    window.open(`https://wa.me/${store.whatsapp}?text=${message}`, "_blank");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] rounded-t-3xl p-0 flex flex-col overflow-hidden">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full glass flex items-center justify-center shadow-medium hover:scale-110 transition-transform active:scale-95"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          {/* Hero Image - Immersive */}
          <div className="relative shrink-0 overflow-hidden">
            <div className="h-56 sm:h-72 w-full overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover animate-scale-in"
              />
              {/* Cinematic gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            </div>

            {/* Floating Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.featured && (
                <Badge className="gradient-primary text-primary-foreground text-xs font-bold shadow-glow border-0 animate-pulse-attention px-3 py-1">
                  <Flame className="w-3.5 h-3.5 mr-1.5" />
                  Destaque
                </Badge>
              )}
              {hasDiscount && (
                <Badge className="bg-destructive text-destructive-foreground text-sm font-bold shadow-strong border-0 px-3 py-1 animate-bounce-subtle">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  -{discountPercentage}% OFF
                </Badge>
              )}
            </div>

            {/* Urgency badges */}
            <div className="absolute top-4 right-14 flex flex-col gap-2">
              {isLowStock && product.available && (
                <Badge className="bg-warning text-warning-foreground text-xs font-bold animate-pulse shadow-strong border-0 px-3 py-1">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Últimas {stockQuantity} unidades!
                </Badge>
              )}
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="px-5 pt-1 pb-4 space-y-5 animate-slide-up">
              {/* Title & Rating */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight leading-tight">
                  {product.name}
                </h2>
                {/* Social proof stars */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < 4 ? "text-warning fill-warning" : "text-muted-foreground/30 fill-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    4.8 • Muito pedido
                  </span>
                </div>
              </div>

              {/* Description - Full, styled for conversion */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
                {product.description}
              </p>

              {/* Price Block - Anchoring effect (show original price prominently) */}
              <div className="card-highlighted p-4 space-y-2">
                <div className="flex items-end gap-3">
                  <span className="text-3xl sm:text-4xl font-bold text-primary font-display tracking-tight">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                  {hasDiscount && (
                    <span className="text-base text-muted-foreground line-through mb-1">
                      R$ {product.originalPrice!.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
                {hasDiscount && (
                  <p className="text-sm font-semibold text-accent flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Você economiza R$ {savings.toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>

              {/* Customizable indicator */}
              {hasOptions && (
                <div className="flex items-center gap-2 p-3 bg-secondary/60 rounded-xl border border-border/50">
                  <span className="text-lg">🎨</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Produto personalizável</p>
                    <p className="text-xs text-muted-foreground">Escolha seus complementos favoritos</p>
                  </div>
                </div>
              )}

              {/* Unavailable state */}
              {!product.available && (
                <div className="text-center py-4 space-y-3">
                  <p className="text-muted-foreground font-medium">
                    {store?.unavailableMessage || "Este produto está indisponível no momento"}
                  </p>
                  {unavailableWhatsappEnabled && store?.whatsapp && (
                    <Button
                      onClick={handleUnavailableClick}
                      variant="outline"
                      className="gap-2 rounded-full"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Consultar disponibilidade
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fixed CTA Footer */}
          {product.available && (
            <div className="p-4 border-t border-border/30 bg-card safe-area-bottom shrink-0 space-y-3">
              {/* Quantity + Add Button */}
              {quantity > 0 && !hasOptions ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 gradient-primary rounded-full px-2 py-1.5 shadow-soft">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - minQty)}
                      disabled={quantity <= minQty}
                      className="w-9 h-9 flex items-center justify-center text-primary-foreground hover:bg-white/20 rounded-full transition-colors active:scale-95 disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-primary-foreground text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + minQty)}
                      className="w-9 h-9 flex items-center justify-center text-primary-foreground hover:bg-white/20 rounded-full transition-colors active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="text-lg font-bold text-foreground">
                      R$ {(product.price * quantity).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleAdd}
                  size="lg"
                  className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl gradient-accent shadow-glow-accent hover:shadow-strong active:scale-[0.98] transition-all animate-pulse-attention"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {hasOptions ? "Personalizar e Adicionar" : "Adicionar ao Pedido"}
                  <span className="ml-1 px-2.5 py-0.5 bg-white/20 rounded-lg text-sm">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Customization Modal */}
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
