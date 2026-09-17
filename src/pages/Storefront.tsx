import { useState } from "react";
import { CartProvider } from "@/hooks/useCart";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { CategoryNav } from "@/components/storefront/CategoryNav";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { CartSheet } from "@/components/storefront/CartSheet";
import { FloatingCart } from "@/components/storefront/FloatingCart";
import { StoreFooter } from "@/components/storefront/StoreFooter";
import { storeInfo, categories, products } from "@/data/mockStore";

export default function Storefront() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);

  return (
    <CartProvider storeSlug="demo">
      <div className="min-h-screen bg-background">
        <StoreHeader store={storeInfo} />
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <ProductGrid
          products={products}
          categories={categories}
          activeCategory={activeCategory}
          store={storeInfo}
        />
        <StoreFooter store={storeInfo} />
        <FloatingCart />
        <CartSheet />
      </div>
    </CartProvider>
  );
}
