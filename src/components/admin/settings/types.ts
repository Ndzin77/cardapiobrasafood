import { OpeningHour } from "@/hooks/useStore";

export interface CustomPayment {
  id: string;
  name: string;
  description?: string;
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
  customer_notice: string;
  delivery_fee_mode: "instant_only" | "full_upfront" | "on_delivery";
}

export const defaultPreorderConfig: PreorderConfig = {
  min_advance_hours: 24,
  max_advance_days: 14,
  daily_limit: 0,
  deposit_percent: 0,
  product_mode: "all",
  product_ids: [],
  blocked_days: [],
  blocked_dates: [],
  time_slots: ["10:00", "12:00", "14:00", "18:00"],
  customer_notice: "Encomendas devem ser feitas com antecedência. Confirmaremos disponibilidade por WhatsApp.",
  delivery_fee_mode: "instant_only",
};

export interface SettingsFormData {
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  cover_image_url: string;
  address: string;
  google_maps_url: string;
  phone: string;
  whatsapp: string;
  whatsapp_message: string;
  instagram: string;
  delivery_fee: string;
  min_order: string;
  estimated_time: string;
  is_open: boolean;
  theme_color: string;
  accepted_payments: string[];
  opening_hours: OpeningHour[];
  rating: string;
  review_count: string;
  checkout_link: string;
  custom_payments: CustomPayment[];
  help_button_enabled: boolean;
  help_button_message: string;
  checkout_provider: string;
  checkout_config: Record<string, any>;
  checkout_mode: string;
  unavailable_mode: string;
  unavailable_message: string;
  ordering_mode: string;
  ordering_hours: { day: string; hours: string; isOpen: boolean }[];
}

export const defaultOpeningHours: OpeningHour[] = [
  { day: "Segunda", hours: "08:00 - 18:00", isOpen: true },
  { day: "Terça", hours: "08:00 - 18:00", isOpen: true },
  { day: "Quarta", hours: "08:00 - 18:00", isOpen: true },
  { day: "Quinta", hours: "08:00 - 18:00", isOpen: true },
  { day: "Sexta", hours: "08:00 - 18:00", isOpen: true },
  { day: "Sábado", hours: "08:00 - 14:00", isOpen: true },
  { day: "Domingo", hours: "", isOpen: false },
];

export const quickPaymentOptions = [
  { id: "pix", name: "Pix", icon: "💳" },
  { id: "credito", name: "Cartão de Crédito", icon: "💳" },
  { id: "debito", name: "Cartão de Débito", icon: "💳" },
  { id: "dinheiro", name: "Dinheiro", icon: "💵" },
  { id: "vale_refeicao", name: "Vale Refeição", icon: "🎫" },
  { id: "vale_alimentacao", name: "Vale Alimentação", icon: "🎫" },
];
