import { useState, useEffect, useCallback } from "react";
import { CustomerAddressInfo } from "@/hooks/useCustomerOrders";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Briefcase, MapPin, Check, Plus, Trash2, Star, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface AddressSelectorProps {
  storeId: string;
  onSelect: (address: CustomerAddressInfo) => void;
  onNewAddress: () => void;
  selectedAddressId?: string | null;
  onEmpty?: () => void;
}

const LABEL_ICONS: Record<string, typeof Home> = {
  "casa": Home,
  "trabalho": Briefcase,
};

function getIcon(label: string) {
  const Icon = LABEL_ICONS[label.toLowerCase()] || MapPin;
  return Icon;
}

export function AddressSelector({ storeId, onSelect, onNewAddress, selectedAddressId, onEmpty }: AddressSelectorProps) {
  const { listAddresses, deleteAddress, setDefaultAddress } = useCustomerAuth();
  const [addresses, setAddresses] = useState<CustomerAddressInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [userClickedNew, setUserClickedNew] = useState(false);

  const handleNewAddress = () => {
    setUserClickedNew(true);
    onNewAddress();
  };

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAddresses(storeId);
      setAddresses(result);
      // Auto-select default if nothing selected AND user didn't click "new"
      if (!selectedAddressId && !userClickedNew && result.length > 0) {
        const defaultAddr = result.find(a => a.is_default) || result[0];
        onSelect(defaultAddr);
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, listAddresses, selectedAddressId, onSelect, userClickedNew]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await deleteAddress(id);
    if (result.success) {
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success("Endereço removido");
    } else {
      toast.error(result.error || "Erro ao remover");
    }
  };

  const handleSetDefault = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await setDefaultAddress(id);
    if (result.success) {
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
      toast.success("Endereço principal definido");
    }
  };

  // Notify parent when no addresses exist
  useEffect(() => {
    if (!loading && addresses.length === 0) {
      onEmpty?.();
    }
  }, [loading, addresses.length, onEmpty]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando endereços...</span>
      </div>
    );
  }

  if (addresses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground flex-1">
          Endereços salvos ({addresses.length})
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          {addresses.map((addr) => {
            const Icon = getIcon(addr.label || "");
            const isSelected = selectedAddressId === addr.id;
            const numPart = addr.number || "S/N";
            const line1 = `${addr.street}, ${numPart}`;
            const line2 = [addr.neighborhood, addr.city && addr.state ? `${addr.city}/${addr.state}` : addr.city].filter(Boolean).join(" — ");
            const contactLine = [addr.contact_name, addr.contact_phone ? `📱 ${addr.contact_phone}` : ""].filter(Boolean).join(" • ");
            const hasMap = !!addr.google_maps_url;

            return (
              <button
                key={addr.id}
                type="button"
                onClick={() => onSelect(addr)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 relative group ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {addr.label || "Endereço"}
                      </span>
                      {addr.is_default && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{line1}</p>
                    {line2 && <p className="text-[11px] text-muted-foreground/70 truncate">{line2}</p>}
                    {contactLine && <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{contactLine}</p>}
                    {hasMap && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" /> Link do Maps salvo
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 animate-in zoom-in-50 duration-200">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Action buttons on hover */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!addr.is_default && (
                    <button
                      type="button"
                      onClick={(e) => handleSetDefault(e, addr.id!)}
                      className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Definir como principal"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, addr.id!)}
                    className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            );
          })}

          {/* New address button */}
          <button
            type="button"
            onClick={handleNewAddress}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] text-sm font-medium text-muted-foreground hover:text-primary transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo endereço
          </button>
        </div>
      )}
    </div>
  );
}

// ── Save Address Prompt (shown after successful order) ──

interface SaveAddressPromptProps {
  storeId: string;
  address: CustomerAddressInfo;
  onSaved: () => void;
  onSkip: () => void;
}

export function SaveAddressPrompt({ storeId, address, onSaved, onSkip }: SaveAddressPromptProps) {
  const { saveAddress } = useCustomerAuth();
  const presets = ["Casa", "Trabalho"];
  const initialLabel = address.label && presets.includes(address.label) ? address.label : "Casa";
  const [label, setLabel] = useState(initialLabel);
  const [customLabel, setCustomLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const isOther = !presets.includes(label) || label === "Outro";
  const effectiveLabel = isOther ? (customLabel.trim() || "Outro") : label;

  const handleSave = async () => {
    setSaving(true);
    const result = await saveAddress(storeId, { ...address, label: effectiveLabel });
    setSaving(false);
    if (result.success) {
      toast.success("Endereço salvo! 🏠");
      onSaved();
    } else {
      toast.error(result.error || "Erro ao salvar");
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Salvar este endereço?</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Próxima vez, basta 1 toque para selecionar!
      </p>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Apelido</Label>
        <div className="flex gap-2">
          {["Casa", "Trabalho", "Outro"].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { setLabel(opt); if (opt !== "Outro") setCustomLabel(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (opt === "Outro" ? isOther : label === opt)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {isOther && (
          <Input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Ex: Casa da vó, Escritório..."
            className="h-9 text-sm"
            autoFocus
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-9 gap-1.5 rounded-lg">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip} className="h-9 text-xs text-muted-foreground">
          Não, obrigado
        </Button>
      </div>
    </div>
  );
}
