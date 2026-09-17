import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Map, Hash, X, GripVertical } from "lucide-react";
import { useDeliveryZones, useCreateDeliveryZone, useUpdateDeliveryZone, useDeleteDeliveryZone } from "@/hooks/useDeliveryZones";
import type { DeliveryZone } from "@/lib/deliveryZones";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeliveryZonesEditorProps {
  storeId: string;
  zoneEnabled: boolean;
  setZoneEnabled: (v: boolean) => void;
  storeAddress?: string;
}

const ZONE_COLORS: Record<string, string> = {
  radius: "#22c55e",
  neighborhood: "#3b82f6",
  cep: "#f59e0b",
};

export function DeliveryZonesEditor({ storeId, zoneEnabled, setZoneEnabled, storeAddress }: DeliveryZonesEditorProps) {
  const { data: zones = [], isLoading } = useDeliveryZones(storeId);
  const createZone = useCreateDeliveryZone();
  const updateZone = useUpdateDeliveryZone();
  const deleteZone = useDeleteDeliveryZone();

  const [addingType, setAddingType] = useState<string | null>(null);

  const handleAdd = async (type: string) => {
    setAddingType(null);
    const defaultConfigs: Record<string, any> = {
      radius: { lat: -23.5505, lng: -46.6333, radius_km: 5 },
      neighborhood: { names: [] },
      cep: { prefixes: [] },
    };
    const labels: Record<string, string> = {
      radius: "Zona por Raio",
      neighborhood: "Zona por Bairro",
      cep: "Zona por CEP",
    };
    await createZone.mutateAsync({
      store_id: storeId,
      zone_type: type as any,
      label: labels[type] || "Nova Zona",
      delivery_fee: 5,
      config: defaultConfigs[type] || {},
      sort_order: zones.length,
      is_active: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Enable switch */}
      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Zonas de Entrega</p>
          <p className="text-xs text-muted-foreground">Restrinja e precifique entrega por região</p>
        </div>
        <Switch checked={zoneEnabled} onCheckedChange={setZoneEnabled} />
      </div>

      {zoneEnabled && (
        <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {isLoading ? (
            <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
          ) : zones.length === 0 ? (
            <div className="text-center py-8 rounded-xl border-2 border-dashed border-border">
              <Map className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma zona configurada</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione zonas para controlar onde você entrega</p>
            </div>
          ) : (
            zones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                storeId={storeId}
                onUpdate={(updates) => updateZone.mutate({ id: zone.id, ...updates })}
                onDelete={() => deleteZone.mutate({ id: zone.id, storeId })}
              />
            ))
          )}

          {/* Add zone button */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleAdd("radius")}
              disabled={createZone.isPending}
            >
              <MapPin className="w-3.5 h-3.5" style={{ color: ZONE_COLORS.radius }} />
              + Raio
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleAdd("neighborhood")}
              disabled={createZone.isPending}
            >
              <Map className="w-3.5 h-3.5" style={{ color: ZONE_COLORS.neighborhood }} />
              + Bairros
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleAdd("cep")}
              disabled={createZone.isPending}
            >
              <Hash className="w-3.5 h-3.5" style={{ color: ZONE_COLORS.cep }} />
              + CEPs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Zone Card ──
function ZoneCard({
  zone,
  storeId,
  onUpdate,
  onDelete,
}: {
  zone: DeliveryZone;
  storeId: string;
  onUpdate: (updates: Partial<DeliveryZone>) => void;
  onDelete: () => void;
}) {
  const color = ZONE_COLORS[zone.zone_type] || "#888";
  const typeLabels: Record<string, string> = {
    radius: "Raio",
    neighborhood: "Bairros",
    cep: "CEPs",
  };

  return (
    <Card className="overflow-hidden border-l-4 transition-all duration-200 hover:shadow-md" style={{ borderLeftColor: color }}>
      <CardContent className="p-3 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: color, color }}>
            {typeLabels[zone.zone_type]}
          </Badge>
          <Input
            value={zone.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-7 text-sm font-medium border-none bg-transparent px-1 focus-visible:ring-1"
          />
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={zone.is_active}
              onCheckedChange={(v) => onUpdate({ is_active: v })}
              className="scale-75"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Fee (hidden for radius with tiers — fee comes from tiers) */}
        {!(zone.zone_type === "radius" && ((zone.config as any).tiers?.length > 0)) && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Taxa R$</Label>
            <Input
              type="number"
              step="0.50"
              min="0"
              value={zone.delivery_fee}
              onChange={(e) => onUpdate({ delivery_fee: parseFloat(e.target.value) || 0 })}
              className="h-7 w-24 text-sm"
            />
          </div>
        )}

        {/* Min order (all zone types) */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Pedido mín R$</Label>
          <Input
            type="number"
            step="1"
            min="0"
            value={(zone.config as any).min_order || 0}
            onChange={(e) => onUpdate({ config: { ...zone.config, min_order: parseFloat(e.target.value) || 0 } })}
            className="h-7 w-24 text-sm"
            placeholder="0"
          />
        </div>

        {/* Type-specific config */}
        {zone.zone_type === "radius" && (
          <RadiusConfig zone={zone} onUpdate={onUpdate} />
        )}
        {zone.zone_type === "neighborhood" && (
          <NeighborhoodConfig zone={zone} onUpdate={onUpdate} />
        )}
        {zone.zone_type === "cep" && (
          <CepConfig zone={zone} onUpdate={onUpdate} />
        )}
      </CardContent>
    </Card>
  );
}

// ── Radius config with Leaflet map ──
function RadiusConfig({ zone, onUpdate }: { zone: DeliveryZone; onUpdate: (u: Partial<DeliveryZone>) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const config = zone.config as { lat?: number; lng?: number; radius_km?: number; tiers?: Array<{ max_km: number; fee: number; min_order: number }> };
  const lat = config.lat || -23.5505;
  const lng = config.lng || -46.6333;
  const radiusKm = config.radius_km || 5;
  const tiers = config.tiers || [];

  const updateConfig = useCallback(
    (partial: Record<string, any>) => {
      onUpdate({ config: { ...config, ...partial } });
    },
    [config, onUpdate]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    const circle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: ZONE_COLORS.radius,
      fillColor: ZONE_COLORS.radius,
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      circle.setLatLng(e.latlng);
      map.panTo(e.latlng);
      updateConfig({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    circleRef.current = circle;
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      circleRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
    }
  }, [radiusKm]);

  const addTier = () => {
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].max_km : 0;
    const newTier = { max_km: lastMax + 3, fee: 5, min_order: 0 };
    const newTiers = [...tiers, newTier];
    // Auto-update radius_km to match max tier
    const maxKm = Math.max(...newTiers.map(t => t.max_km));
    updateConfig({ tiers: newTiers, radius_km: maxKm });
  };

  const updateTier = (idx: number, field: string, value: number) => {
    const newTiers = tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    const maxKm = Math.max(...newTiers.map(t => t.max_km));
    updateConfig({ tiers: newTiers, radius_km: maxKm });
  };

  const removeTier = (idx: number) => {
    const newTiers = tiers.filter((_, i) => i !== idx);
    if (newTiers.length > 0) {
      const maxKm = Math.max(...newTiers.map(t => t.max_km));
      updateConfig({ tiers: newTiers, radius_km: maxKm });
    } else {
      updateConfig({ tiers: [] });
    }
  };

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="h-40 rounded-lg overflow-hidden border border-border"
        style={{ minHeight: "160px" }}
      />

      {/* Tiers table */}
      {tiers.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Faixas de entrega</p>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1 text-[10px] font-medium text-muted-foreground px-1">
            <span>Até (km)</span><span>Taxa R$</span><span>Mín R$</span><span></span>
          </div>
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1 items-center animate-in fade-in-0 duration-200">
              <Input
                type="number" step="0.5" min="0.5"
                value={tier.max_km}
                onChange={(e) => updateTier(i, "max_km", parseFloat(e.target.value) || 1)}
                className="h-7 text-sm"
              />
              <Input
                type="number" step="0.5" min="0"
                value={tier.fee}
                onChange={(e) => updateTier(i, "fee", parseFloat(e.target.value) || 0)}
                className="h-7 text-sm"
              />
              <Input
                type="number" step="1" min="0"
                value={tier.min_order}
                onChange={(e) => updateTier(i, "min_order", parseFloat(e.target.value) || 0)}
                className="h-7 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => removeTier(i)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Raio (km)</Label>
          <Input
            type="number" step="0.5" min="0.5" max="50"
            value={radiusKm}
            onChange={(e) => updateConfig({ radius_km: parseFloat(e.target.value) || 1 })}
            className="h-7 w-20 text-sm"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTier}>
          <Plus className="w-3 h-3" /> Faixa
        </Button>
        <span className="text-[10px] text-muted-foreground">
          {tiers.length > 0 ? `${tiers.length} faixa${tiers.length > 1 ? "s" : ""} · raio máx ${radiusKm}km` : "Clique no mapa para mover o centro"}
        </span>
      </div>
    </div>
  );
}

