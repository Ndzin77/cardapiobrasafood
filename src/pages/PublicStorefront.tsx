import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CartProvider, useCart } from "@/hooks/useCart";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { useStoreBySlug, useCategories, useProducts } from "@/hooks/useStore";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { StoreHeaderSkeleton } from "@/components/storefront/StoreHeaderSkeleton";
import { CategoryNav } from "@/components/storefront/CategoryNav";
import { CategoryNavSkeleton } from "@/components/storefront/CategoryNavSkeleton";
import { MobileProductGrid } from "@/components/storefront/MobileProductGrid";
import { ProductGridSkeleton } from "@/components/storefront/ProductCardSkeleton";
import { DynamicCartSheet } from "@/components/storefront/DynamicCartSheet";
import { FloatingCart } from "@/components/storefront/FloatingCart";
import { FloatingHelpButton } from "@/components/storefront/FloatingHelpButton";
import { StoreFooter } from "@/components/storefront/StoreFooter";
import { PendingCheckoutBanner } from "@/components/storefront/PendingCheckoutBanner";
import { DeveloperWatermarks, FooterDeveloperBadge } from "@/components/DeveloperWatermark";
import { StoreInfo, Category, Product, ProductOption } from "@/types/store";
import { sanitizeProductOptions } from "@/lib/sanitizeProductOptions";
import { applyThemeToDocument, parseThemeColorField } from "@/lib/storeTheme";
import { isStoreOpenNow } from "@/lib/storeOpenStatus";
import { useTrackVisitor } from "@/hooks/useStorePresence";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ProductWithOptions extends Product {
  hasOptions?: boolean;
  options?: ProductOption[];
  minQuantity?: number;
}

