import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPinOff, Search, Store, MessageCircle, ChevronRight, MapPin, AlertTriangle } from "lucide-react";
import type { DeliveryZone } from "@/lib/deliveryZones";

interface NeighborhoodOption {
  name: string;
  label: string;
}

interface ZoneNotCoveredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Neighborhood detected by GPS / CEP (may be empty) */
  detected?: string;
  zones: DeliveryZone[];
  pickupEnabled?: boolean;
  whatsapp?: string;
  storeName?: string;
  /** Reason shown to the customer */
  reason?: "not_covered" | "cep_mismatch" | "change";
  onSelectNeighborhood: (name: string) => void;
  onChoosePickup?: () => void;
}

export function ZoneNotCoveredModal({
  open,
  onOpenChange,
  detected,
  zones,
  pickupEnabled,
  whatsapp,
  storeName,
  reason = "not_covered",
  onSelectNeighborhood,
  onChoosePickup,
}: ZoneNotCoveredModalProps) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    if (open) {
      setPending(null);
      setConfirmExit(false);
      setQuery("");
    }
  }, [open]);

  const neighborhoods = useMemo<NeighborhoodOption[]>(() => {
    const list: NeighborhoodOption[] = [];
    zones
      .filter((z) => z.is_active && z.zone_type === "neighborhood")
      .forEach((z) => {
        const names: string[] = (z.config as any)?.names || (z.config as any)?.neighborhoods || [];
        names.forEach((n) => {
          if (!list.some((i) => i.name.toLowerCase() === n.toLowerCase())) {
            list.push({ name: n, label: z.label });
          }
        });
      });
    return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [zones]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return neighborhoods;
    return neighborhoods.filter((n) => n.name.toLowerCase().includes(q));
  }, [neighborhoods, query]);

  const handleWhatsapp = () => {
    if (!whatsapp) return;
    const msg = encodeURIComponent(
      `Olá! Tentei fazer um pedido na ${storeName || "loja"} e meu bairro${detected ? ` (${detected})` : ""} não apareceu como área de entrega. Vocês entregam aqui?`
    );
    window.open(`https://wa.me/${whatsapp}?text=${msg}`, "_blank");
  };

  // Intercept every close attempt → ask for confirmation first
  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (confirmExit) {
      onOpenChange(false);
      return;
    }
    setPending(null);
    setConfirmExit(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        {/* ── Confirm chosen neighborhood ── */}
        {pending ? (
          <div className="p-6 text-center animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Confirmar bairro?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vamos entregar no bairro <strong className="text-foreground">{pending}</strong>. Está certo?
            </p>
            <div className="mt-5 space-y-2">
              <Button
                type="button"
                className="w-full h-12 rounded-xl font-bold"
                onClick={() => {
                  onSelectNeighborhood(pending);
                  setPending(null);
                  setConfirmExit(true);
                  onOpenChange(false);
                }}
              >
                Sim, é esse bairro
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 rounded-xl"
                onClick={() => setPending(null)}
              >
                Escolher outro
              </Button>
            </div>
          </div>
        ) : confirmExit ? (
          /* ── Confirm exit without choosing ── */
          <div className="p-6 text-center animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Sair sem escolher o bairro?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sem um bairro atendido não conseguimos finalizar a entrega do seu pedido.
            </p>
            <div className="mt-5 space-y-2">
              <Button
                type="button"
                className="w-full h-12 rounded-xl font-bold"
                onClick={() => setConfirmExit(false)}
              >
                Continuar escolhendo
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 rounded-xl text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                Sair mesmo assim
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`p-5 border-b ${reason === "change" ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${reason === "change" ? "bg-primary/15" : "bg-destructive/15"}`}>
                  {reason === "change" ? <MapPin className="w-5 h-5 text-primary" /> : <MapPinOff className="w-5 h-5 text-destructive" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground leading-tight">
                    {reason === "change"
                      ? "Escolha seu bairro"
                      : reason === "cep_mismatch"
                      ? "O CEP não bate com o bairro"
                      : "Ainda não entregamos aí"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reason === "change" ? (
                      <>Toque no seu bairro para atualizar a entrega.</>
                    ) : reason === "cep_mismatch" ? (
                      <>Confira o CEP ou escolha o bairro certo na lista abaixo.</>
                    ) : detected ? (
                      <>
                        A localização encontrou <strong className="text-foreground">{detected}</strong>, que está
                        fora da nossa área. Escolha seu bairro na lista:
                      </>
                    ) : (
                      <>Seu endereço está fora da nossa área de entrega. Escolha seu bairro na lista:</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Neighborhood list */}
            <div className="p-4 space-y-3">
              {neighborhoods.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    autoFocus={false}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar bairro..."
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto space-y-2 overscroll-contain">
                {filtered.map((n) => (
                  <button
                    key={n.name}
                    type="button"
                    onClick={() => setPending(n.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.99] text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{n.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{n.label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum bairro encontrado com esse nome.
                  </p>
                )}
              </div>
            </div>

            {/* Alternatives */}
            <div className="p-4 pt-0 space-y-2">
              {pickupEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl gap-2"
                  onClick={() => {
                    onChoosePickup?.();
                    setConfirmExit(true);
                    onOpenChange(false);
                  }}
                >
                  <Store className="w-4 h-4" />
                  Prefiro retirar na loja
                </Button>
              )}
              {whatsapp && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11 rounded-xl gap-2 text-muted-foreground"
                  onClick={handleWhatsapp}
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar com a loja no WhatsApp
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