// ── Neighborhood config (tags + optional CEP prefixes) ──
function NeighborhoodConfig({ zone, onUpdate }: { zone: DeliveryZone; onUpdate: (u: Partial<DeliveryZone>) => void }) {
  const [input, setInput] = useState("");
  const [cepInput, setCepInput] = useState("");
  const [showCepPrefixes, setShowCepPrefixes] = useState(() => {
    const prefixes: string[] = (zone.config as any).cep_prefixes || [];
    return prefixes.length > 0;
  });
  const names: string[] = (zone.config as any).names || (zone.config as any).neighborhoods || [];
  const cepPrefixes: string[] = (zone.config as any).cep_prefixes || [];

  const addName = () => {
    const trimmed = input.trim();
    if (!trimmed || names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return;
    onUpdate({ config: { ...zone.config, names: [...names, trimmed] } });
    setInput("");
  };

  const removeName = (idx: number) => {
    onUpdate({ config: { ...zone.config, names: names.filter((_, i) => i !== idx) } });
  };

  const addCepPrefix = () => {
    const digits = cepInput.replace(/\D/g, "").trim();
    if (!digits || cepPrefixes.includes(digits)) return;
    onUpdate({ config: { ...zone.config, cep_prefixes: [...cepPrefixes, digits] } });
    setCepInput("");
  };

  const removeCepPrefix = (idx: number) => {
    onUpdate({ config: { ...zone.config, cep_prefixes: cepPrefixes.filter((_, i) => i !== idx) } });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addName();
            }
          }}
          placeholder="Digite o bairro e pressione Enter"
          className="h-7 text-sm flex-1"
        />
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addName}>
          +
        </Button>
      </div>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map((name, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="gap-1 text-xs py-0.5 px-2 animate-in fade-in-0 zoom-in-95 duration-200"
            >
              {name}
              <button onClick={() => removeName(i)} className="hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        {names.length} bairro{names.length !== 1 ? "s" : ""} coberto{names.length !== 1 ? "s" : ""}
      </p>

      {/* Optional CEP prefixes for cross-validation */}
      <div className="border-t border-border/50 pt-2 mt-2">
        <button
          type="button"
          className="text-[11px] text-primary/80 hover:text-primary font-medium flex items-center gap-1"
          onClick={() => setShowCepPrefixes(!showCepPrefixes)}
        >
          <Hash className="w-3 h-3" />
          {showCepPrefixes ? "Ocultar" : "Adicionar"} prefixos de CEP (opcional)
        </button>

        {showCepPrefixes && (
          <div className="mt-2 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <p className="text-[10px] text-muted-foreground">
              CEPs aceitos para estes bairros. Valida se o CEP do cliente é coerente com o bairro.
            </p>
            <div className="flex gap-1.5">
              <Input
                value={cepInput}
                onChange={(e) => setCepInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCepPrefix();
                  }
                }}
                placeholder="Prefixo CEP (ex: 01310)"
                className="h-7 text-sm flex-1"
              />
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addCepPrefix}>
                +
              </Button>
            </div>
            {cepPrefixes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cepPrefixes.map((p, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="gap-1 text-xs py-0.5 px-2 font-mono animate-in fade-in-0 zoom-in-95 duration-200"
                  >
                    {p}***
                    <button onClick={() => removeCepPrefix(i)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CEP prefix config ──
function CepConfig({ zone, onUpdate }: { zone: DeliveryZone; onUpdate: (u: Partial<DeliveryZone>) => void }) {
  const [input, setInput] = useState("");
  const prefixes: string[] = (zone.config as any).prefixes || [];

  const addPrefix = () => {
    const digits = input.replace(/\D/g, "").trim();
    if (!digits || prefixes.includes(digits)) return;
    onUpdate({ config: { ...zone.config, prefixes: [...prefixes, digits] } });
    setInput("");
  };

  const removePrefix = (idx: number) => {
    onUpdate({ config: { ...zone.config, prefixes: prefixes.filter((_, i) => i !== idx) } });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPrefix();
            }
          }}
          placeholder="Prefixo CEP (ex: 01, 020)"
          className="h-7 text-sm flex-1"
        />
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addPrefix}>
          +
        </Button>
      </div>
      {prefixes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {prefixes.map((p, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="gap-1 text-xs py-0.5 px-2 font-mono animate-in fade-in-0 zoom-in-95 duration-200"
            >
              {p}***
              <button onClick={() => removePrefix(i)} className="hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        "01" aceita todos os CEPs que começam com 01 (01000-000 a 01999-999)
      </p>
    </div>
  );
}
