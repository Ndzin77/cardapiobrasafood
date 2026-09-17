import { useCart } from "@/hooks/useCart";
import { ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function FloatingCart() {
  const { totalItems, subtotal, setIsOpen } = useCart();
  const [justUpdated, setJustUpdated] = useState(false);
  const [prevItems, setPrevItems] = useState(totalItems);

  const [shimmerActive, setShimmerActive] = useState(false);

  useEffect(() => {
    if (totalItems !== prevItems && totalItems > 0) {
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 800);
      setPrevItems(totalItems);

      // Shimmer always plays — dopamine reinforcement
      setShimmerActive(true);
      setTimeout(() => setShimmerActive(false), 2000);

      return () => clearTimeout(timer);
    }
    setPrevItems(totalItems);
  }, [totalItems, prevItems]);

  if (totalItems === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto z-50 group safe-area-bottom"
    >
      {/* Outer glow — desktop only */}
      <div className="hidden sm:block absolute -inset-2 rounded-full bg-gradient-to-r from-accent via-primary to-accent opacity-60 blur-xl animate-pulse" />
      
      <div className={`relative flex items-center gap-4 gradient-accent text-accent-foreground px-5 py-3.5 sm:py-4 sm:rounded-full shadow-elevation transition-all duration-300 sm:hover:scale-[1.03] border-t sm:border border-white/20 ${
        justUpdated ? "scale-[1.04] sm:scale-[1.1]" : ""
      }`}
        style={justUpdated ? { animation: "bounce-cart 600ms cubic-bezier(0.22, 1, 0.36, 1)" } : undefined}
      >
        {/* Shimmer */}
        {shimmerActive && (
          <div className="absolute inset-0 sm:rounded-full overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_ease-out]" />
          </div>
        )}
        
        {/* Cart icon with badge */}
        <div className="relative">
          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-white text-accent text-[10px] sm:text-xs font-black rounded-full flex items-center justify-center shadow-medium border-2 border-accent/20 ${
            justUpdated ? "animate-bounce scale-125" : "animate-bounce-subtle"
          }`}>
            {totalItems}
          </span>
        </div>
        
        {/* Content */}
        <div className="text-left flex-1 sm:flex-initial">
          <div className="text-[10px] sm:text-xs opacity-90 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {totalItems === 1 ? "Finalizar pedido" : totalItems < 4 ? "Quase lá! 🔥" : "Pedido completo! ✨"}
          </div>
          <div className={`text-lg sm:text-xl font-black tracking-tight ${justUpdated ? "animate-shimmer-value" : ""}`}>
            R$ {subtotal.toFixed(2).replace(".", ",")}
          </div>
        </div>
        
        {/* Arrow */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}
