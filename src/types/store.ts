export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  available: boolean;
  featured?: boolean;
  hasOptions?: boolean;
  options?: ProductOption[];
  minQuantity?: number;
  fulfillmentMode?: "instant" | "preorder" | "both";
}

export interface ProductOption {
  name: string;
  required: boolean;
  enabled?: boolean;
  max_select: number;
  min_select: number;
  choices: ProductOptionChoice[];
}

export interface ProductOptionChoice {
  name: string;
  price_modifier: number;
  image_url?: string;
  enabled?: boolean;
  /** Allows the same choice to be picked several times (e.g. 2x Nutella) */
  allow_multiple?: boolean;
  /** Max repetitions of this choice when allow_multiple is on */
  max_qty?: number;
  /** Min repetitions of this choice when allow_multiple is on */
  min_qty?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  icon_url?: string;
}

export interface SelectedOptionGroup {
  group: string;
  choices: { name: string; price: number; qty?: number }[];
}


export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  /** Structured selections from product customization */
  selectedOptions?: SelectedOptionGroup[];
  /** Override for products with fulfillmentMode "both" — lets user move between instant/preorder */
  fulfillmentOverride?: "instant" | "preorder";
}

export interface StoreInfo {
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  address: string;
  googleMapsUrl?: string;
  phone: string;
  whatsapp: string;
  whatsappMessage?: string;
  instagram?: string;
  openingHours: {
    day: string;
    hours: string;
    isOpen: boolean;
  }[];
  deliveryFee: number;
  minOrder: number;
  estimatedTime: string;
  acceptedPayments: string[];
  isOpen: boolean;
  rating?: number;
  reviewCount?: number;
  checkoutLink?: string;
  customPayments?: { id: string; name: string; description?: string }[];
  helpButtonEnabled?: boolean;
  helpButtonMessage?: string;
  /** Fulfillment options (per store) */
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  /** Online checkout provider */
  checkoutProvider?: string;
  /** Checkout mode: whatsapp, online, or both */
  checkoutMode?: string;
  /** Pre-order (encomenda) settings */
  preorderEnabled?: boolean;
  preorderConfig?: PreorderConfig;
  unavailableMode?: "show_badge" | "hide";
  unavailableMessage?: string;
  /** Ordering mode: hours_only, always, custom */
  orderingMode?: "hours_only" | "always" | "custom";
  orderingHours?: { day: string; hours: string; isOpen: boolean }[];
  deliveryZoneEnabled?: boolean;
  /** Computed: can place instant orders right now? */
  canOrderInstant?: boolean;
  /** Computed: can place preorder/encomenda right now? */
  canOrderPreorder?: boolean;
}

export interface PreorderConfig {
  min_advance_hours: number;
  max_advance_days: number;
  daily_limit: number;
  deposit_percent: number;
  product_mode: "all" | "selected" | "except";
  product_ids: string[];
  blocked_days: number[];
  blocked_dates: string[];
  time_slots: string[];
  customer_notice?: string;
  delivery_fee_mode?: "instant_only" | "full_upfront" | "on_delivery";
}
