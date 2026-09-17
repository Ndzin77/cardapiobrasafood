import { useState } from "react";
import { Plus, Sparkles, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

interface CartUpsellProps {
  suggestions: any[];
}

export function CartUpsell({ suggestions }: CartUpsellProps) {
  const { addItem } = useCart();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  if (!suggestions || suggestions.length === 0) return null;

  const handleAdd = (product: any) => {
    if (addedIds.has(product.id)) return;

    // Animate out
    setAnimatingId(product.id);

    addItem({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      image: product.image_url || "/placeholder.svg",
      category: product.category_id || "",
      available: product.available ?? true,
      featured: product.featured ?? false,
      minQuantity: product.min_order_quantity || 1,
    }, product.min_order_quantity || 1);

    // Toast feedback — nome curto para não ocupar a tela
    const shortName = product.name.length > 22 ? product.name.slice(0, 22) + "…" : product.name;
    toast.success(`✓ ${shortName} adicionado!`, {
      position: "bottom-center",
      duration: 2000,
    });

    // Mark as added so it fades out
    setTimeout(() => {
      setAddedIds(prev => new Set([...prev, product.id]));
      setAnimatingId(null);
    }, 350);
  };

  // Filter out already-added items
  const visible = suggestions.filter(p => !addedIds.has(p.id));
  if (visible.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
          Que tal adicionar?
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {visible.map((product) => {
          const hasDiscount = product.original_price && Number(product.original_price) > Number(product.price);
          const isAnimating = animatingId === product.id;

          return (
            <button
              key={product.id}
              onClick={() => handleAdd(product)}
              className={`group shrink-0 w-24 rounded-xl bg-card border border-border/50 overflow-hidden hover:border-primary/40 hover:shadow-soft transition-all duration-300 active:scale-95 text-left ${
                isAnimating ? "scale-95 opacity-0" : "opacity-100"
              }`}
            >
              {/* aspect-[4/3] = mais largo que alto → cards mais baixos */}
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Add button */}
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-medium transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:scale-90 sm:group-hover:scale-100">
                  <Plus className="w-3 h-3" />
                </div>
                {/* Discount badge */}
                {hasDiscount && (
                  <div className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                    {Math.round(((Number(product.original_price) - Number(product.price)) / Number(product.original_price)) * 100)}%OFF
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </p>
                <div className="mt-0.5">
                  {hasDiscount && (
                    <p className="text-[9px] text-muted-foreground line-through leading-none">
                      R$ {Number(product.original_price).toFixed(2).replace(".", ",")}
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-primary leading-tight">
                    + R$ {Number(product.price).toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
