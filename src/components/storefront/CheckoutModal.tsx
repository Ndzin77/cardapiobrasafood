import { lazy, Suspense, useMemo } from "react";
import { LocationPickerModal, LocationResult } from "@/components/storefront/LocationPickerModal";
import { useCart } from "@/hooks/useCart";
import { useCreateOrder } from "@/hooks/useOrders";
import { saveCustomerInfo, loadCustomerInfo, saveCustomerAddress, loadCustomerAddress, CustomerAddressInfo, loadAddressList } from "@/hooks/useCustomerOrders";
import { AddressSelector, SaveAddressPrompt } from "@/components/storefront/AddressSelector";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { StoreInfo, CartItem } from "@/types/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, CreditCard, Banknote, QrCode, CheckCircle2, Loader2, User, ClipboardList, Eye, Sparkles, Globe, Clock, XCircle, ShoppingBag, PartyPopper, MapPin, Lock, AlertCircle, Navigation, Search, ChevronDown, ArrowLeft, ChevronRight, CalendarDays, ShieldCheck, Package, Zap, Truck, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addHours, isBefore, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PreorderConfig } from "@/types/store";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { applyWhatsAppTemplate, clampText, encodeWhatsAppText, sanitizeWhatsAppNumber } from "@/lib/whatsappTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { findMatchingZone, validateCepNeighborhoodConsistency, getZoneNeighborhoods, getZoneFeeRange, type DeliveryZone } from "@/lib/deliveryZones";