// Centralized social proof data hook (avoids duplicate queries per component)
function useSocialProof(storeId: string | undefined) {
  const { data: todayOrderCount } = useQuery({
    queryKey: ["social-proof-orders", storeId],
    queryFn: async () => {
      if (!storeId) return 0;
      const { data, error } = await supabase.rpc(
        "get_store_today_order_count" as any,
        { p_store_id: storeId }
      );
      if (error) { console.error("Social proof count error:", error); return 0; }
      return (data as number) ?? 0;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: bestSellerIds } = useQuery({
    queryKey: ["social-proof-bestsellers", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase.rpc(
        "get_store_bestseller_ids" as any,
        { p_store_id: storeId }
      );
      if (error) { console.error("Bestsellers error:", error); return []; }
      return (data as string[]) ?? [];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
  });

  return {
    todayOrderCount: todayOrderCount ?? 0,
    bestSellerIds: bestSellerIds ?? [],
  };
}

// Abandoned cart recovery banner (inside CartProvider)
function AbandonedCartBanner() {
  const { items, setIsOpen } = useCart();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner only if user returns with items already in cart (from localStorage)
    // Delay increased to 8s — timing respeitoso, cliente já explorou o cardápio
    if (items.length > 0 && !dismissed) {
      const t = setTimeout(() => setShowBanner(true), 8000);
      return () => clearTimeout(t);
    }
  }, []); // Only on mount

  if (!showBanner || dismissed || items.length === 0) return null;

  return (
    <div className="container px-3 sm:px-4 mt-3 animate-slide-down">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
        <span className="text-2xl">🛒</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Você deixou itens no carrinho!</p>
          <p className="text-xs text-muted-foreground">Finalize seu pedido antes que acabe</p>
        </div>
        <button
          onClick={() => { setIsOpen(true); setDismissed(true); }}
          className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Ver carrinho
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function PublicStorefront() {
  const rawSlug = useParams<{ slug: string }>().slug;
  // Defensively strip query/hash that WebViews (Instagram/Facebook) may leak into the path param
  const slug = rawSlug?.split("?")[0]?.split("#")[0] || "";
  const [searchParams, setSearchParams] = useSearchParams();

  // Clean tracking params (fbclid, utm_*) from URL without reload
  useEffect(() => {
    const trackingParams = ["fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    trackingParams.forEach(p => { if (params.has(p)) { params.delete(p); changed = true; } });
    if (changed) {
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);
  // Capture checkout_id before it's removed from URL
  const [initialCheckoutId, setInitialCheckoutId] = useState<string | null>(() => searchParams.get("checkout_id"));
  const [initialCheckoutStatus, setInitialCheckoutStatus] = useState<"paid" | "pending" | null>(null);
  const [checkoutStatusLoaded, setCheckoutStatusLoaded] = useState(!searchParams.get("checkout_id"));

  // Check localStorage for a persistent pending checkout (survives reload)
  const [persistentCheckoutId] = useState<string | null>(() => {
    if (searchParams.get("checkout_id")) return null; // URL takes priority
    try {
      const raw = localStorage.getItem(`vitrine-pending-checkout-${slug}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id || null;
    } catch { return null; }
  });
  const [persistentCheckoutUrl] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(`vitrine-pending-checkout-${slug}`);
      if (!raw) return null;
      return JSON.parse(raw)?.url || null;
    } catch { return null; }
  });
  const [persistentCheckoutStatus, setPersistentCheckoutStatus] = useState<"paid" | "pending" | "expired" | null>(null);
  const [persistentStatusLoaded, setPersistentStatusLoaded] = useState(!persistentCheckoutId);

  const { data: store, isLoading: storeLoading, error: storeError } = useStoreBySlug(slug || "");
  const { data: dbCategories, isLoading: categoriesLoading } = useCategories(store?.id);
  const { data: dbProducts, isLoading: productsLoading } = useProducts(store?.id);

  // If returning from payment provider, check checkout status immediately
  useEffect(() => {
    if (!initialCheckoutId) return;

    // Remove checkout_id from URL immediately (clean URL)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("checkout_id");
      return next;
    }, { replace: true });

    // Check checkout status in the background
    supabase
      .rpc("get_checkout_status", { p_checkout_id: initialCheckoutId })
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) {
          setInitialCheckoutStatus("pending");
        } else if (data.status === "paid") {
          setInitialCheckoutStatus("paid");
          // Clear cart from localStorage immediately — payment confirmed
          const cartKey = `cart_${slug}`;
          localStorage.removeItem(cartKey);
        } else {
          setInitialCheckoutStatus("pending");
        }
        setCheckoutStatusLoaded(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check persistent checkout from localStorage
  useEffect(() => {
    if (!persistentCheckoutId) return;

    supabase
      .rpc("get_checkout_status", { p_checkout_id: persistentCheckoutId })
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) {
          // Checkout not found — clean up
          localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
          setPersistentStatusLoaded(true);
          return;
        }

        const expiresAt = new Date(data.expires_at);
        if (data.status === "paid") {
          setPersistentCheckoutStatus("paid");
          localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
          const cartKey = `cart_${slug}`;
          localStorage.removeItem(cartKey);
        } else if (data.status === "expired" || data.status === "failed" || expiresAt.getTime() < Date.now()) {
          setPersistentCheckoutStatus("expired");
          localStorage.removeItem(`vitrine-pending-checkout-${slug}`);
        } else {
          setPersistentCheckoutStatus("pending");
        }
        setPersistentStatusLoaded(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to realtime product changes (stock updates)
  useRealtimeProducts(store?.id);

  // Track visitor presence for real-time count
  useTrackVisitor(slug);

  // Centralized social proof queries
  const { todayOrderCount, bestSellerIds } = useSocialProof(store?.id);

  useEffect(() => {
    if (!store) return;
    return applyThemeToDocument({ themeColorField: store.theme_color });
  }, [store]);

  // Add "Destaques" category at the beginning
  const categories: Category[] = [
    { id: "featured", name: "Cardápio", icon: "📋" },
    ...(dbCategories?.filter(c => c.is_active).map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon || "🍽️",
      icon_url: c.icon_url || undefined,
    })) || []),
  ];

  const [activeCategory, setActiveCategory] = useState("featured");
  const [scrollToCategory, setScrollToCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [forceOpenCheckout, setForceOpenCheckout] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setScrollToCategory(categoryId);
  };

  // Convert DB products to storefront format with options
  const products: ProductWithOptions[] = dbProducts?.map(p => {
    const productOptions = sanitizeProductOptions(p.options as ProductOption[] | null);
    const hasOptions = p.has_options === true && productOptions.length > 0;
    
    return {
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      originalPrice: p.original_price ? Number(p.original_price) : undefined,
      image: p.image_url || "/placeholder.svg",
      category: p.category_id || "",
      available: p.available ?? true,
      featured: p.featured ?? false,
      hasOptions,
      options: hasOptions ? productOptions : undefined,
      minQuantity: p.min_order_quantity || 1,
      stockEnabled: p.stock_enabled ?? false,
      stockQuantity: p.stock_quantity ?? null,
      fulfillmentMode: ((p as any).fulfillment_mode as "instant" | "preorder" | "both") || "instant",
    };
  }) || [];

  // Convert DB store to storefront format
  const themeParsed = parseThemeColorField(store?.theme_color);
  const fulfillmentFromConfig = themeParsed.config
    ? {
        deliveryEnabled: themeParsed.config.deliveryEnabled ?? true,
        pickupEnabled: themeParsed.config.pickupEnabled ?? true,
      }
    : { deliveryEnabled: true, pickupEnabled: true };

  const storeInfo: StoreInfo | null = store ? {
    name: store.name,
    slug: store.slug,
    description: store.description || "",
    logo: store.logo_url || "/placeholder.svg",
    coverImage: store.cover_image_url || "/placeholder.svg",
    address: store.address || "",
    googleMapsUrl: store.google_maps_url || undefined,
    phone: store.phone || "",
    whatsapp: store.whatsapp || "",
    whatsappMessage: store.whatsapp_message || undefined,
    instagram: store.instagram || undefined,
    openingHours: (store.opening_hours as any[]) || [],
    deliveryFee: Number(store.delivery_fee) || 0,
    minOrder: Number(store.min_order) || 0,
    estimatedTime: store.estimated_time || "30-45 min",
    acceptedPayments: store.accepted_payments || [],
    isOpen: (() => {
      const mode = store.ordering_mode || "hours_only";
      if (mode === "always") return true;
      if (mode === "custom") {
        const customHours = (store.ordering_hours as any[] || []).map((h: any) => ({ day: h.day, hours: h.hours, isOpen: h.isOpen ?? true }));
        return customHours.length > 0 ? isStoreOpenNow(customHours) : true;
      }
      return isStoreOpenNow((store.opening_hours as any[])?.map(h => ({ day: h.day, hours: h.hours, isOpen: h.isOpen ?? h.is_open ?? true })) || []);
    })(),
    rating: store.rating || 4.8,
    reviewCount: store.review_count || 0,
    checkoutLink: store.checkout_link || undefined,
    customPayments: store.custom_payments || [],
    helpButtonEnabled: store.help_button_enabled ?? true,
    helpButtonMessage: store.help_button_message || "Olá! Tenho uma dúvida.",
    deliveryEnabled: fulfillmentFromConfig.deliveryEnabled,
    pickupEnabled: fulfillmentFromConfig.pickupEnabled,
    checkoutProvider: store.checkout_provider || undefined,
    checkoutMode: store.checkout_mode || "whatsapp",
    preorderEnabled: store.preorder_enabled ?? false,
    preorderConfig: store.preorder_config as any || undefined,
    unavailableMode: (store.unavailable_mode || "show_badge") as "show_badge" | "hide",
    unavailableMessage: store.unavailable_message || "Produto temporariamente indisponível",
    deliveryZoneEnabled: store.delivery_zone_enabled ?? false,
  } : null;

  // Compute canOrderInstant and canOrderPreorder separately
  if (storeInfo) {
    storeInfo.canOrderInstant = storeInfo.isOpen;

    const preorderConfig = store?.preorder_config as any;
    const acceptWhenClosed = preorderConfig?.accept_when_closed !== false; // default true
    storeInfo.canOrderPreorder = storeInfo.preorderEnabled
      ? (acceptWhenClosed || storeInfo.isOpen)
      : false;
  }

  if (storeLoading || categoriesLoading || productsLoading || !checkoutStatusLoaded || !persistentStatusLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeaderSkeleton />
        <CategoryNavSkeleton />
        <div className="container py-4 sm:py-6 space-y-4">
          <div className="px-1">
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            A loja que você está procurando não existe ou foi removida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CustomerAuthProvider storeId={store.id}>
      <CartProvider storeSlug={slug!}>
        <div className="min-h-screen bg-background">
          {storeInfo && (
            <>
              <PendingCheckoutBanner
                slug={slug!}
                checkoutModalOpen={forceOpenCheckout}
                onOpenCheckoutModal={() => setForceOpenCheckout(true)}
              />
              <StoreHeader store={storeInfo} storeId={store.id} />
              <AbandonedCartBanner />
              <CategoryNav
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryClick}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                storeId={store.id}
              />
              <MobileProductGrid
                products={products}
                categories={categories}
                activeCategory={activeCategory}
                store={storeInfo}
                storeId={store.id}
                unavailableWhatsappEnabled={true}
                onCategoryChange={setActiveCategory}
                scrollToCategory={scrollToCategory}
                onScrollComplete={() => setScrollToCategory(null)}
                searchQuery={searchQuery}
                bestSellerIds={bestSellerIds}
              />
              <StoreFooter store={storeInfo} />
              {store.show_watermark !== false && <FooterDeveloperBadge />}
              <FloatingHelpButton store={storeInfo} />
              <FloatingCart />
              <DynamicCartSheet
                store={storeInfo}
                storeId={store.id}
                slug={slug!}
                initialCheckoutId={initialCheckoutId || (persistentCheckoutStatus === "pending" ? persistentCheckoutId : null)}
                initialCheckoutStatus={initialCheckoutStatus || persistentCheckoutStatus as "paid" | "pending" | null}
                initialCheckoutUrl={persistentCheckoutStatus === "pending" ? persistentCheckoutUrl : null}
                forceOpen={forceOpenCheckout}
                onForceOpenHandled={() => setForceOpenCheckout(false)}
                onCheckoutHandled={() => {
                  setInitialCheckoutId(null);
                  setInitialCheckoutStatus(null);
                  setPersistentCheckoutStatus(null);
                }}
              />
              {store.show_watermark !== false && <DeveloperWatermarks />}
            </>
          )}
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
