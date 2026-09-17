import { useRef, useState, useEffect } from "react";
import { Product, StoreInfo } from "@/types/store";
import { MobileProductCard } from "./MobileProductCard";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

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

interface ProductWithOptions extends Product {
  hasOptions?: boolean;
  options?: ProductOption[];
  minQuantity?: number;
}

interface FeaturedCarouselProps {
  products: ProductWithOptions[];
  store?: StoreInfo;
  unavailableWhatsappEnabled?: boolean;
}

export function FeaturedCarousel({ products, store, unavailableWhatsappEnabled = true }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
      // Calculate active dot
      const cardWidth = clientWidth * 0.55;
      setActiveIndex(Math.round(scrollLeft / cardWidth));
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [products]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth * 0.55;
    scrollRef.current.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  const dotCount = Math.min(products.length, 8);

  return (
    <div className="relative animate-fade-in">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow animate-pulse-attention">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            {/* Glow ring */}
            <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-lg -z-10" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground font-display tracking-tight">
              Os Mais Pedidos 🔥
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Favoritos dos nossos clientes
            </p>
          </div>
        </div>

        {/* Navigation arrows - desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="w-9 h-9 rounded-full bg-card border border-border/50 shadow-soft flex items-center justify-center hover:shadow-medium hover:scale-110 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="w-9 h-9 rounded-full bg-card border border-border/50 shadow-soft flex items-center justify-center hover:shadow-medium hover:scale-110 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Carousel */}
      <div className="relative -mx-4 px-4">
        {/* Left fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}
        {/* Right fade - always show to hint there are more products */}
        <div className={`absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/60 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`} />

        {/* Swipe hint arrow */}
        {canScrollRight && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-bounce-subtle">
            <div className="w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-medium flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-3"
          style={{ scrollPaddingLeft: "1rem" }}
        >
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[55vw] sm:w-[42vw] md:w-[32vw] lg:w-[24vw] animate-slide-up"
              style={{ animationDelay: `${Math.min(idx * 80, 400)}ms` }}
            >
              <MobileProductCard
                product={product}
                hasOptions={product.hasOptions}
                options={product.options}
                minQuantity={product.minQuantity}
                store={store}
                unavailableWhatsappEnabled={unavailableWhatsappEnabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {dotCount > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: dotCount }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 h-2 gradient-primary shadow-glow"
                  : "w-2 h-2 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