function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  // Match patterns like ?q=-8.739,-44.204 or @-8.739,-44.204 or /-8.739,-44.204
  const patterns = [
    /[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /\/(-?\d+\.\d{3,}),\s*(-?\d+\.\d{3,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: StoreInfo;
  storeId: string;
  /** The type of order: instant delivery or preorder (encomenda) */
  orderType: "instant" | "preorder";
  /** The items for this specific checkout (only instant OR only preorder) */
  cartItems: CartItem[];
  initialCheckoutId?: string | null;
  initialCheckoutStatus?: "paid" | "pending" | null;
  initialCheckoutUrl?: string | null;
}

type CheckoutStep = "form" | "waiting-payment" | "success" | "success-online" | "register-prompt" | "payment-failed" | "checkout-expired";
type AddressLockField = "cep" | "street" | "neighborhood" | "city" | "state";

export function CheckoutModal({ open, onOpenChange, store, storeId, orderType, cartItems, initialCheckoutId, initialCheckoutStatus, initialCheckoutUrl }: CheckoutModalProps) {
  const { clearCart, setIsOpen } = useCart();
  const items = cartItems;
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const createOrder = useCreateOrder();
  const { customer, register, isLoading: authLoading } = useCustomerAuth();

  // Determine initial step based on URL checkout return
  const getInitialStep = (): CheckoutStep => {
    if (!initialCheckoutId) return "form";
    if (initialCheckoutStatus === "paid") return "success-online";
    return "waiting-payment";
  };

  const [step, setStep] = useState<CheckoutStep>(getInitialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnlinePayment, setIsOnlinePayment] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerPassword, setRegisterPassword] = useState("");
  const [savedCustomerPhone, setSavedCustomerPhone] = useState("");
  const [savedCustomerName, setSavedCustomerName] = useState("");
  const [pendingCheckoutId, setPendingCheckoutId] = useState<string | null>(initialCheckoutId || null);
  const [checkoutExpiresAt, setCheckoutExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(initialCheckoutUrl || null);
  
  // Guard to prevent duplicate "checkout-expired" transitions
  const hasTransitionedToExpired = useRef(false);

  const deliveryEnabled = store.deliveryEnabled ?? true;
  const pickupEnabled = store.pickupEnabled ?? true;
  const hasDeliveryChoice = deliveryEnabled && pickupEnabled;
  const onlyPickup = !deliveryEnabled && pickupEnabled;

  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    onlyPickup ? "pickup" : "delivery",
  );
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    noNumber: false,
    neighborhood: "",
    complement: "",
    city: "",
    state: "",
    address: "",
    googleMapsUrl: "",
    paymentMethod: "",
    change: "",
    observations: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  // CEP lookup state
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFound, setCepFound] = useState<boolean | null>(null);
  const [cepFilledFields, setCepFilledFields] = useState<string[]>([]);
  const [addressRevealed, setAddressRevealed] = useState(false);

  // Validation state — tracks which fields failed validation
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  // Address book state
  const [addressMode, setAddressMode] = useState<"select" | "new">("new");
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<CustomerAddressInfo | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingAddressToSave, setPendingAddressToSave] = useState<CustomerAddressInfo | null>(null);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "success" | "error">("idle");
  const [gpsMessage, setGpsMessage] = useState("");

  // Location picker modal state
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Map-locked address state (only fields auto-filled by map become locked)
  const [mapLockedFields, setMapLockedFields] = useState<AddressLockField[]>([]);
  const hasMapLockedFields = mapLockedFields.length > 0;
  const isFieldLocked = useCallback((field: AddressLockField) => mapLockedFields.includes(field), [mapLockedFields]);

  // Reverse CEP search state
  const [showCepSearch, setShowCepSearch] = useState(false);
  const [cepSearchUf, setCepSearchUf] = useState("");
  const [cepSearchCity, setCepSearchCity] = useState("");
  const [cepSearchStreet, setCepSearchStreet] = useState("");
  const [cepSearchLoading, setCepSearchLoading] = useState(false);
  const [cepSearchResults, setCepSearchResults] = useState<Array<{ cep: string; logradouro: string; bairro: string; localidade: string; uf: string }>>([]);

  // ── Form wizard step ──
  const [formStep, setFormStep] = useState<'delivery' | 'dados' | 'endereco' | 'pagamento' | 'schedule'>(
    hasDeliveryChoice ? 'delivery' : 'dados'
  );

  // ── Preorder/scheduling state ── (simplified: orderType comes from props)
  const preorderEnabled = store.preorderEnabled ?? false;
  const preorderConfig: PreorderConfig | undefined = store.preorderConfig;
  const isPreorderCheckout = orderType === "preorder" && preorderEnabled;
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [preorderAcknowledged, setPreorderAcknowledged] = useState(false);
  const [showPreorderConfirmDialog, setShowPreorderConfirmDialog] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [dailyLimitChecking, setDailyLimitChecking] = useState(false);

  // Simplified: no per-item fulfillment choices needed — all items share the same orderType
  const orderMode: "instant" | "preorder" = isPreorderCheckout ? "preorder" : "instant";
  const hasChosenPreorder = isPreorderCheckout;
  const hasPreorderItems = isPreorderCheckout;
  const allItemsPreorderOnly = isPreorderCheckout;

  const checkPreorderDailyLimit = useCallback(async (
    date: Date | undefined = scheduledDate,
    options?: { showToast?: boolean }
  ) => {
    const showToast = options?.showToast ?? true;
    const dailyLimit = Number(preorderConfig?.daily_limit || 0);

    if (orderMode !== "preorder" || !date || dailyLimit <= 0) {
      setDailyLimitReached(false);
      return false;
    }

    setDailyLimitChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-preorder-limit", {
        body: {
          store_id: storeId,
          scheduled_date: format(date, "yyyy-MM-dd"),
        },
      });

      if (error) throw error;

      const reached = !!data?.reached;
      setDailyLimitReached(reached);

      if (reached && showToast) {
        const limit = Number(data?.limit || dailyLimit);
        toast.error(`Limite de ${limit} encomendas atingido para este dia.`);
      }

      return reached;
    } catch (error) {
      console.error("Daily preorder limit error:", error);
      setDailyLimitReached(true);
      if (showToast) {
        toast.error("Não foi possível confirmar a disponibilidade desse dia agora. Tente novamente.");
      }
      return true;
    } finally {
      setDailyLimitChecking(false);
    }
  }, [orderMode, preorderConfig?.daily_limit, scheduledDate, storeId]);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  };

  const applyCepData = (data: { logradouro?: string; bairro?: string; localidade?: string; uf?: string; cep?: string }) => {
    const filled: string[] = [];
    setFormData((prev) => {
      const next = { ...prev };
      if (data.cep) { next.cep = data.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"); }
      if (data.logradouro) { next.street = data.logradouro; filled.push("street"); }
      if (data.bairro) { next.neighborhood = data.bairro; filled.push("neighborhood"); }
      if (data.localidade) { next.city = data.localidade; filled.push("city"); }
      if (data.uf) { next.state = data.uf; filled.push("state"); }
      return next;
    });
    setCepFilledFields(filled);
    setCepFound(true);
    setAddressRevealed(true);
    setTimeout(() => setCepFilledFields([]), 2500);
  };

  const handleCepChange = async (raw: string) => {
    if (isFieldLocked("cep")) return; // Block CEP editing only when CEP came from map auto-fill
    const formatted = formatCep(raw);
    setFormData((prev) => ({ ...prev, cep: formatted }));
    const digits = formatted.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepFound(null);
      setAddressRevealed(digits.length > 0);
      return;
    }
    setCepLoading(true);
    setCepFound(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepFound(false);
        setCepFilledFields([]);
        setAddressRevealed(true);
      } else {
        applyCepData(data);
      }
    } catch {
      setCepFound(false);
      setCepFilledFields([]);
      setAddressRevealed(true);
    } finally {
      setCepLoading(false);
    }
  };

  // GPS geolocation handler
  const handleGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsMessage("GPS não disponível neste dispositivo.");
      return;
    }
    setGpsLoading(true);
    setGpsStatus("idle");
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt`,
            { headers: { "User-Agent": "vitrine-app/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const postcode = addr.postcode?.replace(/\D/g, "") || "";
          if (!postcode) {
            setGpsStatus("error");
            setGpsMessage("Localização detectada, mas sem CEP disponível. Digite o CEP manualmente.");
          } else {
            const formatted = postcode.replace(/(\d{5})(\d{3})/, "$1-$2");
            setFormData((prev) => ({ ...prev, cep: formatted, lat: latitude, lng: longitude }));
            // Now fetch full data from ViaCEP for structured address
            const viaRes = await fetch(`https://viacep.com.br/ws/${postcode}/json/`);
            const viaData = await viaRes.json();
            if (!viaData.erro) {
              applyCepData(viaData);
            } else {
              // Use Nominatim data directly
              const filled: string[] = [];
              setFormData((prev) => {
                const next = { ...prev, cep: formatted, lat: latitude, lng: longitude };
                const road = addr.road || addr.pedestrian || addr.street || "";
                const suburb = addr.suburb || addr.neighbourhood || addr.quarter || "";
                const city = addr.city || addr.town || addr.village || addr.municipality || "";
                const state = addr.state_code || (addr.state ? addr.state.slice(0, 2).toUpperCase() : "");
                if (road) { next.street = road; filled.push("street"); }
                if (suburb) { next.neighborhood = suburb; filled.push("neighborhood"); }
                if (city) { next.city = city; filled.push("city"); }
                if (state) { next.state = state; filled.push("state"); }
                return next;
              });
              setCepFilledFields(filled);
              setCepFound(true);
              setAddressRevealed(true);
              setTimeout(() => setCepFilledFields([]), 2500);
            }
            setGpsStatus("success");
            setGpsMessage("📍 Localização detectada!");
            setTimeout(() => setGpsMessage(""), 3000);
          }
        } catch {
          setGpsStatus("error");
          setGpsMessage("Não conseguimos detectar sua localização. Digite o CEP.");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatus("error");
        if (err.code === 1) {
          setGpsMessage("GPS bloqueado. Ative nas configurações do navegador.");
        } else if (err.code === 3) {
          setGpsMessage("Tempo esgotado. Digite o CEP manualmente.");
        } else {
          setGpsMessage("Não foi possível obter localização. Digite o CEP.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Reverse CEP search (ViaCEP by address)
  const handleCepSearch = async () => {
    if (!cepSearchUf || !cepSearchCity || !cepSearchStreet) {
      toast.error("Preencha UF, cidade e logradouro para buscar.");
      return;
    }
    setCepSearchLoading(true);
    setCepSearchResults([]);
    try {
      const uf = encodeURIComponent(cepSearchUf.trim().toUpperCase());
      const city = encodeURIComponent(cepSearchCity.trim());
      const street = encodeURIComponent(cepSearchStreet.trim());
      const res = await fetch(`https://viacep.com.br/ws/${uf}/${city}/${street}/json/`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCepSearchResults(data.slice(0, 8));
        if (data.length === 0) toast.error("Nenhum CEP encontrado. Tente com outro logradouro.");
      } else {
        toast.error("Erro na busca. Tente com termos diferentes.");
      }
    } catch {
      toast.error("Erro ao buscar CEP. Verifique sua conexão.");
    } finally {
      setCepSearchLoading(false);
    }
  };

  const selectCepResult = (result: typeof cepSearchResults[0]) => {
    applyCepData({ ...result, cep: result.cep });
    setFormData((prev) => ({ ...prev, cep: result.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") }));
    setShowCepSearch(false);
    setCepSearchResults([]);
  };

  // Load saved customer info on mount
  useEffect(() => {
    const saved = loadCustomerInfo();
    const savedAddr = loadCustomerAddress();
    
    // Pre-fill from logged-in customer first, then localStorage
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        name: customer.name || prev.name,
        phone: customer.phone || prev.phone,
      }));
    } else if (saved) {
      setFormData((prev) => ({
        ...prev,
        name: saved.name || prev.name,
        phone: saved.phone || prev.phone,
      }));
    }

    // Sync default payment method with first accepted
    const allPayments = [
      ...(store.acceptedPayments || []),
      ...((store.customPayments || []) as { name: string }[]).map(p => p.name),
    ];
    if (allPayments.length > 0) {
      setFormData((prev) => ({
        ...prev,
        paymentMethod: prev.paymentMethod && allPayments.includes(prev.paymentMethod)
          ? prev.paymentMethod
          : allPayments[0] === "Pix" ? "pix"
          : allPayments[0] === "Cartão" ? "card"
          : allPayments[0] === "Dinheiro" ? "cash"
          : allPayments[0],
      }));
    } else {
      // Fallback: Pix é universal no Brasil
      setFormData((prev) => ({ ...prev, paymentMethod: prev.paymentMethod || "pix" }));
    }
    
    if (savedAddr?.cep) {
      setFormData((prev) => ({
        ...prev,
        cep: savedAddr.cep || "",
        street: savedAddr.street || "",
        neighborhood: savedAddr.neighborhood || "",
        city: savedAddr.city || "",
        state: savedAddr.state || "",
        number: savedAddr.number || "",
        complement: savedAddr.complement || "",
        googleMapsUrl: savedAddr.google_maps_url || "",
        ...(() => { const c = extractCoordsFromMapsUrl(savedAddr.google_maps_url || ""); return c ? { lat: c.lat, lng: c.lng } : {}; })(),
      }));
      if (savedAddr.street) {
        setCepFound(true);
        setAddressRevealed(true);
      }
    }
  }, [customer]);

  // If returning from payment and it's already paid, clear cart immediately
  useEffect(() => {
    if (initialCheckoutStatus === "paid" && initialCheckoutId) {
      clearCart();
      setIsOpen(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch expires_at when we have a pending checkout
  useEffect(() => {
    if (!pendingCheckoutId || step !== "waiting-payment") return;
    supabase
      .rpc("get_checkout_status", { p_checkout_id: pendingCheckoutId })
      .then(({ data }: { data: any }) => {
        if (data?.expires_at) {
          setCheckoutExpiresAt(new Date(data.expires_at));
        }
      });
  }, [pendingCheckoutId, step]);

  // Countdown timer for waiting-payment
  useEffect(() => {
    if (step !== "waiting-payment" || !checkoutExpiresAt) return;

    const tick = () => {
      const diff = checkoutExpiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        // Transition to expired step (only once)
        if (!hasTransitionedToExpired.current) {
          hasTransitionedToExpired.current = true;
          clearPendingCheckoutStorage();
          setStep("checkout-expired");
        }
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, checkoutExpiresAt]);

  // ── Location-first: auto-open map on address step ──
  const locationPromptShown = useRef(false);
  useEffect(() => {
    if (
      formStep === 'endereco' &&
      addressMode === 'new' &&
      !locationPromptShown.current &&
      !hasMapLockedFields &&
      !formData.googleMapsUrl.trim() &&
      !formData.cep.trim() &&
      !selectedSavedAddress
    ) {
      locationPromptShown.current = true;
      const timer = setTimeout(() => setShowLocationPicker(true), 400);
      return () => clearTimeout(timer);
    }
  }, [formStep, addressMode, hasMapLockedFields, formData.googleMapsUrl, formData.cep, selectedSavedAddress]);

  // ── Delivery zone matching ──
  const { data: deliveryZones = [] } = useDeliveryZones(storeId);
  const storeHasZones = store.deliveryZoneEnabled === true && deliveryZones.length > 0;

  const zoneMatch = useMemo(() => {
    if (!storeHasZones || deliveryType !== "delivery") return { matched: false, zone: null, fee: 0, min_order: 0 };
    return findMatchingZone(deliveryZones, {
      neighborhood: formData.neighborhood,
      cep: formData.cep,
      lat: formData.lat ?? undefined,
      lng: formData.lng ?? undefined,
    });
  }, [storeHasZones, deliveryZones, formData.neighborhood, formData.cep, formData.lat, formData.lng, deliveryType]);

  const deliveryFee = storeHasZones
    ? (zoneMatch.matched ? zoneMatch.fee : 0)
    : store.deliveryFee;
  // Smart zone blocking: only block when the relevant field for the zone type is filled
  const zoneTypes = useMemo(() => {
    const types = new Set(deliveryZones.filter(z => z.is_active).map(z => z.zone_type));
    return { neighborhood: types.has("neighborhood"), cep: types.has("cep"), radius: types.has("radius") };
  }, [deliveryZones]);

  const hasRelevantAddressData = 
    (zoneTypes.cep && formData.cep.replace(/\D/g, "").length >= 5) ||
    (zoneTypes.neighborhood && formData.neighborhood?.trim().length > 0) ||
    (zoneTypes.radius && formData.lat != null && formData.lng != null);

  const needsNeighborhood = storeHasZones && zoneTypes.neighborhood && !formData.neighborhood?.trim() && deliveryType === "delivery";

  // Cross-validate CEP vs neighborhood
  const cepNeighborhoodValidation = useMemo(() => {
    if (!storeHasZones || deliveryType !== "delivery") return { consistent: true, message: "" };
    return validateCepNeighborhoodConsistency(deliveryZones, formData.neighborhood, formData.cep);
  }, [storeHasZones, deliveryZones, formData.neighborhood, formData.cep, deliveryType]);

  const zoneBlocked = storeHasZones && deliveryType === "delivery" && (
    (hasRelevantAddressData && !zoneMatch.matched) || !cepNeighborhoodValidation.consistent
  );

  // Zone-level minimum order validation
  const zoneMinOrder = zoneMatch.matched ? zoneMatch.min_order : 0;
  const zoneMinOrderBlocked = zoneMinOrder > 0 && subtotal < zoneMinOrder;
  const zoneMinOrderRemaining = zoneMinOrder > 0 ? Math.max(0, zoneMinOrder - subtotal) : 0;

  // Available neighborhoods from zones for autocomplete
  const availableNeighborhoods = useMemo(() => getZoneNeighborhoods(deliveryZones), [deliveryZones]);
  const hasNeighborhoodAutocomplete = storeHasZones && zoneTypes.neighborhood && availableNeighborhoods.length > 0;
  const [neighborhoodPopoverOpen, setNeighborhoodPopoverOpen] = useState(false);
  const effectiveDeliveryFee = deliveryType === "delivery" ? deliveryFee : 0;
  // For preorder with instant_only mode, delivery fee is zero
  const deliveryFeeModeEarly = (preorderConfig as any)?.delivery_fee_mode || "instant_only";
  const preorderZeroFee = isPreorderCheckout && deliveryFeeModeEarly === "instant_only";
  const appliedDeliveryFee = preorderZeroFee ? 0 : effectiveDeliveryFee;
  const total = subtotal + appliedDeliveryFee;

  // ── Freight hint for step 1 (delivery type selection) ──
  const deliveryHint = useMemo(() => {
    if (!deliveryEnabled) return null;
    // If customer already has address data and zone matched, show matched fee
    if (storeHasZones && zoneMatch.matched && zoneMatch.zone) {
      return { type: "exact" as const, fee: zoneMatch.fee, label: zoneMatch.zone.label };
    }
    // If zones enabled with only 1 active zone, show it directly
    if (storeHasZones) {
      const activeZones = deliveryZones.filter(z => z.is_active);
      if (activeZones.length === 1) {
        return { type: "exact" as const, fee: activeZones[0].delivery_fee, label: activeZones[0].label };
      }
      // Multiple zones — hint varies
      const hasNeighborhood = activeZones.some(z => z.zone_type === "neighborhood");
      const hasCep = activeZones.some(z => z.zone_type === "cep");
      const hasRadius = activeZones.some(z => z.zone_type === "radius");
      const feeRange = getZoneFeeRange(activeZones);
      const minFee = feeRange.min;
      const maxFee = feeRange.max;
      return {
        type: "varies" as const,
        minFee, maxFee,
        hint: hasNeighborhood ? "por bairro" : hasCep ? "por região" : hasRadius ? "por distância" : "por região",
      };
    }
    // No zones — fixed fee from store
    if (store.deliveryFee > 0) {
      return { type: "fixed" as const, fee: store.deliveryFee };
    }
    return { type: "free" as const };
  }, [deliveryEnabled, storeHasZones, deliveryZones, zoneMatch, store.deliveryFee]);

  // Calculate deposit base: all items are preorder when orderType is preorder
  const calcDepositBase = useCallback(() => {
    if (!preorderConfig || !preorderConfig.deposit_percent) return 0;
    if (!isPreorderCheckout) return 0;
    return subtotal; // All items in this checkout are preorder
  }, [subtotal, preorderConfig, isPreorderCheckout]);

  const depositBase = calcDepositBase();
  const depositPercent = preorderConfig?.deposit_percent || 0;
  const depositAmount = hasChosenPreorder && depositPercent > 0
    ? (depositBase * depositPercent) / 100
    : 0;

  const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
  const parseBRLNumber = (raw: string) => {
    const clean = String(raw || "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.]/g, "");
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
  };

  // Preorder: the amount paid NOW (deposit + instant items + delivery based on mode)
  const deliveryFeeMode = preorderConfig?.delivery_fee_mode || "instant_only";
  const isPreorderDeposit = orderMode === "preorder" && depositAmount > 0 && depositPercent < 100;
  const deliveryFeeInPayNow = isPreorderDeposit && (deliveryFeeMode === "on_delivery" || deliveryFeeMode === "instant_only") ? 0 : appliedDeliveryFee;
  const payNowTotal = isPreorderDeposit
    ? depositAmount + (subtotal - depositBase) + deliveryFeeInPayNow
    : total;
  const remainingTotal = isPreorderDeposit ? depositBase - depositAmount : 0;
  // Display remaining includes deferred delivery fee for on_delivery mode
  const displayRemaining = isPreorderDeposit && deliveryFeeMode === "on_delivery"
    ? remainingTotal + effectiveDeliveryFee
    : remainingTotal;

  const cashGiven = formData.paymentMethod === "cash" ? parseBRLNumber(formData.change) : 0;
  const changeToBring = formData.paymentMethod === "cash" && cashGiven > 0 ? Math.max(0, cashGiven - payNowTotal) : 0;

  // Build full address string from structured fields
  const buildFullAddress = () => {
    const numPart = formData.noNumber ? "S/N" : formData.number;
    const parts = [
      formData.street && numPart ? `${formData.street}, ${numPart}` : formData.street || formData.address,
      formData.complement || "",
      formData.neighborhood,
      formData.city && formData.state ? `${formData.city}/${formData.state}` : formData.city || formData.state,
      formData.cep ? `CEP: ${formData.cep}` : "",
    ].filter(Boolean);
    return parts.join(" - ");
  };

  const buildOrderVars = () => {
    const itemsList = items
      .map((item) => {
        let line = `• ${item.quantity}x ${item.product.name} - R$ ${(item.product.price * item.quantity)
          .toFixed(2)
          .replace(".", ",")}`;
        if (item.notes) {
          line += `\n  _${item.notes}_`;
        }
        return line;
      })
      .join("\n");

    const resolvePaymentLabel = () => {
      const customMatch = (store.customPayments as any[] || []).find((p: any) => p.id === formData.paymentMethod);
      if (customMatch) return customMatch.name;
      const labels: Record<string, string> = { pix: "PIX", credit: "Cartão de Crédito", debit: "Cartão de Débito", cash: "Dinheiro" };
      return labels[formData.paymentMethod] || formData.paymentMethod;
    };

    return {
      loja_nome: store.name,
      cliente_nome: formData.name,
      cliente_whatsapp: formData.phone,
      endereco:
        deliveryType === "delivery"
          ? buildFullAddress()
          : store.address
            ? `Retirada na loja: ${store.address}`
            : "Retirada na loja",
      complemento: formData.complement,
      produtos: itemsList,
      subtotal: formatBRL(subtotal),
      taxa_entrega: formatBRL(appliedDeliveryFee),
      total: formatBRL(total),
      link_pagamento: store.checkoutLink || "",
      link_maps: formData.googleMapsUrl.trim() || "",
      troco_para: formData.paymentMethod === "cash" && cashGiven > 0 ? formatBRL(cashGiven) : "",
      troco_levar: formData.paymentMethod === "cash" && cashGiven > 0 ? formatBRL(changeToBring) : "",
      forma_pagamento: resolvePaymentLabel(),
      tipo_entrega: deliveryType === "delivery" ? "Entrega" : "Retirada",
      observacoes: formData.observations?.trim() || "",
    };
  };

  const buildDefaultOrderMessage = () => {
    const vars = buildOrderVars();

    const paymentLabels: Record<string, string> = {
      pix: "PIX",
      credit: "Cartão de Crédito",
      debit: "Cartão de Débito",
      cash: "Dinheiro",
    };

    const header = `*Novo Pedido*`;
    const customerBlock =
      `*${vars.loja_nome}*\n\n` +
      `*Cliente:* ${vars.cliente_nome}\n` +
      `*Telefone:* ${vars.cliente_whatsapp}\n` +
      (deliveryType === "pickup"
        ? `*Retirada:* Na loja${store.address ? ` (${store.address})` : ""}`
        : `*Endereço:* ${vars.endereco}${vars.complemento ? ` (${vars.complemento})` : ""}`);

    const itemsBlock = `*Itens do Pedido:*\n${vars.produtos}`;
    const totalsBlock = deliveryType === "pickup"
      ? `*Subtotal:* ${vars.subtotal}\n*Total:* ${vars.total}`
      : preorderZeroFee
        ? `*Subtotal:* ${vars.subtotal}\n*Frete:* Grátis na encomenda\n*Total:* ${vars.total}`
        : `*Subtotal:* ${vars.subtotal}\n*Taxa de Entrega:* ${vars.taxa_entrega}\n*Total:* ${vars.total}`;

    const paymentBlock =
      `*Forma de Pagamento:* ${paymentLabels[formData.paymentMethod] || formData.paymentMethod}` +
      (formData.paymentMethod === "cash" && cashGiven > 0
        ? ` (Troco para ${formatBRL(cashGiven)} — Levar ${formatBRL(changeToBring)})`
        : "");

    const notesBlock = formData.observations ? `*Observações:* ${formData.observations}` : "";

    const mapsBlock = formData.googleMapsUrl.trim() ? `📍 *Link no Maps:* ${formData.googleMapsUrl.trim()}` : "";

    const checkoutBlock = store.checkoutLink
      ? `*Link de Pagamento:* ${store.checkoutLink}\nPor favor, efetue o pagamento e nos envie o comprovante.`
      : "";

    const preorderBlock = (() => {
      if (orderMode !== "preorder" || !scheduledDate || !scheduledTime) return "";
      let block = `📅 *ENCOMENDA AGENDADA*\n*Data:* ${format(scheduledDate, "dd/MM/yyyy")}\n*Horário:* ${scheduledTime}`;
      block += `\n\n📦 *Itens agendados:*\n${items.map(i => `• ${i.quantity}x ${i.product.name}`).join("\n")}`;
      if (depositAmount > 0) {
        // Calculate remaining considering delivery_fee_mode
        const remainingWithFee = deliveryFeeMode === "on_delivery"
          ? remainingTotal + effectiveDeliveryFee
          : remainingTotal;
        block += `\n*Entrada (${depositPercent}%):* ${formatBRL(depositAmount)} (sobre itens da encomenda)\n*Paga agora:* ${formatBRL(payNowTotal)}\n*Restante na ${deliveryType === "delivery" ? "entrega" : "retirada"}:* ${formatBRL(remainingWithFee)}`;
        if (deliveryFeeMode === "on_delivery" && effectiveDeliveryFee > 0) {
          block += `\n_(Frete de ${formatBRL(effectiveDeliveryFee)} cobrado na ${deliveryType === "delivery" ? "entrega" : "retirada"})_`;
        }
      }
      return block;
    })();

    const zoneBlock = storeHasZones && zoneMatch.matched && zoneMatch.zone
      ? `📍 *Zona de Entrega:* ${zoneMatch.zone.label} (Taxa: ${formatBRL(zoneMatch.fee)})`
      : "";

    return [header, preorderBlock, customerBlock, itemsBlock, totalsBlock, paymentBlock, zoneBlock, notesBlock, mapsBlock, checkoutBlock]
      .filter(Boolean)
      .join("\n\n");
  };

  const generateWhatsAppMessage = () => {
    const template = (store.whatsappMessage || "").trim();
    const vars = buildOrderVars();
    const rendered = template ? applyWhatsAppTemplate(template, vars) : buildDefaultOrderMessage();
    return encodeWhatsAppText(clampText(rendered, 3500));
  };

  // Phone formatting helper
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const isValidEmail = (value: string) => {
    const email = value.trim();
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
  };

  // ── Step navigation ──
  const getStepOrder = useCallback((): Array<'delivery' | 'dados' | 'endereco' | 'pagamento' | 'schedule'> => {
    const s: Array<'delivery' | 'dados' | 'endereco' | 'pagamento' | 'schedule'> = [];
    if (hasDeliveryChoice) s.push('delivery');
    s.push('dados');
    if (deliveryType === 'delivery') s.push('endereco');
    if (preorderEnabled && hasPreorderItems) s.push('schedule');
    s.push('pagamento');
    return s;
  }, [hasDeliveryChoice, deliveryType, preorderEnabled, hasPreorderItems]);

  const stepOrder = getStepOrder();
  const currentStepIndex = stepOrder.indexOf(formStep);
  const stepProgress = ((currentStepIndex + 1) / stepOrder.length) * 100;

  const goNext = useCallback(() => {
    const idx = stepOrder.indexOf(formStep);
    if (idx < stepOrder.length - 1) {
      setInvalidFields(new Set());
      setFormStep(stepOrder[idx + 1]);
    }
  }, [stepOrder, formStep]);

  const goBack = useCallback(() => {
    const idx = stepOrder.indexOf(formStep);
    if (idx > 0) {
      setInvalidFields(new Set());
      setFormStep(stepOrder[idx - 1]);
    }
  }, [stepOrder, formStep]);

  const validateStep = useCallback((): boolean => {
    const invalid = new Set<string>();
    switch (formStep) {
      case 'dados':
        if (!formData.name.trim()) invalid.add('name');
        if (!formData.phone.replace(/\D/g, '') || formData.phone.replace(/\D/g, '').length < 10) invalid.add('phone');
        if (formData.email.trim() && !isValidEmail(formData.email)) invalid.add('email');
        break;
      case 'endereco': {
        // If store has CEP or neighborhood zones with cep_prefixes, CEP is always mandatory
        const zoneRequiresCep = storeHasZones && (
          zoneTypes.cep ||
          deliveryZones.some(z => z.is_active && z.zone_type === 'neighborhood' && ((z.config as any).cep_prefixes?.length > 0))
        );
        if (zoneRequiresCep && formData.cep.replace(/\D/g, '').length !== 8) invalid.add('cep');
        else if (!formData.googleMapsUrl.trim() && formData.cep.replace(/\D/g, '').length !== 8) invalid.add('cep');
        if (!formData.street.trim()) invalid.add('street');
        if (!formData.noNumber && !formData.number.trim()) invalid.add('number');
        if (!formData.neighborhood.trim()) invalid.add('neighborhood');
        break;
      }
      case 'pagamento':
        if (!formData.paymentMethod) invalid.add('paymentMethod');
        if (formData.paymentMethod === 'cash' && !formData.change.trim()) invalid.add('change');
        break;
      case 'schedule':
        if (orderMode === 'preorder') {
          if (!scheduledDate) invalid.add('scheduledDate');
          if (!scheduledTime) invalid.add('scheduledTime');
          if (dailyLimitReached || dailyLimitChecking) {
            invalid.add('scheduledDate');
            if (dailyLimitReached) {
              toast.error("Este dia já atingiu o limite de encomendas. Escolha outra data.");
            } else {
              toast.error("Aguarde a verificação de disponibilidade deste dia.");
            }
          }
        }
        break;
    }
    setInvalidFields(invalid);
    if (invalid.size > 0) {
      if (invalid.has('scheduledDate') || invalid.has('scheduledTime')) {
        if (!dailyLimitReached && !dailyLimitChecking) {
          toast.error("Selecione data e horário para a encomenda.");
        }
      } else {
        const firstField = Array.from(invalid)[0];
        setTimeout(() => {
          document.getElementById(firstField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById(firstField)?.focus();
        }, 100);
        toast.error("Preencha os campos destacados em vermelho.");
      }
      return false;
    }
    return true;
  }, [formStep, formData, isValidEmail, storeHasZones, zoneTypes, deliveryZones, orderMode, scheduledDate, scheduledTime, dailyLimitReached, dailyLimitChecking]);

  // Full form validation (safety net for final submit)
  const validateForm = (): Set<string> => {
    const invalid = new Set<string>();
    if (!formData.name.trim()) invalid.add("name");
    if (!formData.phone.replace(/\D/g, "") || formData.phone.replace(/\D/g, "").length < 10) invalid.add("phone");
    if (formData.email.trim() && !isValidEmail(formData.email)) invalid.add("email");
    if (deliveryType === "delivery") {
      if (!formData.googleMapsUrl.trim() && formData.cep.replace(/\D/g, "").length !== 8) invalid.add("cep");
      if (!formData.street.trim()) invalid.add("street");
      if (!formData.noNumber && !formData.number.trim()) invalid.add("number");
      if (!formData.neighborhood.trim()) invalid.add("neighborhood");
    }
    if (!formData.paymentMethod) invalid.add("paymentMethod");
    if (formData.paymentMethod === "cash" && !formData.change.trim()) invalid.add("change");
    return invalid;
  };

  const handleValidationError = (invalid: Set<string>) => {
    setInvalidFields(invalid);
    const firstField = Array.from(invalid)[0];
    if (['name', 'phone', 'email'].includes(firstField)) setFormStep('dados');
    else if (['cep', 'street', 'number', 'neighborhood'].includes(firstField)) setFormStep('endereco');
    setTimeout(() => {
      document.getElementById(firstField)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(firstField)?.focus();
    }, 200);
    toast.error("Preencha os campos destacados em vermelho.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zoneBlocked) {
      toast.error("Não entregamos nessa região. Escolha retirada ou altere o endereço.");
      return;
    }
    if (zoneMinOrderBlocked) {
      toast.error(`Pedido mínimo para sua região: R$ ${zoneMinOrder.toFixed(2).replace(".", ",")}. Faltam R$ ${zoneMinOrderRemaining.toFixed(2).replace(".", ",")}.`);
      return;
    }
    if (orderMode === "preorder" && await checkPreorderDailyLimit(scheduledDate)) {
      return;
    }
    const invalid = validateForm();
    if (invalid.size > 0) {
      handleValidationError(invalid);
      return;
    }
    setIsSubmitting(true);
    try {
      const computedCashNote =
        formData.paymentMethod === "cash" && cashGiven > 0
          ? `Troco para: ${formatBRL(cashGiven)} | Levar troco: ${formatBRL(changeToBring)}`
          : "";
      const mergedNotes = [formData.observations?.trim(), computedCashNote].filter(Boolean).join("\n").trim() || null;
      const normalizedPhone = String(formData.phone || "").replace(/\D/g, "");
      const fullAddr = buildFullAddress();

      const mapItem = (item: typeof items[0]) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        notes: item.notes,
        fulfillment_mode: item.product.fulfillmentMode || "instant",
        fulfillment_choice: orderMode,
        ...(item.selectedOptions && item.selectedOptions.length > 0
          ? { selected_options: item.selectedOptions }
          : {}),
      });

      const baseOrderData = {
        store_id: storeId,
        customer_name: formData.name,
        customer_phone: normalizedPhone,
        customer_address: deliveryType === "delivery" ? fullAddr : null,
        customer_maps_url: deliveryType === "delivery" && formData.googleMapsUrl.trim() ? formData.googleMapsUrl.trim() : null,
        delivery_type: deliveryType,
        payment_method: (() => {
          const customMatch = (store.customPayments || []).find((p: any) => p.id === formData.paymentMethod);
          return customMatch ? customMatch.name : formData.paymentMethod;
        })(),
        notes: mergedNotes,
        status: "pending" as const,
      };

      // Delivery fee mode for preorders
      const deliveryFeeModeLocal = preorderConfig?.delivery_fee_mode || "instant_only";

      {
        // ── Single order (always one type now — no mixed cart) ──
        const singlePreorderDeliveryFee = orderMode === "preorder" && deliveryFeeModeLocal === "instant_only"
          ? 0
          : effectiveDeliveryFee;
        const singlePreorderTotal = subtotal + singlePreorderDeliveryFee;
        await createOrder.mutateAsync({
          ...baseOrderData,
          items: items.map(mapItem),
          subtotal,
          delivery_fee: singlePreorderDeliveryFee,
          total: singlePreorderTotal,
          order_type: orderMode,
          scheduled_date: orderMode === "preorder" && scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
          scheduled_time: orderMode === "preorder" ? scheduledTime || null : null,
          deposit_amount: depositAmount > 0 ? depositAmount : null,
          deposit_status: depositAmount > 0 ? "pending" : null,
        });
      }

      saveCustomerInfo({ phone: normalizedPhone, name: formData.name });
      if (deliveryType === "delivery") {
        const addrWithContact = { cep: formData.cep, street: formData.street, number: formData.noNumber ? "" : formData.number, complement: formData.complement, neighborhood: formData.neighborhood, city: formData.city, state: formData.state, google_maps_url: formData.googleMapsUrl.trim() || undefined, contact_name: formData.name, contact_phone: normalizedPhone, contact_email: formData.email || undefined };
        saveCustomerAddress(addrWithContact);
        if (!selectedSavedAddress) { setPendingAddressToSave(addrWithContact); setShowSavePrompt(true); }
      }
      setSavedCustomerPhone(normalizedPhone);
      setSavedCustomerName(formData.name);

      const message = generateWhatsAppMessage();
      const whatsappNumber = sanitizeWhatsAppNumber(store.whatsapp);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      window.open(whatsappUrl, "_blank");

      if (!customer) { setStep("register-prompt"); } else { setStep("success"); }
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Erro ao processar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearPendingCheckoutStorage = useCallback(() => {
    if (store.slug) {
      localStorage.removeItem(`vitrine-pending-checkout-${store.slug}`);
    }
  }, [store.slug]);

  const handleClose = () => {
    if (step === "success" || step === "register-prompt" || step === "success-online") {
      clearCart();
      setIsOpen(false);
    }
    clearPendingCheckoutStorage();
    setStep("form");
    setFormStep(hasDeliveryChoice ? 'delivery' : 'dados');
    setDeliveryType(onlyPickup ? "pickup" : "delivery");
    hasTransitionedToExpired.current = false;
    setRegisterPassword("");
    setPendingCheckoutId(null);
    setCheckoutExpiresAt(null);
    setCheckoutUrl(null);
    setOrderId(null);
    setMapLockedFields([]);
    setShowCepSearch(false);
    onOpenChange(false);
  };

  const handleQuickRegister = async () => {
    if (!registerPassword || registerPassword.length < 4) {
      toast.error("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    
    setIsRegistering(true);
    try {
      const result = await register(storeId, savedCustomerPhone, savedCustomerName, registerPassword);
      if (result.success) {
        toast.success("Cadastro realizado! Agora você pode acompanhar seus pedidos.");
        setStep("success");
      } else {
        toast.error(result.error || "Erro ao cadastrar. Tente novamente.");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setIsRegistering(false);
    }
  };

  const skipRegistration = () => {
    setStep("success");
  };

  const checkoutMode = store.checkoutMode || "whatsapp";
  const hasOnlineCheckout = store.checkoutProvider && store.checkoutProvider !== "none" && checkoutMode !== "whatsapp";

  // Adaptive button logic: offline payments (cash, custom) hide online checkout button
    const offlinePaymentIds = ["cash", ...(store.customPayments || []).map(p => p.id)];
    const isOfflinePayment = offlinePaymentIds.includes(formData.paymentMethod);
  const showOnlineButton = hasOnlineCheckout && !isOfflinePayment;

  // WhatsApp button: always show in "whatsapp"/"both" modes,
  // AND as exception in "online" mode when an offline payment (e.g. Dinheiro) is selected
  const storeHasWhatsApp = !!store.whatsapp && sanitizeWhatsAppNumber(store.whatsapp).length > 0;
  const showWhatsApp = storeHasWhatsApp && (checkoutMode === "whatsapp" || checkoutMode === "both" || (checkoutMode === "online" && isOfflinePayment));

  const handleOnlinePayment = async () => {
    if (zoneBlocked) {
      toast.error("Não entregamos nessa região. Escolha retirada ou altere o endereço.");
      return;
    }
    if (zoneMinOrderBlocked) {
      toast.error(`Pedido mínimo para sua região: R$ ${zoneMinOrder.toFixed(2).replace(".", ",")}. Faltam R$ ${zoneMinOrderRemaining.toFixed(2).replace(".", ",")}.`);
      return;
    }
    if (orderMode === "preorder" && await checkPreorderDailyLimit(scheduledDate)) {
      return;
    }
    const invalid = validateForm();
    if (invalid.size > 0) {
      handleValidationError(invalid);
      return;
    }

    setIsOnlinePayment(true);
    try {
      const existingCheckoutRaw = localStorage.getItem(`vitrine-pending-checkout-${store.slug}`);
      if (existingCheckoutRaw) {
        try {
          const existing = JSON.parse(existingCheckoutRaw);
          if (existing?.id && existing.id !== pendingCheckoutId) {
            await supabase.rpc("cancel_pending_checkout", { p_checkout_id: existing.id });
          }
        } catch {}
        localStorage.removeItem(`vitrine-pending-checkout-${store.slug}`);
      }
      if (pendingCheckoutId) {
        await supabase.rpc("cancel_pending_checkout", { p_checkout_id: pendingCheckoutId });
        setPendingCheckoutId(null);
      }
      const normalizedPhone = String(formData.phone || "").replace(/\D/g, "");
      const mergedNotes = [formData.observations?.trim()].filter(Boolean).join("\n").trim() || null;

      saveCustomerInfo({ phone: normalizedPhone, name: formData.name });
      if (deliveryType === "delivery") {
        const addrWithContact = { cep: formData.cep, street: formData.street, number: formData.noNumber ? "" : formData.number, complement: formData.complement, neighborhood: formData.neighborhood, city: formData.city, state: formData.state, google_maps_url: formData.googleMapsUrl.trim() || undefined, contact_name: formData.name, contact_phone: normalizedPhone, contact_email: formData.email || undefined };
        saveCustomerAddress(addrWithContact);
        if (!selectedSavedAddress) { setPendingAddressToSave(addrWithContact); setShowSavePrompt(true); }
      }
      setSavedCustomerPhone(normalizedPhone);
      setSavedCustomerName(formData.name);

      const normalizedPhoneForCheckout = normalizedPhone.startsWith("+") ? normalizedPhone : `+55${normalizedPhone}`;
      const fullAddr = deliveryType === "delivery" ? buildFullAddress() : null;

      const addressStructured = deliveryType === "delivery" ? {
        zip_code: formData.cep.replace(/\D/g, ""),
        street: formData.street,
        number: formData.noNumber ? "S/N" : formData.number,
        complement: formData.complement || "",
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
      } : null;

      const customerMapsUrl = deliveryType === "delivery" && formData.googleMapsUrl.trim() ? formData.googleMapsUrl.trim() : null;

      // Use the pre-computed payNowTotal for online charges
      const chargeTotal = payNowTotal;

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          store_id: storeId,
          store_url: window.location.href.split('?')[0],
          total: chargeTotal,
          subtotal,
          delivery_fee: orderMode === "preorder" && deliveryFeeMode === "instant_only" ? 0 : effectiveDeliveryFee,
          items_description: items.map((i) => `${i.quantity}x ${i.product.name}`).join(", "),
          customer_name: formData.name,
          customer_phone: normalizedPhoneForCheckout,
          customer_email: formData.email || null,
          customer_address: fullAddr,
          customer_address_structured: addressStructured,
          customer_maps_url: customerMapsUrl,
          delivery_type: deliveryType,
          notes: mergedNotes,
          // Preorder metadata
          order_type: orderMode,
          ...(orderMode === "preorder" && {
            scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
            scheduled_time: scheduledTime || null,
            deposit_amount: depositAmount,
          }),
          has_mixed_cart: false,
          delivery_fee_mode: deliveryFeeMode,
          items: items.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            name: i.product.name,
            quantity: i.quantity,
            unit_price: i.product.price,
            total_price: i.product.price * i.quantity,
            notes: i.notes,
            fulfillment_mode: i.product.fulfillmentMode || "instant",
            fulfillment_choice: orderMode,
          })),
        },
      });

      if (error || !data?.checkout_url) {
        let errorBody: Record<string, unknown> | null = data || null;
        if (!errorBody && error?.context?.body) {
          try {
            const reader = error.context.body.getReader?.();
            if (reader) {
              const { value } = await reader.read();
              const text = new TextDecoder().decode(value);
              errorBody = JSON.parse(text);
            }
          } catch {}
        }
        if (!errorBody && error?.context?.json) {
          try { errorBody = await error.context.json(); } catch {}
        }

        if (errorBody?.error === "INSUFFICIENT_STOCK") {
          const productName = String(errorBody.product_name || "Produto");
          const available = Number(errorBody.available) || 0;
          const requested = Number(errorBody.requested) || 0;
          const availableText = available === 0
            ? `${productName} esgotou! 😔`
            : `${productName} tem apenas ${available} un. disponíve${available > 1 ? "is" : "l"}.`;
          const actionText = available === 0
            ? "Remova este item do carrinho para continuar."
            : `Você pediu ${requested}. Reduza para ${available} ou menos no carrinho.`;
          toast.error(
            <div className="space-y-1">
              <p className="font-semibold text-sm">{availableText}</p>
              <p className="text-xs text-muted-foreground">{actionText}</p>
            </div>,
            { duration: 8000 }
          );
        } else {
          const errorMsg = String(errorBody?.error || error?.message || "");
          toast.error(errorMsg || "Erro ao gerar link de pagamento. Tente novamente.");
        }
        console.error("Checkout error:", error, data);
        return;
      }

      setPendingCheckoutId(data.checkout_id);
      setCheckoutUrl(data.checkout_url);
      try {
        localStorage.setItem(`vitrine-pending-checkout-${store.slug}`, JSON.stringify({
          id: data.checkout_id,
          url: data.checkout_url,
          createdAt: new Date().toISOString(),
        }));
      } catch {}
      window.open(data.checkout_url, "_blank");
      setStep("waiting-payment");
    } catch (error) {
      console.error("Online payment error:", error);
      toast.error("Erro ao processar pagamento online. Tente novamente.");
    } finally {
      setIsOnlinePayment(false);
    }
  };

  // Poll pending checkout status
  useEffect(() => {
    if (step !== "waiting-payment" || !pendingCheckoutId) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .rpc("get_checkout_status", { p_checkout_id: pendingCheckoutId }) as { data: { status: string } | null; error: any };

        if (error) return;

        if (data.status === "paid") {
          clearInterval(interval);
          clearPendingCheckoutStorage();
          clearCart();
          setIsOpen(false);
          if (!customer) {
            setStep("register-prompt");
          } else {
            setStep("success-online");
          }
        } else if (data.status === "failed") {
          clearInterval(interval);
          clearPendingCheckoutStorage();
          setStep("payment-failed");
        } else if (data.status === "expired") {
          clearInterval(interval);
          clearPendingCheckoutStorage();
          if (!hasTransitionedToExpired.current) {
            hasTransitionedToExpired.current = true;
            setStep("checkout-expired");
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step, pendingCheckoutId, customer, clearCart, setIsOpen]);

  // Get payment options
  const acceptedLower = (store.acceptedPayments || []).map((p) => String(p || "").toLowerCase());
  const isAllEnabled = (store.acceptedPayments || []).length === 0;

  const basePayments = [
    { id: "pix", label: "PIX", icon: QrCode, enabled: acceptedLower.some((p) => p.includes("pix")) },
    { id: "credit", label: "Crédito", icon: CreditCard, enabled: acceptedLower.some((p) => p.includes("crédito") || p.includes("credito")) },
    { id: "debit", label: "Débito", icon: CreditCard, enabled: acceptedLower.some((p) => p.includes("débito") || p.includes("debito")) },
    { id: "cash", label: "Dinheiro", icon: Banknote, enabled: acceptedLower.some((p) => p.includes("dinheiro")) },
  ];

  const customPayments = (store.customPayments || []).map((p) => ({
    id: p.id,
    label: p.name,
    icon: CreditCard,
    enabled: true, // Custom payments are always shown — admin explicitly configured them
  }));

  const availablePayments = [...basePayments, ...customPayments]
    .filter((p) => isAllEnabled || p.enabled)
    .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);

  const defaultPayment = availablePayments[0]?.id || "pix";

  // Bug 4 fix: Sync paymentMethod with first available payment when current selection is invalid
  useEffect(() => {
    const isCurrentValid = availablePayments.some(p => p.id === formData.paymentMethod);
    if (!isCurrentValid && defaultPayment) {
      setFormData(prev => ({ ...prev, paymentMethod: defaultPayment }));
    }
  }, [defaultPayment, availablePayments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepLabels: Record<string, string> = {
    delivery: 'Entrega', schedule: 'Agendamento', dados: 'Dados', endereco: 'Endereço', pagamento: 'Pagamento',
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 sm:p-0">
        {step === "form" ? (
          <>
            {/* ── Dynamic Header ── */}
            <div className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-card to-accent/5 border-b border-border/50 backdrop-blur-sm">
              <Progress value={stepProgress} className="h-1.5 rounded-none [&>div]:transition-all [&>div]:duration-500" />

              <div className="p-5 pb-3">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-display">
                    <div className="p-2.5 rounded-xl bg-primary/10 shadow-soft">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <span>Finalizar Pedido</span>
                  </DialogTitle>
                </DialogHeader>

                {/* Step indicators */}
                <div className="flex items-center gap-1 mt-4">
                  {stepOrder.map((s, i) => (
                    <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                        i <= currentStepIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {i < currentStepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-medium truncate hidden sm:inline ${
                        i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                      }`}>{stepLabels[s]}</span>
                      {i < stepOrder.length - 1 && (
                        <div className={`flex-1 h-0.5 rounded mx-0.5 transition-colors duration-300 ${
                          i < currentStepIndex ? 'bg-primary' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Mini Item Preview with eligibility badges */}
                {items.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
                    {items.slice(0, 5).map((item) => {
                      const fm = item.product.fulfillmentMode || "instant";
                      const isEligible = fm === "preorder" || fm === "both";
                      const hasInstantOnly = items.some(i => (i.product.fulfillmentMode || "instant") === "instant");
                      const hasPre = items.some(i => {
                        const f = i.product.fulfillmentMode || "instant";
                        return f === "preorder" || f === "both";
                      });
                      const isMixed = hasInstantOnly && hasPre;
                      const showBadges = preorderEnabled && hasPreorderItems && isMixed ? isEligible : null;
                      return (
                        <div key={`preview-${item.product.id}-${item.notes || ''}`} className="shrink-0 relative">
                          <div className={`w-10 h-10 rounded-lg overflow-hidden border-2 shadow-soft transition-colors duration-300 ${
                            showBadges === true ? 'border-primary' : showBadges === false ? 'border-accent' : 'border-white'
                          }`}>
                            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                            {item.quantity}
                          </span>
                          {showBadges !== null && (
                            <span className={`absolute -bottom-1 -left-1 text-[8px] leading-none rounded-full px-1 py-0.5 font-bold ${
                              showBadges ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                            }`}>
                              {showBadges ? '📦' : '⚡'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {items.length > 5 && (
                      <span className="text-xs text-muted-foreground shrink-0">+{items.length - 5}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto shrink-0 font-medium">
                      {items.length} {items.length === 1 ? "item" : "itens"} · <strong className="text-primary">{formatBRL(total)}</strong>
                      {isPreorderDeposit && (
                        <span className="text-[10px] text-muted-foreground/70 ml-1">(entrada: {formatBRL(payNowTotal)})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Step Content ── */}
            <div className="p-5">

              {/* ═══ STEP: Delivery Type ═══ */}
              {formStep === 'delivery' && (
                <div key="step-delivery" className="animate-fade-in space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-foreground text-lg">Como você quer receber?</h3>
                    <p className="text-sm text-muted-foreground">Escolha a forma de recebimento</p>
                  </div>

                  <RadioGroup
                    value={deliveryType}
                    onValueChange={(value) => setDeliveryType(value as "delivery" | "pickup")}
                    className="grid grid-cols-2 gap-3"
                  >
                    {[
                      { id: "delivery", label: "🛵 Entrega", desc: "Receba no seu endereço" },
                      { id: "pickup", label: "🏪 Retirada", desc: "Retire na loja" }
                    ].map((opt) => (
                      <Label
                        key={opt.id}
                        htmlFor={`dt-${opt.id}`}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          deliveryType === opt.id
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem value={opt.id} id={`dt-${opt.id}`} className="sr-only" />
                        <span className="font-bold text-sm">{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground text-center">{opt.desc}</span>
                      </Label>
                    ))}
                  </RadioGroup>

                  {/* Freight hint */}
                  {deliveryType === "delivery" && deliveryHint && (
                    <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                      {deliveryHint.type === "exact" && (
                        <span>Frete: <strong className="text-foreground">{formatBRL(deliveryHint.fee)}</strong>{deliveryHint.label ? ` · ${deliveryHint.label}` : ""}</span>
                      )}
                      {deliveryHint.type === "fixed" && (
                        <span>Frete: <strong className="text-foreground">{formatBRL(deliveryHint.fee)}</strong></span>
                      )}
                      {deliveryHint.type === "varies" && (
                        <span>
                          Frete {deliveryHint.hint}: {deliveryHint.minFee === deliveryHint.maxFee
                            ? <strong className="text-foreground">{formatBRL(deliveryHint.minFee)}</strong>
                            : <>de <strong className="text-foreground">{formatBRL(deliveryHint.minFee)}</strong> a <strong className="text-foreground">{formatBRL(deliveryHint.maxFee)}</strong></>
                          }
                        </span>
                      )}
                      {deliveryHint.type === "free" && (
                        <span className="text-emerald-600 font-semibold">Frete grátis ✨</span>
                      )}
                    </div>
                  )}
                  {deliveryType === "pickup" && (
                    <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Sem taxa de entrega</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={goNext}
                    className="w-full h-12 rounded-xl gap-2 text-sm font-bold gradient-primary shadow-soft hover:shadow-medium transition-all duration-300"
                  >
                    Continuar <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* ═══ STEP: Schedule (Preorder) ═══ */}
              {formStep === 'schedule' && (
                <div key="step-schedule" className="animate-fade-in space-y-4">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative">
                        <Package className="w-5 h-5 text-amber-600" />
                        <Clock className="w-2.5 h-2.5 text-amber-600 absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <h3 className="font-bold text-foreground text-lg">Quando deseja receber?</h3>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Escolha o melhor dia e horário pra você
                    </p>
                  </div>

                  {/* Trust builder — "Como funciona" 3-step guide */}
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 space-y-2.5">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Como funciona
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">1</div>
                        <p className="text-[13px] text-foreground leading-relaxed">
                          {depositPercent > 0
                            ? <>Você paga <strong className="text-primary">{depositPercent === 100 ? "o valor total" : `${depositPercent}%`}</strong> agora pra garantir a reserva</>
                            : <>Você faz o pedido e <strong className="text-primary">a gente reserva</strong> pra você</>
                          }
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">2</div>
                        <p className="text-[13px] text-foreground leading-relaxed">A gente <strong>prepara com carinho</strong> no dia marcado</p>
                      </div>
                      {depositPercent > 0 && depositPercent < 100 && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">3</div>
                          <p className="text-[13px] text-foreground leading-relaxed">
                            Você paga <strong>os {100 - depositPercent}% restantes quando receber</strong> — simples assim!
                          </p>
                        </div>
                      )}
                    </div>
                    {depositPercent > 0 && depositPercent < 100 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                        <Lock className="w-3 h-3 text-primary/60 shrink-0" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Pagamento seguro — você só paga o restante quando o produto chegar na sua mão
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Calendar + time slots */}
                  {hasChosenPreorder && preorderConfig && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-primary" /> Data da encomenda
                        </Label>
                        <div className="flex justify-center overflow-x-auto">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={async (date) => {
                              setScheduledDate(date);
                              setScheduledTime("");
                              if (!date) {
                                setDailyLimitReached(false);
                                return;
                              }
                              await checkPreorderDailyLimit(date);
                            }}
                            locale={ptBR}
                            className="p-2 sm:p-3 pointer-events-auto rounded-xl border max-w-[calc(100vw-3rem)]"
                            disabled={(date) => {
                              const today = startOfDay(new Date());
                              const minDate = addHours(new Date(), preorderConfig.min_advance_hours);
                              const maxDate = addDays(today, preorderConfig.max_advance_days);
                              if (isBefore(date, startOfDay(minDate))) return true;
                              if (isAfter(date, maxDate)) return true;
                              const dayOfWeek = date.getDay();
                              if (preorderConfig.blocked_days?.includes(dayOfWeek)) return true;
                              const dateStr = format(date, "yyyy-MM-dd");
                              if (preorderConfig.blocked_dates?.includes(dateStr)) return true;
                              return false;
                            }}
                          />
                        </div>
                        {dailyLimitReached && (
                          <div className="flex items-center gap-1.5 text-[12px] text-destructive bg-destructive/10 px-3 py-2 rounded-lg animate-in fade-in-0 duration-200">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Limite de encomendas atingido para este dia. Escolha outra data.
                          </div>
                        )}
                        {dailyLimitChecking && (
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground px-3 py-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Verificando disponibilidade...
                          </div>
                        )}
                      </div>

                      {scheduledDate && preorderConfig.time_slots?.length > 0 && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" /> Horário
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {preorderConfig.time_slots.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setScheduledTime(slot)}
                                className={`px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                                  scheduledTime === slot
                                    ? "border-primary bg-primary/10 text-primary shadow-soft"
                                    : "border-border hover:border-primary/50 text-foreground"
                                }`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deposit summary — human-readable */}
                      {preorderConfig.deposit_percent > 0 && (
                        <div className="space-y-3 animate-fade-in">
                          {/* Order items */}
                          <div className="rounded-xl border border-border/50 bg-card p-3 sm:p-4 space-y-2">
                            <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <ClipboardList className="w-3.5 h-3.5" /> Seu pedido
                            </p>
                            <div className="space-y-1.5 text-[13px]">
                              {items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center gap-2 animate-stagger-in" style={{ animationDelay: `${i * 50}ms` }}>
                                  <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                                    <span className="relative shrink-0">
                                      <Package className="w-3 h-3 text-amber-600" />
                                    </span>
                                    <span className="truncate">{item.quantity}x {item.product.name}</span>
                                  </span>
                                  <span className="font-medium text-foreground shrink-0">{formatBRL(item.product.price * item.quantity)}</span>
                                </div>
                              ))}
                              <div className="border-t border-border/30 pt-1.5 flex justify-between text-foreground">
                                <span className="font-medium">Subtotal</span>
                                <span className="font-semibold">{formatBRL(subtotal)}</span>
                              </div>
                              {deliveryType === "delivery" && effectiveDeliveryFee > 0 && !preorderZeroFee && (
                                <div className="flex flex-col gap-0.5 text-muted-foreground">
                                  <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1.5">
                                      <Truck className="w-3 h-3 shrink-0" /> Frete
                                    </span>
                                    <span className="font-medium text-foreground">{formatBRL(appliedDeliveryFee)}</span>
                                  </div>
                                  {isPreorderCheckout && deliveryFeeMode === "on_delivery" && (
                                    <span className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg leading-tight">
                                      🚚 Frete de {formatBRL(effectiveDeliveryFee)} será cobrado quando você receber
                                    </span>
                                  )}
                                  {isPreorderCheckout && deliveryFeeMode === "full_upfront" && (
                                    <span className="text-[11px] text-primary bg-primary/10 px-2 py-1 rounded-lg leading-tight">
                                      ✅ Frete já incluído no valor que você paga agora
                                    </span>
                                  )}
                                </div>
                              )}
                              {deliveryType === "delivery" && preorderZeroFee && (
                                <div className="flex justify-between items-center text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <Truck className="w-3 h-3 shrink-0" /> Frete
                                  </span>
                                  <span className="text-[11px] text-emerald-600 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    ✅ Grátis na encomenda
                                  </span>
                                </div>
                              )}
                              {deliveryType === "delivery" && zoneBlocked && !needsNeighborhood && (
                                <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 px-2 py-1.5 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Entrega indisponível neste endereço
                                </div>
                              )}
                              {deliveryType === "delivery" && zoneMinOrderBlocked && zoneMatch.matched && (
                                <div className="space-y-1.5 animate-in fade-in-0 duration-200">
                                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1.5 rounded-lg">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    Pedido mínimo para {zoneMatch.zone?.label}: R$ {zoneMinOrder.toFixed(2).replace(".", ",")}
                                  </div>
                                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                      className="h-full rounded-full bg-amber-500 transition-all duration-700 ease-out"
                                      style={{ width: `${Math.min(100, (subtotal / zoneMinOrder) * 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground text-center font-medium">
                                    Faltam R$ {zoneMinOrderRemaining.toFixed(2).replace(".", ",")} para o mínimo da sua região
                                  </p>
                                </div>
                              )}
                              {deliveryType === "delivery" && needsNeighborhood && !zoneMatch.matched && (
                                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-1.5 rounded-lg">
                                  <Info className="w-3.5 h-3.5 shrink-0" />
                                  Preencha o bairro para verificarmos se entregamos na sua região
                                </div>
                              )}
                              <div className="border-t border-border/30 pt-1.5 flex justify-between font-bold text-foreground text-sm">
                                <span>Total do pedido</span>
                                <span>{formatBRL(total)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Payment explanation — ultra simple */}
                          <div className={`rounded-xl border-2 p-3 sm:p-4 space-y-3 transition-colors duration-200 ${
                            preorderAcknowledged
                              ? "bg-primary/5 border-primary/30 shadow-soft"
                              : "bg-accent/5 border-accent/30"
                          }`}>
                            <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" /> Pagamento
                            </p>
                            <div className="space-y-2.5 text-[13px]">
                              {/* Pay now — breakdown */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-primary flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    {depositPercent === 100 ? "Valor total" : "Você paga agora"}
                                  </span>
                                  <span className="text-lg font-extrabold text-primary animate-shimmer-value">{formatBRL(payNowTotal)}</span>
                                </div>
                                {depositPercent > 0 && depositPercent < 100 && (
                                  <div className="ml-6 space-y-0.5 text-[11px] text-muted-foreground">
                                    <div className="flex justify-between">
                                      <span>Entrada ({depositPercent}% de {formatBRL(subtotal)})</span>
                                      <span>{formatBRL(depositAmount)}</span>
                                    </div>
                                    {deliveryFeeMode === "full_upfront" && effectiveDeliveryFee > 0 && (
                                      <div className="flex justify-between">
                                        <span>+ Frete</span>
                                        <span>{formatBRL(effectiveDeliveryFee)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {preorderConfig.deposit_percent < 100 && (
                                <>
                                  {/* Progress bar */}
                                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary animate-progress-fill"
                                      style={{ width: `${Math.round((payNowTotal / total) * 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span className="font-semibold text-primary">{Math.round((payNowTotal / total) * 100)}% agora</span>
                                    <span>{Math.round((displayRemaining / total) * 100)}% quando receber</span>
                                  </div>

                                  {/* Remaining */}
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Clock className="w-4 h-4 shrink-0" />
                                      O resto quando {deliveryType === "delivery" ? "chegar" : "retirar"}
                                      {deliveryFeeMode === "on_delivery" && effectiveDeliveryFee > 0 && (
                                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">+ frete</span>
                                      )}
                                    </span>
                                    <span className="font-semibold text-foreground">{formatBRL(displayRemaining)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Notices */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50 border border-border/30">
                              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <p className="text-[12px] text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">Pode confiar!</strong> Sua reserva fica garantida e você só paga o restante quando receber o produto.
                              </p>
                            </div>

                            {preorderConfig.customer_notice && (
                              <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50 border border-border/30">
                                <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                  {preorderConfig.customer_notice}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {scheduledDate && scheduledTime && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl animate-scale-in">
                          <CalendarDays className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold text-primary">
                            {format(scheduledDate, "dd/MM")} às {scheduledTime}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {currentStepIndex > 0 && (
                      <Button type="button" variant="outline" onClick={goBack} className="h-12 rounded-xl px-4">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => {
                        if (!validateStep()) return;
                        if (hasChosenPreorder && depositPercent > 0 && !preorderAcknowledged) {
                          setShowPreorderConfirmDialog(true);
                          return;
                        }
                        goNext();
                      }}
                      className="flex-1 h-12 rounded-xl gap-2 text-sm font-bold gradient-primary shadow-soft hover:shadow-medium transition-all duration-300 min-w-0"
                    >
                      <span className="truncate">Continuar</span> <ChevronRight className="w-4 h-4 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══ STEP: Personal Data ═══ */}
              {formStep === 'dados' && (
                <div key="step-dados" className="animate-fade-in space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-lg">Seus dados</h3>
                    <p className="text-sm text-muted-foreground">Precisamos de algumas informações</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">Nome <span className="text-destructive">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          setInvalidFields(prev => { const n = new Set(prev); n.delete("name"); return n; });
                        }}
                        placeholder="Seu nome"
                        className={`h-12 text-base ${invalidFields.has("name") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : !formData.name.trim() ? "border-destructive/30 bg-destructive/5" : ""}`}
                      />
                      {invalidFields.has("name") && <p className="text-xs text-destructive">Informe seu nome</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">WhatsApp <span className="text-destructive">*</span></Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: formatPhone(e.target.value) });
                          setInvalidFields(prev => { const n = new Set(prev); n.delete("phone"); return n; });
                        }}
                        placeholder="(11) 99999-9999"
                        inputMode="tel"
                        className={`h-12 text-base ${invalidFields.has("phone") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : formData.phone.replace(/\D/g, "").length < 10 ? "border-destructive/30 bg-destructive/5" : ""}`}
                      />
                      {invalidFields.has("phone") && <p className="text-xs text-destructive">Informe um WhatsApp válido</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm flex items-center gap-1.5">
                        E-mail
                        <span className="text-[10px] font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">opcional</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setInvalidFields(prev => { const n = new Set(prev); n.delete("email"); return n; });
                        }}
                        placeholder="seu@email.com"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className={`h-12 text-base ${invalidFields.has("email") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : formData.email.trim() && !isValidEmail(formData.email) ? "border-destructive/30 bg-destructive/5" : ""}`}
                      />
                      {(invalidFields.has("email") || (formData.email.trim() && !isValidEmail(formData.email))) && (
                        <p className="text-xs text-destructive">Informe um e-mail válido (ex: nome@dominio.com)</p>
                      )}
                    </div>
                  </div>

                  {/* Security badge — delayed fade-in */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'backwards' }}>
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>Dados protegidos · usado apenas para este pedido</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {currentStepIndex > 0 && (
                      <Button type="button" variant="outline" onClick={goBack} className="h-12 px-4 rounded-xl gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => validateStep() && goNext()}
                      className="flex-1 h-12 rounded-xl gap-2 text-sm font-bold gradient-primary shadow-soft hover:shadow-medium transition-all duration-300"
                    >
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══ STEP: Address ═══ */}
              {formStep === 'endereco' && (
                <div key="step-endereco" className="animate-enter space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-lg">📍 Endereço de entrega</h3>
                    <p className="text-sm text-muted-foreground">Onde devemos entregar?</p>
                  </div>

                  {/* Address Book */}
                  <AddressSelector
                    storeId={storeId}
                    selectedAddressId={selectedSavedAddress?.id || null}
                    onEmpty={() => setAddressMode("new")}
                    onSelect={(addr) => {
                      setSelectedSavedAddress(addr);
                      setAddressMode("select");
                      setMapLockedFields([]);
                      setInvalidFields(new Set());
                      setFormData(prev => ({
                        ...prev,
                        cep: addr.cep || "", street: addr.street || "", number: addr.number || "",
                        complement: addr.complement || "", neighborhood: addr.neighborhood || "",
                        city: addr.city || "", state: addr.state || "", noNumber: !addr.number,
                        googleMapsUrl: addr.google_maps_url || "",
                        ...(() => { const c = extractCoordsFromMapsUrl(addr.google_maps_url || ""); return c ? { lat: c.lat, lng: c.lng } : { lat: null, lng: null }; })(),
                        name: addr.contact_name || prev.name,
                        phone: addr.contact_phone ? formatPhone(addr.contact_phone) : prev.phone,
                        email: addr.contact_email || prev.email,
                      }));
                      setCepFound(true);
                      setAddressRevealed(true);
                    }}
                    onNewAddress={() => {
                      setAddressMode("new");
                      setSelectedSavedAddress(null);
                      setMapLockedFields([]);
                      setFormData(prev => ({
                        ...prev, cep: "", street: "", number: "", complement: "",
                        neighborhood: "", city: "", state: "", noNumber: false, googleMapsUrl: "",
                      }));
                      setCepFound(null);
                      setAddressRevealed(false);
                    }}
                  />

                  {addressMode === "new" && (
                    <>
                      {/* MAP-FIRST Button */}
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all duration-300 group ${
                          hasMapLockedFields
                            ? "border-accent/50 bg-accent/10"
                            : "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          hasMapLockedFields ? "bg-accent/20" : "bg-primary/15 group-hover:bg-primary/25"
                        }`}>
                          {hasMapLockedFields ? <CheckCircle2 className="w-6 h-6 text-accent" /> : <MapPin className="w-6 h-6 text-primary" />}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {hasMapLockedFields ? "📍 Localização marcada!" : formData.googleMapsUrl.trim() ? "📍 Localização marcada!" : "🗺️ Marcar no Mapa"}
                          </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {hasMapLockedFields ? "Campos auto preenchidos ficaram protegidos" : formData.googleMapsUrl.trim() ? "Toque para alterar" : "📍 Entrega mais rápida e precisa — recomendado"}
                          </p>
                        </div>
                        {hasMapLockedFields ? (
                          <Lock className="w-4 h-4 text-accent flex-shrink-0" />
                        ) : formData.googleMapsUrl.trim() ? (
                          <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                        ) : (
                          <Navigation className="w-4 h-4 text-primary/60 flex-shrink-0" />
                        )}
                      </button>

                      {/* Map-locked badge */}
                      {hasMapLockedFields && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="text-xs font-medium text-accent">
                              Endereço via mapa • {mapLockedFields.length} campo{mapLockedFields.length > 1 ? "s" : ""} travado{mapLockedFields.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMapLockedFields([]);
                              setFormData(prev => ({ ...prev, googleMapsUrl: "" }));
                            }}
                            className="text-[11px] font-semibold text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                          >
                            Editar manualmente
                          </button>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium">ou digite o endereço</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      {/* CEP */}
                      <div className="space-y-2">
                        <Label htmlFor="cep" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          CEP <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="cep"
                              value={formData.cep}
                              readOnly={isFieldLocked("cep")}
                              onChange={(e) => {
                                handleCepChange(e.target.value);
                                setInvalidFields(prev => { const n = new Set(prev); n.delete("cep"); return n; });
                              }}
                              placeholder="00000-000"
                              maxLength={9}
                              inputMode="numeric"
                              className={`h-12 pr-10 text-base font-medium transition-all duration-300 ${
                                isFieldLocked("cep")
                                  ? "bg-accent/5 border-accent/40 cursor-not-allowed opacity-80"
                                  : invalidFields.has("cep")
                                  ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5"
                                  : !formData.googleMapsUrl.trim() && formData.cep.replace(/\D/g, "").length === 0
                                  ? "border-destructive/30 bg-destructive/5"
                                  : cepFound === true
                                  ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                                  : cepFound === false
                                  ? "border-destructive ring-2 ring-destructive/10"
                                  : "border-border"
                              }`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isFieldLocked("cep") && <Lock className="w-4 h-4 text-accent/60" />}
                              {!isFieldLocked("cep") && cepLoading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                              {!isFieldLocked("cep") && !cepLoading && cepFound === true && <CheckCircle2 className="w-4 h-4 text-accent" />}
                              {!isFieldLocked("cep") && !cepLoading && cepFound === false && <AlertCircle className="w-4 h-4 text-destructive" />}
                            </div>
                          </div>
                          {!isFieldLocked("cep") && (
                          <Button
                            type="button" variant="outline" size="icon"
                            onClick={handleGps} disabled={gpsLoading}
                            title="Usar minha localização"
                            className={`h-12 w-12 shrink-0 rounded-xl border-2 transition-all duration-300 ${
                              gpsStatus === "success" ? "border-accent bg-accent/10 text-accent"
                              : gpsStatus === "error" ? "border-destructive/40 text-destructive"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                            }`}
                          >
                            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                          </Button>
                          )}
                        </div>

                        {gpsLoading && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Obtendo localização…
                          </p>
                        )}
                        {!gpsLoading && gpsMessage && (
                          <p className={`text-xs flex items-center gap-1.5 ${gpsStatus === "success" ? "text-accent" : "text-destructive"}`}>
                            {gpsStatus === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {gpsMessage}
                          </p>
                        )}
                        {!gpsLoading && cepFound === true && !gpsMessage && (
                          <p className="text-xs text-accent flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> CEP encontrado!
                          </p>
                        )}
                        {cepFound === false && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> CEP não encontrado.
                          </p>
                        )}

                        {!isFieldLocked("cep") && (
                        <button
                          type="button"
                          onClick={() => { setShowCepSearch(!showCepSearch); setCepSearchResults([]); }}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          <Search className="w-3 h-3" />
                          {showCepSearch ? "Fechar busca" : "Não sei meu CEP"}
                        </button>
                        )}

                        {!isFieldLocked("cep") && showCepSearch && (
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-xs font-semibold text-primary">🔍 Buscar CEP pelo endereço</p>
                            <div className="grid grid-cols-3 gap-2">
                              <Input value={cepSearchUf} onChange={(e) => setCepSearchUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} className="h-10 uppercase text-center text-sm font-medium" />
                              <div className="col-span-2">
                                <Input value={cepSearchCity} onChange={(e) => setCepSearchCity(e.target.value)} placeholder="Cidade" className="h-10 text-sm" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Input value={cepSearchStreet} onChange={(e) => setCepSearchStreet(e.target.value)} placeholder="Rua / Logradouro" className="h-10 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && handleCepSearch()} />
                              <Button type="button" size="sm" onClick={handleCepSearch} disabled={cepSearchLoading} className="h-10 px-3 rounded-lg shrink-0">
                                {cepSearchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                            {cepSearchResults.length > 0 && (
                              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Selecione o CEP:</p>
                                {cepSearchResults.map((r, i) => (
                                  <button key={i} type="button" onClick={() => selectCepResult(r)} className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs">
                                    <span className="font-bold text-primary">{r.cep}</span>
                                    <span className="text-muted-foreground ml-2">{[r.logradouro, r.bairro, r.localidade, r.uf].filter(Boolean).join(", ")}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Address fields */}
                      {addressRevealed && (
                        <div className="space-y-3 animate-in slide-in-from-top-3 duration-300">
                          <div className="space-y-1.5">
                            <Label htmlFor="street" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Rua <span className="text-destructive">*</span>
                            </Label>
                            <Input id="street" value={formData.street} readOnly={isFieldLocked("street")} onChange={(e) => { if (isFieldLocked("street")) return; setFormData({ ...formData, street: e.target.value }); setInvalidFields(prev => { const n = new Set(prev); n.delete("street"); return n; }); }} placeholder="Rua das Flores" className={`h-11 ${isFieldLocked("street") ? "bg-accent/5 border-accent/40 cursor-not-allowed opacity-80" : invalidFields.has("street") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : !formData.street.trim() ? "border-destructive/30 bg-destructive/5" : cepFilledFields.includes("street") ? "border-accent/60 bg-accent/5 ring-1 ring-accent/20" : ""}`} />
                            {invalidFields.has("street") && <p className="text-xs text-destructive">Informe a rua</p>}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Número <span className="text-destructive">*</span>
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input id="number" value={formData.noNumber ? "S/N" : formData.number} onChange={(e) => { setFormData({ ...formData, number: e.target.value }); setInvalidFields(prev => { const n = new Set(prev); n.delete("number"); return n; }); }} placeholder="123" disabled={formData.noNumber} inputMode="numeric" className={`h-11 w-28 shrink-0 text-center font-medium text-base ${invalidFields.has("number") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : !formData.noNumber && !formData.number.trim() ? "border-destructive/30 bg-destructive/5" : ""}`} />
                              <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                                <Checkbox checked={formData.noNumber} onCheckedChange={(checked) => { setFormData({ ...formData, noNumber: Boolean(checked), number: "" }); setInvalidFields(prev => { const n = new Set(prev); n.delete("number"); return n; }); }} />
                                <span className="text-sm text-muted-foreground">Sem número (S/N)</span>
                              </label>
                            </div>
                            {invalidFields.has("number") && <p className="text-xs text-destructive">Informe o número</p>}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="neighborhood" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Bairro <span className="text-destructive">*</span>
                            </Label>
                            {hasNeighborhoodAutocomplete && !isFieldLocked("neighborhood") ? (
                              <div className="relative">
                                <Popover open={neighborhoodPopoverOpen} onOpenChange={setNeighborhoodPopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className={`flex items-center justify-between w-full h-11 rounded-md border px-3 text-sm text-left bg-background transition-colors ${
                                        invalidFields.has("neighborhood")
                                          ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5"
                                          : !formData.neighborhood.trim()
                                          ? "border-destructive/30 bg-destructive/5"
                                          : zoneMatch.matched && formData.neighborhood.trim()
                                          ? "border-green-500/60 ring-1 ring-green-500/20 bg-green-50 dark:bg-green-950/20"
                                          : ""
                                      }`}
                                    >
                                      <span className={formData.neighborhood ? "text-foreground" : "text-muted-foreground"}>
                                        {formData.neighborhood || "Selecione ou digite o bairro"}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {formData.neighborhood.trim() && zoneMatch.matched && (
                                          <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">
                                            ✓ Entregamos
                                          </span>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                      </div>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" sideOffset={4}>
                                    <Command>
                                      <CommandInput
                                        placeholder="Buscar bairro..."
                                        value={formData.neighborhood}
                                        onValueChange={(value) => {
                                          setFormData(prev => ({ ...prev, neighborhood: value }));
                                          setInvalidFields(prev => { const n = new Set(prev); n.delete("neighborhood"); return n; });
                                        }}
                                      />
                                      <CommandList>
                                        <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                                          Nenhum bairro encontrado
                                        </CommandEmpty>
                                        <CommandGroup heading="Bairros disponíveis">
                                          {availableNeighborhoods.map((name) => (
                                            <CommandItem
                                              key={name}
                                              value={name}
                                              onSelect={(val) => {
                                                setFormData(prev => ({ ...prev, neighborhood: val }));
                                                setInvalidFields(prev => { const n = new Set(prev); n.delete("neighborhood"); return n; });
                                                setNeighborhoodPopoverOpen(false);
                                              }}
                                              className="text-sm cursor-pointer"
                                            >
                                              <MapPin className="w-3.5 h-3.5 mr-2 text-primary/60" />
                                              {name}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              <Input id="neighborhood" value={formData.neighborhood} readOnly={isFieldLocked("neighborhood")} onChange={(e) => { if (isFieldLocked("neighborhood")) return; setFormData({ ...formData, neighborhood: e.target.value }); setInvalidFields(prev => { const n = new Set(prev); n.delete("neighborhood"); return n; }); }} placeholder="Centro" className={`h-11 ${isFieldLocked("neighborhood") ? "bg-accent/5 border-accent/40 cursor-not-allowed opacity-80" : invalidFields.has("neighborhood") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : !formData.neighborhood.trim() ? "border-destructive/30 bg-destructive/5" : cepFilledFields.includes("neighborhood") ? "border-accent/60 bg-accent/5 ring-1 ring-accent/20" : ""}`} />
                            )}
                            {invalidFields.has("neighborhood") && <p className="text-xs text-destructive">Informe o bairro</p>}
                            {!cepNeighborhoodValidation.consistent && (
                              <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 px-2 py-1.5 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {cepNeighborhoodValidation.message}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="complement" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              Complemento <span className="text-[10px] normal-case font-normal bg-secondary px-1.5 py-0.5 rounded">opcional</span>
                            </Label>
                            <Input id="complement" value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} placeholder="Apto 42, bloco B…" className="h-11" />
                          </div>

                          {!hasMapLockedFields && (
                          <div className="space-y-1.5">
                            <Label htmlFor="googleMapsUrl" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              Link Google Maps <span className="text-[10px] normal-case font-normal bg-secondary px-1.5 py-0.5 rounded">opcional</span>
                            </Label>
                            <Input id="googleMapsUrl" type="url" value={formData.googleMapsUrl} onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })} placeholder="Ou cole um link do Google Maps" className={`h-10 text-xs ${formData.googleMapsUrl.trim() && /^https?:\/\/(maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|www\.google\.\w+\/maps|google\.\w+\/maps)/i.test(formData.googleMapsUrl.trim()) ? "border-accent/60 ring-1 ring-accent/20 bg-accent/5" : ""}`} />
                          </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1.5">
                              <Label htmlFor="city" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cidade</Label>
                              <Input id="city" value={formData.city} readOnly={isFieldLocked("city")} onChange={(e) => { if (isFieldLocked("city")) return; setFormData({ ...formData, city: e.target.value }); }} placeholder="São Paulo" className={`h-11 ${isFieldLocked("city") ? "bg-accent/5 border-accent/40 cursor-not-allowed opacity-80" : cepFilledFields.includes("city") ? "border-accent/60 bg-accent/5 ring-1 ring-accent/20" : ""}`} />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="state" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">UF</Label>
                              <Input id="state" value={formData.state} readOnly={isFieldLocked("state")} onChange={(e) => { if (isFieldLocked("state")) return; setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) }); }} placeholder="SP" maxLength={2} className={`h-11 uppercase text-center font-medium ${isFieldLocked("state") ? "bg-accent/5 border-accent/40 cursor-not-allowed opacity-80" : cepFilledFields.includes("state") ? "border-accent/60 bg-accent/5 ring-1 ring-accent/20" : ""}`} />
                            </div>
                          </div>
                        </div>
                      )}

                      {!addressRevealed && !formData.googleMapsUrl.trim() && (
                        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-secondary/60 border border-border/50">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Use o <strong>mapa</strong> acima para localização rápida, ou digite o CEP.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {(() => {
                    const provider = store.checkoutProvider;
                    const mode = checkoutMode;
                    let icon = "💡";
                    let msg: React.ReactNode = null;
                    if (provider === "infinitypay" && mode !== "whatsapp") {
                      icon = "🔒";
                      msg = <>Seu endereço é salvo aqui. O pagamento é processado pela <strong>InfinityPay</strong> — ambiente seguro e protegido.</>;
                    } else if (provider === "mercadopago" && mode !== "whatsapp") {
                      icon = "🔒";
                      msg = <>Seu endereço é salvo aqui. Você será redirecionado ao <strong>Mercado Pago</strong> para pagar com segurança.</>;
                    } else if (mode === "both") {
                      msg = <>Seu endereço é salvo aqui. Você pode pagar online ou enviar pelo <strong>WhatsApp</strong> — como preferir.</>;
                    } else if (mode === "whatsapp") {
                      msg = <>Seu endereço é salvo aqui. Na próxima etapa, escolha como pagar e envie o pedido pelo <strong>WhatsApp</strong>.</>;
                    } else if (hasOnlineCheckout) {
                      icon = "🔒";
                      msg = <>Seu endereço é salvo aqui. Na tela de pagamento, <strong>apenas escolha a forma de pagamento</strong>.</>;
                    }
                    return msg ? (
                      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/70 rounded-lg px-3 py-2 animate-in fade-in-0 duration-300">
                        <span className="shrink-0 mt-0.5">{icon}</span>
                        <span>{msg}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Zone validation feedback */}
                  {storeHasZones && deliveryType === "delivery" && hasRelevantAddressData && (
                    zoneMatch.matched ? (
                      <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-accent/10 border border-accent/30 animate-in fade-in-0 duration-300">
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">✅ Entregamos na sua região!</p>
                          <p className="text-[10px] text-muted-foreground">{zoneMatch.zone?.label} — Taxa: R$ {zoneMatch.fee.toFixed(2).replace(".", ",")}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-in fade-in-0 duration-300">
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">Infelizmente não entregamos nessa região</p>
                          <p className="text-[10px] text-muted-foreground">
                            {pickupEnabled ? "Mas você pode retirar na loja!" : "Entre em contato para verificar disponibilidade."}
                          </p>
                        </div>
                        {pickupEnabled && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 text-[11px] h-7 rounded-lg border-destructive/40 hover:bg-destructive/10"
                            onClick={() => {
                              setDeliveryType("pickup");
                              setFormStep("delivery");
                              toast.success("Modo alterado para retirada!");
                            }}
                          >
                            Retirar na loja
                          </Button>
                        )}
                      </div>
                    )
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={goBack} className="h-12 px-4 rounded-xl gap-1.5">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (zoneBlocked) {
                          toast.error("Não entregamos nessa região. Escolha retirada ou altere o endereço.");
                          return;
                        }
                        if (zoneMinOrderBlocked) {
                          toast.error(`Pedido mínimo para sua região: R$ ${zoneMinOrder.toFixed(2).replace(".", ",")}. Faltam R$ ${zoneMinOrderRemaining.toFixed(2).replace(".", ",")}.`);
                          return;
                        }
                        validateStep() && goNext();
                      }}
                      disabled={zoneBlocked || zoneMinOrderBlocked}
                      className="flex-1 h-12 rounded-xl gap-2 text-sm font-bold gradient-primary shadow-soft hover:shadow-medium transition-all duration-300 disabled:opacity-50"
                    >
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══ STEP: Payment ═══ */}
              {formStep === 'pagamento' && (
                <form onSubmit={handleSubmit} key="step-pagamento" className="animate-fade-in space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-lg">Forma de pagamento</h3>
                    <p className="text-sm text-muted-foreground">Como deseja pagar?</p>
                  </div>

                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => {
                      setFormData({ ...formData, paymentMethod: value });
                      setInvalidFields(prev => { const n = new Set(prev); n.delete("change"); return n; });
                    }}
                    className="grid grid-cols-2 gap-2 sm:gap-3"
                  >
                    {(availablePayments.length > 0 ? availablePayments : [
                      { id: "pix", label: "PIX", icon: QrCode },
                      { id: "credit", label: "Crédito", icon: CreditCard },
                      { id: "debit", label: "Débito", icon: CreditCard },
                      { id: "cash", label: "Dinheiro", icon: Banknote },
                    ]).map((payment) => {
                      const Icon = payment.icon;
                      return (
                        <Label
                          key={payment.id}
                          htmlFor={payment.id}
                          className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.paymentMethod === payment.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value={payment.id} id={payment.id} className="sr-only" />
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          <span className="font-medium text-sm">{payment.label}</span>
                        </Label>
                      );
                    })}
                  </RadioGroup>

                  {formData.paymentMethod === "cash" && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="change" className="text-sm">Troco para quanto? <span className="text-destructive">*</span></Label>
                      <Input
                        id="change"
                        value={formData.change}
                        onChange={(e) => {
                          setFormData({ ...formData, change: e.target.value });
                          setInvalidFields(prev => { const n = new Set(prev); n.delete("change"); return n; });
                        }}
                        placeholder="Ex: 100"
                        className={`h-11 ${invalidFields.has("change") ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : formData.paymentMethod === "cash" && !formData.change.trim() ? "border-destructive/30 bg-destructive/5" : ""}`}
                      />
                      {invalidFields.has("change") && <p className="text-xs text-destructive">Informe o valor para troco</p>}
                      <p className="text-xs text-muted-foreground">
                        {cashGiven > 0 ? (
                          <>Você vai pagar com <strong>{formatBRL(cashGiven)}</strong> — troco de <strong>{formatBRL(changeToBring)}</strong>.</>
                        ) : (
                          "Digite quanto você vai pagar para calcular o troco."
                        )}
                      </p>
                    </div>
                  )}

                  {/* Observations */}
                  <div className="space-y-2">
                    <Label htmlFor="observations" className="text-sm flex items-center gap-1.5">
                      Observações <span className="text-[10px] font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">opcional</span>
                    </Label>
                    <Textarea id="observations" value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} placeholder="Alguma observação sobre o pedido?" rows={3} />
                  </div>

                   {/* Summary */}
                  <div className={`rounded-2xl p-4 sm:p-5 space-y-3 border shadow-soft ${isPreorderDeposit ? "bg-gradient-to-br from-primary/10 via-secondary to-primary/5 border-primary/30" : "bg-gradient-to-br from-secondary/80 via-secondary to-primary/5 border-border/30"}`}>
                    {/* Always show full order total first */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({items.length} itens)</span>
                      <span className="font-medium">{formatBRL(subtotal)}</span>
                    </div>
                    {deliveryType === "delivery" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          Taxa de entrega
                          {storeHasZones && zoneMatch.matched && (
                            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-medium">{zoneMatch.zone?.label}</span>
                          )}
                          {isPreorderDeposit && deliveryFeeMode === "on_delivery" && (
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full font-medium">na entrega</span>
                          )}
                          {isPreorderDeposit && deliveryFeeMode === "full_upfront" && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">incluída</span>
                          )}
                        </span>
                        {storeHasZones && !hasRelevantAddressData ? (
                          <span className="font-medium text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 animate-pulse" />
                            {deliveryHint && deliveryHint.type === "varies" ? (
                              <span>{formatBRL(deliveryHint.minFee)} ~ {formatBRL(deliveryHint.maxFee)}</span>
                            ) : (
                              <span>A calcular</span>
                            )}
                          </span>
                        ) : (
                          <span className="font-medium">{formatBRL(effectiveDeliveryFee)}</span>
                        )}
                      </div>
                    )}

                    {/* Total do pedido — always prominent */}
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-border/50">
                      <span>Total do pedido</span>
                      <span className="text-foreground">{formatBRL(total)}</span>
                    </div>

                    {isPreorderDeposit ? (
                      <>
                        <div className="pt-3 border-t border-primary/20 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-primary flex items-center gap-1.5">✅ Você paga agora</span>
                            <span className="text-lg sm:text-xl font-extrabold animate-shimmer-value">{formatBRL(payNowTotal)}</span>
                          </div>
                          {/* Proportion bar */}
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary animate-progress-fill"
                              style={{ width: `${Math.round((payNowTotal / total) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Agora: {Math.round((payNowTotal / total) * 100)}%</span>
                            <span>Depois: {Math.round((displayRemaining / total) * 100)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              🕐 Paga na {deliveryType === "delivery" ? "entrega" : "retirada"}
                              {deliveryFeeMode === "on_delivery" && effectiveDeliveryFee > 0 && (
                                <span className="text-[10px] bg-secondary px-1 py-0.5 rounded">inclui frete</span>
                              )}
                            </span>
                            <span className="text-sm font-semibold text-muted-foreground">{formatBRL(displayRemaining)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      null
                    )}
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 animate-in fade-in duration-300">
                    <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Finalização rápida em poucos toques
                    </p>
                  </div>

                  {/* Security badge — delayed fade */}
                  <div className="flex items-center justify-center gap-1.5 animate-secure-fade">
                    <Lock className="w-3 h-3 text-accent" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {store.checkoutProvider === "infinitypay" && checkoutMode !== "whatsapp"
                        ? "Processado pela InfinityPay · Dados protegidos"
                        : store.checkoutProvider === "mercadopago" && checkoutMode !== "whatsapp"
                          ? "Processado pelo Mercado Pago · Compra garantida"
                          : checkoutMode === "whatsapp"
                            ? "Pedido enviado direto para a loja"
                            : "Pagamento seguro e criptografado"}
                    </span>
                  </div>

                  {/* Preorder summary badge */}
                  {orderMode === "preorder" && scheduledDate && scheduledTime && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl mb-2 animate-fade-in">
                      <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          📅 Encomenda para {format(scheduledDate, "dd/MM")} às {scheduledTime}
                        </p>
                         {depositAmount > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Entrada: {formatBRL(depositAmount)}
                            {depositPercent < 100 && ` · Restante: ${formatBRL(displayRemaining)}`}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Online Payment CTA */}
                  <div className={`transition-all duration-200 overflow-hidden ${showOnlineButton ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
                    {hasOnlineCheckout && (
                      <Button
                        type="button"
                        size="lg"
                        className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold gap-3 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow hover:shadow-strong sm:hover:scale-[1.02] sm:active:scale-[0.98] transition-all duration-300 min-w-0 whitespace-normal animate-cta-pulse"
                        disabled={isOnlinePayment || isSubmitting}
                        onClick={handleOnlinePayment}
                      >
                        {isOnlinePayment ? (
                          <><Loader2 className="w-5 h-5 animate-spin" />Gerando link...</>
                        ) : orderMode === "preorder" && depositAmount > 0 && depositPercent < 100 ? (
                          <><Globe className="w-5 h-5" />Pagar {formatBRL(payNowTotal)} agora</>
                        ) : (
                          <><Globe className="w-5 h-5" />Pagar Online</>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* WhatsApp CTA */}
                  {showWhatsApp && (
                    <Button
                      type="submit"
                      size="lg"
                      className={`w-full h-14 sm:h-16 text-base sm:text-lg font-bold gap-3 rounded-2xl transition-all duration-300 min-w-0 whitespace-normal ${
                        showOnlineButton
                          ? "bg-secondary text-foreground border border-border hover:bg-secondary/80"
                          : "gradient-primary shadow-glow hover:shadow-strong sm:hover:scale-[1.02] sm:active:scale-[0.98]"
                      }`}
                      disabled={isSubmitting || isOnlinePayment}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />Processando...</>
                      ) : (
                      <><MessageCircle className="w-5 h-5" />{showOnlineButton ? "Enviar via WhatsApp" : isPreorderDeposit ? `Enviar Pedido · ${formatBRL(payNowTotal)} agora` : "Enviar Pedido via WhatsApp"}</>
                      )}
                    </Button>
                  )}

                  {/* Back */}
                  <Button type="button" variant="ghost" onClick={goBack} className="w-full gap-1.5 text-muted-foreground">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                </form>
              )}
            </div>
          </>
        ) : step === "waiting-payment" ? (
          /* ═══════════════════════════════════════════════
             WAITING PAYMENT — Transparency + Cancel
          ═══════════════════════════════════════════════ */
          <div className="py-8 px-5 text-center animate-scale-in">
            {/* Animated loading icon */}
            <div className="relative inline-block mb-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe className="w-7 h-7 text-primary" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-1.5">
              Aguardando pagamento
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
              Complete o pagamento na aba que abrimos.
            </p>

            {/* Card: Stock reservation */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-left mb-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">Itens reservados temporariamente</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O estoque foi reservado para você, mas só será confirmado após o pagamento. Caso não pague a tempo, outra pessoa poderá adquirir.
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Already paid? */}
            <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-left mb-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">Já efetuou o pagamento?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Aguarde! Esta tela atualiza automaticamente quando detectarmos a confirmação.
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown */}
            {countdown && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Expira em</span>
                  <span className={`text-base font-mono font-bold tabular-nums ${
                    countdown <= "05:00" ? "text-destructive" : "text-foreground"
                  }`}>
                    {countdown}
                  </span>
                </div>
              </div>
            )}

            {/* Order summary */}
            <div className="p-3 rounded-xl bg-secondary/80 border border-border/50 text-left mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Resumo</p>
              {orderMode === "preorder" && depositAmount > 0 && depositPercent < 100 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paga agora</span>
                    <span className="text-base font-bold text-primary">{formatBRL(depositAmount + (subtotal - depositBase) + effectiveDeliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Restante na {deliveryType === "delivery" ? "entrega" : "retirada"}</span>
                    <span>{formatBRL(depositBase - depositAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {items.length} {items.length === 1 ? "item" : "itens"}
                  </span>
                  <span className="text-base font-bold text-primary">{formatBRL(total)}</span>
                </div>
              )}
            </div>

            {/* Open Payment button */}
            {checkoutUrl && (
              <Button
                size="lg"
                className="w-full h-12 gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow hover:shadow-strong sm:hover:scale-[1.02] sm:active:scale-[0.98] transition-all duration-300 mb-3 min-w-0 whitespace-normal"
                onClick={() => window.open(checkoutUrl, "_blank")}
              >
                <Globe className="w-5 h-5" />
                Abrir Pagamento
              </Button>
            )}

            {/* Cancel order */}
            <button
              className="text-sm text-destructive/70 hover:text-destructive transition-colors mb-2 inline-flex items-center gap-1.5"
              onClick={async () => {
                if (!pendingCheckoutId) return;
                try {
                  await supabase.rpc("cancel_pending_checkout" as any, { p_checkout_id: pendingCheckoutId });
                  clearPendingCheckoutStorage();
                  setPendingCheckoutId(null);
                  setCheckoutExpiresAt(null);
                  setCheckoutUrl(null);
                  setStep("form");
                  toast.success("Pedido cancelado. Estoque liberado.");
                } catch (err) {
                  console.error("Cancel error:", err);
                  toast.error("Erro ao cancelar. Tente novamente.");
                }
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar pedido e liberar estoque
            </button>

            <br />

            <Button
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                clearPendingCheckoutStorage();
                setStep("form");
                setPendingCheckoutId(null);
                setCheckoutExpiresAt(null);
                setCheckoutUrl(null);
              }}
            >
              ← Voltar e tentar outro método
            </Button>
          </div>
        ) : step === "checkout-expired" ? (
          /* ═══════════════════════════════════════════════
             CHECKOUT EXPIRED — Clear warning
          ═══════════════════════════════════════════════ */
          <div className="py-12 px-6 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-3">
              Tempo esgotado
            </h2>
            <p className="text-muted-foreground mb-6 text-sm max-w-xs mx-auto leading-relaxed">
              O prazo para pagamento expirou. Se você já realizou o pagamento, entre em contato com a loja. Caso contrário, faça um novo pedido e pague o quanto antes para garantir seus itens.
            </p>

            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-left mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Importante:</strong> Se o pagamento já foi feito após o prazo, ele pode não ser registrado automaticamente. Fale com a loja para confirmar.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full h-12 rounded-xl gradient-primary shadow-glow hover:shadow-strong transition-all duration-300 gap-2"
                onClick={() => {
                  setStep("form");
                  setPendingCheckoutId(null);
                  setCheckoutExpiresAt(null);
                  setCheckoutUrl(null);
                }}
              >
                <ShoppingBag className="w-5 h-5" />
                Fazer Novo Pedido
              </Button>
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${sanitizeWhatsAppNumber(store.whatsapp)}?text=${encodeWhatsAppText("Olá! Fiz um pagamento mas o prazo expirou. Podem verificar?")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-secondary text-foreground border border-border hover:bg-secondary/80 text-sm font-semibold transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar com a loja
                </a>
              )}
            </div>
          </div>
        ) : step === "payment-failed" ? (
          /* ═══════════════════════════════════════════════
             PAYMENT FAILED
          ═══════════════════════════════════════════════ */
          <div className="py-12 px-6 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-3">
              Pagamento não concluído
            </h2>
            <p className="text-muted-foreground mb-8 text-sm max-w-xs mx-auto">
              O pagamento não foi confirmado. Você pode tentar novamente ou escolher outro método.
            </p>
            <div className="space-y-3">
              <Button className="w-full h-12 rounded-xl" onClick={() => { clearPendingCheckoutStorage(); setStep("form"); setPendingCheckoutId(null); setCheckoutExpiresAt(null); setCheckoutUrl(null); }}>
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={handleClose} className="text-sm">
                Cancelar pedido
              </Button>
            </div>
          </div>
        ) : step === "success-online" ? (
          /* ═══════════════════════════════════════════════
             SUCCESS ONLINE — Dopamine-hit neurodesign
          ═══════════════════════════════════════════════ */
          <div className="py-10 px-6 text-center animate-scale-in relative overflow-hidden">
            {/* CSS Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-confetti"
                  style={{
                    left: `${(i * 4.3) % 100}%`,
                    width: i % 3 === 0 ? "10px" : "8px",
                    height: i % 3 === 0 ? "10px" : "8px",
                    borderRadius: i % 2 === 0 ? "50%" : "2px",
                    backgroundColor: [
                      'hsl(var(--primary))', 'hsl(var(--accent))',
                      'hsl(48 96% 56%)', 'hsl(152 76% 52%)',
                      'hsl(322 81% 68%)', 'hsl(213 94% 68%)', 'hsl(263 70% 68%)'
                    ][i % 7],
                    animationDelay: `${(i * 0.12) % 2}s`,
                    animationDuration: `${2.2 + (i % 4) * 0.4}s`,
                  }}
                />
              ))}
            </div>

            {/* Pulsating success icon */}
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto shadow-glow-accent animate-float">
                <CheckCircle2 className="w-14 h-14 text-accent" />
              </div>
              {/* Rings */}
              <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary/20 animate-pulse-attention flex items-center justify-center">
                <PartyPopper className="w-4 h-4 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
              Pagamento Confirmado! 🎉
            </h2>
            <p className="text-accent font-semibold text-sm mb-1">
              Seu pedido foi recebido com sucesso
            </p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6 leading-relaxed">
              Estamos preparando tudo com carinho! Você receberá atualizações sobre o seu pedido.
            </p>

            {/* Order details card */}
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-4 mb-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/10 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Seu pedido está na fila</p>
                  <p className="text-sm font-semibold text-foreground">
                    {store.estimatedTime ? `Previsão: ${store.estimatedTime}` : "Em preparação"}
                  </p>
                </div>
              </div>
            </div>

            {/* Stock priority badge */}
            <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Estoque reservado com prioridade no momento do pagamento
            </div>

            {/* Comprovante WhatsApp opcional */}
            {store.whatsapp && (
              <div className="p-3 rounded-xl bg-secondary border border-border mb-4 text-left">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  📎 <strong>Opcional:</strong> Envie o comprovante pelo WhatsApp para agilizar seu atendimento.
                </p>
                <a
                  href={`https://wa.me/${sanitizeWhatsAppNumber(store.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  <MessageCircle className="w-3 h-3" /> Enviar comprovante
                </a>
              </div>
            )}

            {/* Save Address Prompt */}
            {showSavePrompt && pendingAddressToSave && (
              <SaveAddressPrompt
                storeId={storeId}
                address={pendingAddressToSave}
                onSaved={() => { setShowSavePrompt(false); setPendingAddressToSave(null); }}
                onSkip={() => { setShowSavePrompt(false); setPendingAddressToSave(null); }}
              />
            )}

            {/* Social proof + reciprocity */}
            <p className="text-xs text-muted-foreground mb-6">
              Obrigado por escolher a <strong>{store.name}</strong>! 💛
            </p>

            {/* CTAs */}
            <div className="space-y-3">
              <Button
                onClick={handleClose}
                size="lg"
                className="w-full h-12 gap-2 rounded-xl gradient-primary shadow-glow hover:shadow-strong transition-all duration-300"
              >
                <ShoppingBag className="w-5 h-5" />
                Continuar Comprando
              </Button>
            </div>
          </div>
        ) : step === "register-prompt" ? (
          /* ═══════════════════════════════════════════════
             REGISTRATION PROMPT
          ═══════════════════════════════════════════════ */
          <div className="py-8 px-6 text-center animate-scale-in">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto shadow-glow-accent">
                <CheckCircle2 className="w-10 h-10 text-accent" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/30 animate-pulse-attention" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2">
              Pedido Enviado! 🎉
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Seu pedido foi enviado para o WhatsApp da loja.
            </p>

            {/* Registration CTA Card */}
            <div className="bg-gradient-to-br from-primary/10 via-card to-accent/5 rounded-2xl p-5 border border-primary/20 shadow-soft mb-6 text-left">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-warning" />
                    Quer acompanhar seus pedidos?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie uma senha rápida e acesse seu histórico de pedidos a qualquer momento. Leva só 5 segundos!
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="quick-password" className="text-xs text-muted-foreground">
                        Crie uma senha (mínimo 4 caracteres)
                      </Label>
                      <Input
                        id="quick-password"
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••"
                        className="h-11"
                        onKeyDown={(e) => e.key === "Enter" && handleQuickRegister()}
                      />
                    </div>
                    <Button
                      onClick={handleQuickRegister}
                      disabled={isRegistering || registerPassword.length < 4}
                      className="w-full h-12 gap-2 rounded-xl gradient-primary shadow-soft hover:shadow-medium transition-all"
                    >
                      {isRegistering ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Cadastrando...</>
                      ) : (
                        <><User className="w-4 h-4" />Criar Conta e Ver Pedidos</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Ver histórico</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                <span>Repetir pedidos</span>
              </div>
            </div>

            <button onClick={skipRegistration} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
              Agora não, obrigado
            </button>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════
             SUCCESS WHATSAPP — Classic celebration
          ═══════════════════════════════════════════════ */
          <div className="py-12 px-6 text-center animate-scale-in relative overflow-hidden">
            {/* CSS Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['hsl(var(--primary))', 'hsl(var(--accent))', '#fbbf24', '#34d399', '#f472b6', '#60a5fa'][i % 6],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto shadow-glow-accent animate-float">
                <CheckCircle2 className="w-12 h-12 text-accent" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/30 animate-pulse-attention" />
              <div className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-accent/40 animate-float" style={{ animationDelay: '0.5s' }} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
              {customer ? "Pedido Enviado! 🎉" : "Tudo Certo! 🎉"}
            </h2>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
              Seu pedido foi enviado para o WhatsApp da loja.
              <br />
              <span className="text-primary font-medium">Aguarde a confirmação!</span>
            </p>

            {/* Stock transparency notice for WhatsApp orders */}
            <div className="p-3 rounded-xl bg-secondary/80 border border-border text-left mb-4">
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">📦</span>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">Sobre produtos com estoque controlado</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O estoque é reservado automaticamente quando o lojista <strong>confirmar seu pedido</strong>. Pedidos pagos online têm prioridade de reserva imediata.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Address Prompt */}
            {showSavePrompt && pendingAddressToSave && (
              <SaveAddressPrompt
                storeId={storeId}
                address={pendingAddressToSave}
                onSaved={() => { setShowSavePrompt(false); setPendingAddressToSave(null); }}
                onSkip={() => { setShowSavePrompt(false); setPendingAddressToSave(null); }}
              />
            )}

            <p className="text-xs text-muted-foreground mb-8">
              Obrigado por comprar com a gente! 💛
            </p>
            <Button
              onClick={handleClose}
              size="lg"
              className="gap-3 px-8 h-12 rounded-xl gradient-primary shadow-soft hover:shadow-medium transition-all duration-300"
            >
              <CheckCircle2 className="w-5 h-5" />
              Entendido
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Location Picker Modal */}
    <Suspense fallback={null}>
      {showLocationPicker && (
        <LocationPickerModal
          open={showLocationPicker}
          onOpenChange={setShowLocationPicker}
          onConfirm={(url, addressText, structured) => {
            const filled: AddressLockField[] = [];
            const mapStreet = structured?.street?.trim() || "";
            const mapNeighborhood = structured?.neighborhood?.trim() || "";
            const mapCity = structured?.city?.trim() || "";
            const mapState = structured?.state?.trim() || "";
            const mapCep = structured?.cep?.trim() || "";
            const fallbackStreet =
              mapStreet ||
              structured?.displayAddress?.split(",")[0]?.trim() ||
              addressText?.split(",")[0]?.trim() ||
              "";

            setFormData(prev => {
              const next = { ...prev, googleMapsUrl: url, lat: structured?.lat ?? null, lng: structured?.lng ?? null };
              if (fallbackStreet) { next.street = fallbackStreet; filled.push("street"); }
              if (mapNeighborhood) { next.neighborhood = mapNeighborhood; filled.push("neighborhood"); }
              if (mapCity) { next.city = mapCity; filled.push("city"); }
              if (mapState) { next.state = mapState; filled.push("state"); }
              if (mapCep) { next.cep = mapCep; filled.push("cep"); }
              return next;
            });

            const hasAddressSignal = filled.length > 0;
            if (hasAddressSignal) {
              if (mapCep) setCepFound(true);
              setAddressRevealed(true);
              setMapLockedFields([...new Set(filled)]);
              setCepFilledFields(filled);
              setTimeout(() => setCepFilledFields([]), 2500);
              setInvalidFields(prev => {
                const next = new Set(prev);
                filled.forEach((field) => next.delete(field));
                return next;
              });
              setTimeout(() => {
                document.getElementById("number")?.focus();
              }, 400);
            } else {
              setMapLockedFields([]);
            }

            const cepDigits = mapCep.replace(/\D/g, "");
            if (cepDigits.length === 8 && (!fallbackStreet || !mapNeighborhood)) {
              void fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
                .then((res) => res.json())
                .then((data) => {
                  if (data?.erro) return;
                  const viaFilled: AddressLockField[] = [];
                  setFormData((prev) => {
                    const next = { ...prev };
                    if (!next.street && data.logradouro) { next.street = data.logradouro; viaFilled.push("street"); }
                    if (!next.neighborhood && data.bairro) { next.neighborhood = data.bairro; viaFilled.push("neighborhood"); }
                    if (!next.city && data.localidade) { next.city = data.localidade; viaFilled.push("city"); }
                    if (!next.state && data.uf) { next.state = data.uf; viaFilled.push("state"); }
                    return next;
                  });
                  if (viaFilled.length > 0) {
                    setMapLockedFields((prev) => [...new Set([...prev, ...viaFilled])]);
                    setCepFilledFields((prev) => [...new Set([...prev, ...viaFilled])]);
                    setTimeout(() => setCepFilledFields([]), 2500);
                    setInvalidFields((prev) => {
                      const next = new Set(prev);
                      viaFilled.forEach((field) => next.delete(field));
                      return next;
                    });
                  }
                })
                .catch(() => undefined);
            }
          }}
        />
      )}
    </Suspense>

    {/* Preorder Confirmation Dialog — Premium Neurodesign */}
    <AlertDialog open={showPreorderConfirmDialog} onOpenChange={setShowPreorderConfirmDialog}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[420px] max-h-[85vh] rounded-2xl p-0 overflow-hidden border-0 shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.25)]">
        {/* Header with gradient accent bar */}
        <div className="h-1.5 w-full gradient-primary" />
        <AlertDialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft animate-scale-in shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <AlertDialogTitle className="text-base sm:text-lg font-extrabold tracking-tight">
                Confirme sua encomenda
              </AlertDialogTitle>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Confira tudo direitinho antes de confirmar</p>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription asChild>
          <div className="px-4 sm:px-5 pb-2 space-y-3 overflow-y-auto max-h-[calc(85vh-200px)]">
            {/* Block 1 — Order summary */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-secondary/60 border-b border-border/40">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seu pedido</span>
              </div>
              <div className="px-3 sm:px-3.5 py-2.5 sm:py-3 space-y-2">
                {/* Item list */}
                {items.map((item, idx) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between gap-2 animate-stagger-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] font-medium truncate">{item.quantity}x {item.product.name}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 whitespace-nowrap shrink-0">
                        <Package className="w-2.5 h-2.5" /> Encomenda
                      </span>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums whitespace-nowrap shrink-0">{formatBRL(item.product.price * item.quantity)}</span>
                  </div>
                ))}

                {/* Subtotal */}
                <div className="border-t border-border/30 pt-2 flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatBRL(subtotal)}</span>
                </div>

                {/* Delivery fee */}
                {effectiveDeliveryFee > 0 && (
                  <div className="flex flex-col gap-1 text-[13px]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Frete</span>
                      </div>
                      <span className="font-semibold">{formatBRL(effectiveDeliveryFee)}</span>
                    </div>
                    {deliveryFeeMode === "on_delivery" && (
                      <span className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg leading-tight">
                        🚚 Frete cobrado só quando você receber
                      </span>
                    )}
                    {deliveryFeeMode === "full_upfront" && (
                      <span className="text-[11px] text-primary bg-primary/10 px-2 py-1 rounded-lg leading-tight">
                        ✅ Já incluído no valor que você paga agora
                      </span>
                    )}
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-border/40 pt-2 flex justify-between">
                  <span className="text-[13px] font-bold">Total do pedido</span>
                  <span className="text-sm sm:text-base font-extrabold">{formatBRL(total)}</span>
                </div>
              </div>
            </div>

            {/* Block 2 — Payment explanation (ultra-simple) */}
            <div className="rounded-xl border-2 border-primary/25 bg-primary/[0.03] overflow-hidden">
              <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-primary/[0.06] border-b border-primary/15">
                <span className="text-[11px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Como funciona o pagamento</span>
              </div>
              <div className="px-3 sm:px-3.5 py-2.5 sm:py-3 space-y-3">
                {/* Pay now — hero value */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[13px] sm:text-sm font-bold text-primary">
                      {depositPercent === 100 ? "Valor total agora" : "Você paga agora"}
                    </span>
                  </div>
                  <span className="text-lg font-extrabold text-primary animate-shimmer-value">{formatBRL(payNowTotal)}</span>
                </div>

                {/* Progress bar */}
                {displayRemaining > 0 && (
                  <>
                    <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full gradient-primary animate-progress-fill"
                        style={{ width: `${Math.round((payNowTotal / (payNowTotal + displayRemaining)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground -mt-1">
                      <span className="font-semibold text-primary">{Math.round((payNowTotal / (payNowTotal + displayRemaining)) * 100)}% agora</span>
                      <span>{Math.round((displayRemaining / (payNowTotal + displayRemaining)) * 100)}% quando receber</span>
                    </div>
                  </>
                )}

                {/* Remaining */}
                {displayRemaining > 0 && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-[13px] sm:text-sm font-medium text-muted-foreground">
                        O resto quando {deliveryType === "delivery" ? "chegar" : "retirar"}
                        {deliveryFeeMode === "on_delivery" && effectiveDeliveryFee > 0 && (
                          <span className="text-[10px] ml-1 text-muted-foreground/70">(+ frete)</span>
                        )}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatBRL(displayRemaining)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contextual notices */}
            <div className="space-y-2">
              {/* Scheduled date */}
              {scheduledDate && (
                <div className="flex items-center gap-2 rounded-lg bg-secondary/60 border border-border/40 px-3 py-2 animate-stagger-in" style={{ animationDelay: "100ms" }}>
                  <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[12px] sm:text-xs text-muted-foreground leading-relaxed">
                    Encomenda para <strong className="text-foreground">{format(scheduledDate, "dd/MM/yyyy", { locale: ptBR })}</strong>
                    {scheduledTime && <> às <strong className="text-foreground">{scheduledTime}</strong></>}
                  </span>
                </div>
              )}

              {/* Trust badge */}
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 animate-stagger-in" style={{ animationDelay: "150ms" }}>
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-[12px] sm:text-xs text-foreground/80 leading-relaxed">
                  <strong>Pode confiar!</strong> Sua reserva fica garantida. Caso precise cancelar, é só falar com a gente.
                </span>
              </div>

              {/* Admin customer notice */}
              {preorderConfig?.customer_notice && (
                <div className="flex items-start gap-2 rounded-lg bg-secondary/60 border border-border/40 px-3 py-2 animate-stagger-in" style={{ animationDelay: "200ms" }}>
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-[12px] sm:text-xs text-foreground/80 leading-relaxed">{preorderConfig.customer_notice}</span>
                </div>
              )}

              {/* WhatsApp confirmation notice */}
              <div className="flex items-start gap-2 rounded-lg bg-secondary/60 border border-border/40 px-3 py-2 animate-stagger-in" style={{ animationDelay: "250ms" }}>
                <MessageCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="text-[12px] sm:text-xs text-muted-foreground leading-relaxed">
                  Vamos confirmar tudo pelo WhatsApp rapidinho!
                </span>
              </div>
            </div>
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
          <AlertDialogAction
            onClick={() => {
              setPreorderAcknowledged(true);
              setShowPreorderConfirmDialog(false);
              goNext();
            }}
            className="w-full h-auto min-h-[48px] py-3 rounded-xl gradient-primary shadow-soft font-bold text-[13px] sm:text-sm gap-2 transition-all duration-200 hover:shadow-[0_8px_25px_-5px_hsl(var(--primary)/0.4)] hover:scale-[1.01] active:scale-[0.99] min-w-0 whitespace-normal text-center leading-tight"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Entendi, quero pagar {formatBRL(payNowTotal)}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full h-10 rounded-xl mt-0 text-muted-foreground">
            Revisar pedido
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
