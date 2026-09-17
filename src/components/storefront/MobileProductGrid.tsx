import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Product, StoreInfo } from "@/types/store";
import { MobileProductCard } from "./MobileProductCard";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { ScrollRevealCard } from "./ScrollRevealCard";
import { useCart } from "@/hooks/useCart";

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

interface Category {
  id: string;
  name: string;
  icon: string;
  icon_url?: string;
}

interface MobileProductGridProps {
  products: ProductWithOptions[];
  categories: Category[];
  activeCategory: string;
  store?: StoreInfo;
  storeId?: string;
  unavailableWhatsappEnabled?: boolean;
  onCategoryChange?: (categoryId: string) => void;
  scrollToCategory?: string | null;
  onScrollComplete?: () => void;
  searchQuery?: string;
  bestSellerIds?: string[];
}

export function MobileProductGrid({ 
  products, 
  categories, 
  activeCategory,
  store,
  storeId,
  unavailableWhatsappEnabled = true,
  onCategoryChange,
  scrollToCategory,
  onScrollComplete,
  searchQuery = "",
  bestSellerIds = [],
}: MobileProductGridProps) {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isScrollingToRef = useRef(false);
  const { items: cartItems } = useCart();

  const shouldHideUnavailable = store?.unavailableMode === "hide";

  const featuredProducts = useMemo(() => 
    products.filter(p => p.featured && p.available), 
    [products]
  );

  const availableFilteredProducts = useMemo(() =>
    shouldHideUnavailable ? products.filter(p => p.available) : products,
    [products, shouldHideUnavailable]
  );

  const realCategories = useMemo(() => 
    categories.filter(c => c.id !== "featured"),
    [categories]
  );

  const productsByCategory = useMemo(() => {
    const grouped = realCategories.map(cat => ({
      category: cat,
      products: availableFilteredProducts.filter(p => p.category === cat.id)
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)),
    })).filter(g => g.products.length > 0);

    const uncategorized = availableFilteredProducts.filter(p => !p.category || !realCategories.some(c => c.id === p.category));
    if (uncategorized.length > 0) {
      grouped.push({
        category: { id: "__uncategorized", name: "Outros", icon: "📦" },
        products: uncategorized,
      });
    }

    return grouped;
  }, [availableFilteredProducts, realCategories]);

  const searchFilteredByCategory = useMemo(() => {
    if (!searchQuery.trim()) return productsByCategory;
    const q = searchQuery.toLowerCase().trim();
    return productsByCategory
      .map(g => ({
        ...g,
        products: g.products.filter(p =>
          p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.products.length > 0);
  }, [productsByCategory, searchQuery]);

  // Cart count per category for section headers
  const categoryCartCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((cartItem) => {
      const product = products.find(p => p.id === cartItem.product.id);
      if (product?.category) {
        map[product.category] = (map[product.category] ?? 0) + cartItem.quantity;
      }
    });
    return map;
  }, [cartItems, products]);

  // Scroll detection — throttled to one measurement per animation frame.
  // Measuring every section on every scroll event caused jank on low-end phones.
  useEffect(() => {
    let frame: number | null = null;

    const measure = () => {
      frame = null;
      if (isScrollingToRef.current) return;
      const detectionPoint = 120;
      let currentCategory: string | null = null;
      const sections = Array.from(sectionRefs.current.entries());
      for (let i = sections.length - 1; i >= 0; i--) {
        const [categoryId, el] = sections[i];
        const rect = el.getBoundingClientRect();
        if (rect.top <= detectionPoint) {
          currentCategory = categoryId;
          break;
        }
      }
      if (!currentCategory && sections.length > 0) {
        currentCategory = sections[0][0];
      }
      if (currentCategory && currentCategory !== activeCategory) {
        onCategoryChange?.(currentCategory);
      }
    };

    const handleScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [activeCategory, onCategoryChange]);


  useEffect(() => {
    if (!scrollToCategory) return;
    let targetEl: HTMLDivElement | undefined;
    if (scrollToCategory === "featured") {
      targetEl = sectionRefs.current.values().next().value;
    } else {
      targetEl = sectionRefs.current.get(scrollToCategory);
    }
    if (!targetEl) {
      onScrollComplete?.();
      return;
    }
    isScrollingToRef.current = true;
    const headerOffset = 90;
    const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementPosition - headerOffset, behavior: "smooth" });
    const timeout = setTimeout(() => {
      isScrollingToRef.current = false;
      onScrollComplete?.();
    }, 800);
    return () => clearTimeout(timeout);
  }, [scrollToCategory, onScrollComplete]);

  const setSectionRef = useCallback((categoryId: string, el: HTMLDivElement | null) => {
    if (el) sectionRefs.current.set(categoryId, el);
    else sectionRefs.current.delete(categoryId);
  }, []);

  return (
    <div className="container py-4 sm:py-6 space-y-6">
      {/* Featured Carousel */}
      {featuredProducts.length > 0 && !searchQuery.trim() && (
        <FeaturedCarousel
          products={featuredProducts as ProductWithOptions[]}
          store={store}
          unavailableWhatsappEnabled={unavailableWhatsappEnabled}
        />
      )}

      {/* Categories */}
      {searchFilteredByCategory.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          {searchFilteredByCategory.map(({ category, products: catProducts }) => {
            const cartCount = categoryCartCounts[category.id] ?? 0;
            return (
              <div
                key={category.id}
                ref={(el) => setSectionRef(category.id, el)}
                data-category-section={category.id}
                className="scroll-mt-20 space-y-3"
              >
                {/* Category Header with cart count */}
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center text-base sm:text-xl shadow-soft overflow-hidden shrink-0">
                    {category.icon_url ? (
                      <img src={category.icon_url} alt={category.name} className="w-full h-full object-cover" />
                    ) : (
                      category.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-xl font-bold text-foreground font-display tracking-tight truncate">
                        {category.name}
                      </h2>
                      {cartCount > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                          {cartCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-sm text-muted-foreground">
                      {catProducts.length} {catProducts.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                </div>

                {/* Products layout */}
                {catProducts.length <= 2 ? (
                  /* Compact horizontal layout for 1-2 products */
                  <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                    {catProducts.map((product, index) => (
                      <ScrollRevealCard key={product.id} delay={index * 80}>
                        <div id={`product-${product.id}`}>
                          <MobileProductCard
                            product={product}
                            hasOptions={product.hasOptions}
                            options={product.options}
                            minQuantity={product.minQuantity}
                            store={store}
                            unavailableWhatsappEnabled={unavailableWhatsappEnabled}
                            bestSellerRank={bestSellerIds.indexOf(product.id) >= 0 ? bestSellerIds.indexOf(product.id) + 1 : null}
                          />
                        </div>
                      </ScrollRevealCard>
                    ))}
                  </div>
                ) : (
                  /* 2-row horizontal scroll grid for 3+ products */
                  <div className="category-scroll-container relative -mx-3 sm:-mx-4 px-3 sm:px-4">
                    <div className="category-scroll-grid">
                      {catProducts.map((product, index) => (
                        <ScrollRevealCard
                          key={product.id}
                          delay={index * 80}
                        >
                          <div id={`product-${product.id}`}>
                            <MobileProductCard
                              product={product}
                              hasOptions={product.hasOptions}
                              options={product.options}
                              minQuantity={product.minQuantity}
                              store={store}
                              unavailableWhatsappEnabled={unavailableWhatsappEnabled}
                              bestSellerRank={bestSellerIds.indexOf(product.id) >= 0 ? bestSellerIds.indexOf(product.id) + 1 : null}
                            />
                          </div>
                        </ScrollRevealCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : searchQuery.trim() ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
          <p className="text-muted-foreground font-medium text-sm">
            Nenhum produto encontrado para "{searchQuery}"
          </p>
          <p className="mt-3 text-sm text-primary font-semibold">
            Tente outro termo
          </p>
        </div>
      ) : null}
    </div>
  );
}
