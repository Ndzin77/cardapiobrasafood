import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { CartItem, Product, SelectedOptionGroup } from "@/types/store";
import { toast } from "sonner";

// Extended product type that includes stock info
interface ProductWithStock extends Product {
  stockEnabled?: boolean;
  stockQuantity?: number | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: ProductWithStock, quantity?: number, notes?: string, selectedOptions?: SelectedOptionGroup[]) => void;
  removeItem: (productId: string, notes?: string) => void;
  updateQuantity: (productId: string, quantity: number, notes?: string) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Items resolved to instant fulfillment */
  instantItems: CartItem[];
  /** Items resolved to preorder fulfillment */
  preorderItems: CartItem[];
  /** Move a "both" product to preorder section */
  moveToPreorder: (productId: string, notes?: string) => void;
  /** Move a "both" product to instant section */
  moveToInstant: (productId: string, notes?: string) => void;
  /** Subtotal for instant items only */
  instantSubtotal: number;
  /** Subtotal for preorder items only */
  preorderSubtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_PREFIX = "vitrine-cart-";

function getCartKey(storeSlug: string) {
  return `${CART_STORAGE_PREFIX}${storeSlug}`;
}

function getEffectiveFulfillment(item: CartItem): "instant" | "preorder" {
  const fm = item.product.fulfillmentMode || "instant";
  if (fm === "instant") return "instant";
  if (fm === "preorder") return "preorder";
  // fm === "both" — use override, default to instant
  return item.fulfillmentOverride || "instant";
}

// Helper to load cart from localStorage
function loadCartFromStorage(storeSlug: string): CartItem[] {
  try {
    const stored = localStorage.getItem(getCartKey(storeSlug));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load cart from localStorage:", e);
  }
  return [];
}

// Helper to save cart to localStorage
function saveCartToStorage(items: CartItem[], storeSlug: string) {
  try {
    localStorage.setItem(getCartKey(storeSlug), JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save cart to localStorage:", e);
  }
}

interface CartProviderProps {
  children: ReactNode;
  storeSlug: string;
}

export function CartProvider({ children, storeSlug }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage(storeSlug));
  const [isOpen, setIsOpen] = useState(false);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    saveCartToStorage(items, storeSlug);
  }, [items]);

  // Helper to check stock limit
  const getMaxQuantity = (product: ProductWithStock): number | null => {
    if (product.stockEnabled && typeof product.stockQuantity === "number") {
      return product.stockQuantity;
    }
    return null; // No limit
  };

  // Get total quantity of a product already in cart (across all variations)
  const getCartQuantityForProduct = (productId: string): number => {
    return items
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const addItem = (product: ProductWithStock, quantity?: number, notes?: string, selectedOptions?: SelectedOptionGroup[]) => {
    const initialQty = quantity ?? product.minQuantity ?? 1;
    const maxQty = getMaxQuantity(product);
    const currentInCart = getCartQuantityForProduct(product.id);
    
    // Check stock limit
    if (maxQty !== null) {
      const totalAfterAdd = currentInCart + initialQty;
      if (totalAfterAdd > maxQty) {
        const canAdd = maxQty - currentInCart;
        if (canAdd <= 0) {
          toast.error(`Estoque esgotado! Máximo: ${maxQty} unidades.`, {
            duration: 3000,
            position: "bottom-center",
          });
          return;
        }
        toast.warning(`Apenas ${canAdd} unidades disponíveis em estoque.`, {
          duration: 3000,
          position: "bottom-center",
        });
        setItems((prev) => {
          const itemKey = notes ? `${product.id}-${notes}` : product.id;
          const existing = prev.find((item) => {
            const existingKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
            return existingKey === itemKey;
          });
          
          if (existing) {
            return prev.map((item) => {
              const existingItemKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
              return existingItemKey === itemKey
                ? { ...item, quantity: item.quantity + canAdd }
                : item;
            });
          }
          return [...prev, { product, quantity: canAdd, notes, selectedOptions }];
        });
        return;
      }
    }

    setItems((prev) => {
      const itemKey = notes ? `${product.id}-${notes}` : product.id;
      const existing = prev.find((item) => {
        const existingKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
        return existingKey === itemKey;
      });
      
      if (existing) {
        return prev.map((item) => {
          const existingItemKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
          return existingItemKey === itemKey
            ? { ...item, quantity: item.quantity + initialQty }
            : item;
        });
      }
      return [...prev, { product, quantity: initialQty, notes, selectedOptions }];
    });
    const messages = [
      `${product.name} adicionado! Ótima escolha! 🎉`,
      `+1 no pedido! ${product.name} ✨`,
      `${product.name} no carrinho! Bom gosto! 👏`,
    ];
    toast.success(messages[Math.floor(Math.random() * messages.length)], {
      duration: 2000,
      position: "bottom-center",
    });
  };

  const removeItem = (productId: string, notes?: string) => {
    setItems((prev) => prev.filter((item) => {
      const itemKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
      const targetKey = notes ? `${productId}-${notes}` : productId;
      return itemKey !== targetKey;
    }));
  };

  const updateQuantity = (productId: string, quantity: number, notes?: string) => {
    if (quantity <= 0) {
      removeItem(productId, notes);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        const itemKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
        const targetKey = notes ? `${productId}-${notes}` : productId;
        if (itemKey !== targetKey) return item;

        const minQty = item.product.minQuantity ?? 1;
        // Round to nearest multiple of minQty (up), minimum minQty
        let nextQty = Math.max(minQty, Math.ceil(quantity / minQty) * minQty);

        const productWithStock = item.product as ProductWithStock;
        if (productWithStock.stockEnabled && typeof productWithStock.stockQuantity === "number") {
          const otherItemsQty = prev
            .filter((i) => i.product.id === productId && i !== item)
            .reduce((sum, i) => sum + i.quantity, 0);
          
          const maxForThisItem = productWithStock.stockQuantity - otherItemsQty;
          if (nextQty > maxForThisItem) {
            nextQty = Math.max(minQty, maxForThisItem);
            toast.warning(`Estoque limitado a ${productWithStock.stockQuantity} unidades.`, {
              duration: 2000,
              position: "bottom-center",
            });
          }
        }

        return { ...item, quantity: nextQty };
      })
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const moveToPreorder = useCallback((productId: string, notes?: string) => {
    setItems((prev) =>
      prev.map((item) => {
        const itemKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
        const targetKey = notes ? `${productId}-${notes}` : productId;
        if (itemKey !== targetKey) return item;
        if (item.product.fulfillmentMode !== "both") return item;
        return { ...item, fulfillmentOverride: "preorder" as const };
      })
    );
  }, []);

  const moveToInstant = useCallback((productId: string, notes?: string) => {
    setItems((prev) =>
      prev.map((item) => {
        const itemKey = item.notes ? `${item.product.id}-${item.notes}` : item.product.id;
        const targetKey = notes ? `${productId}-${notes}` : productId;
        if (itemKey !== targetKey) return item;
        if (item.product.fulfillmentMode !== "both") return item;
        return { ...item, fulfillmentOverride: "instant" as const };
      })
    );
  }, []);

  const instantItems = useMemo(
    () => items.filter((item) => getEffectiveFulfillment(item) === "instant"),
    [items]
  );

  const preorderItems = useMemo(
    () => items.filter((item) => getEffectiveFulfillment(item) === "preorder"),
    [items]
  );

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const instantSubtotal = useMemo(
    () => instantItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [instantItems]
  );

  const preorderSubtotal = useMemo(
    () => preorderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [preorderItems]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        clearCart,
        totalItems,
        subtotal,
        isOpen,
        setIsOpen,
        instantItems,
        preorderItems,
        moveToPreorder,
        moveToInstant,
        instantSubtotal,
        preorderSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
