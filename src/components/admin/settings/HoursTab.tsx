import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, ShoppingCart, Zap, Package } from "lucide-react";
import { OpeningHour } from "@/hooks/useStore";
import type { SettingsFormData } from "./types";
import { defaultOpeningHours } from "./types";

interface HoursTabProps {
  formData: SettingsFormData;
  setFormData: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  preorderEnabled?: boolean;
  preorderConfig?: any;
  onPreorderConfigChange?: (config: any) => void;
}

const hasMultipleIntervals = (raw: string): boolean => raw.includes('/');

const parseSimpleRange = (raw: string): { open: string; close: string } | null => {
  const match = raw.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
  if (!match) return null;
  return { open: match[1], close: match[2] };
};

const formatSimpleRange = (open: string, close: string) => {
  if (!open && !close) return "";
  if (!open || !close) return "";
  return `${open} - ${close}`;
};

const parseTimeLenient = (raw: string): { open: string; close: string } => {
  const times = raw.match(/\d{2}:\d{2}/g) || [];
  return { open: times[0] || "", close: times[1] || "" };
};

const parseIntervals = (raw: string) => {
  const parts = raw.split("/").map(p => p.trim());
  const slot1 = parseTimeLenient(parts[0] || "");
  const slot2 = parseTimeLenient(parts[1] || "");
  return { slot1, slot2 };
};

const rebuildHours = (s1: { open: string; close: string }, s2: { open: string; close: string }) => {
  const slot1Str = s1.open && s1.close ? `${s1.open} - ${s1.close}` : s1.open ? `${s1.open} - ` : "";
  const slot2Str = s2.open && s2.close ? `${s2.open} - ${s2.close}` : s2.open ? `${s2.open} - ` : "";
  const parts = [slot1Str, slot2Str].filter(s => s && s.trim() !== "-");
  return parts.join(" / ");
};

function AdvancedMode({
  hour,
  index,
  updateOpeningHour,
  onSwitchSimple,
}: {
  hour: OpeningHour;
  index: number;
  updateOpeningHour: (index: number, field: keyof OpeningHour, value: string | boolean) => void;
  onSwitchSimple: () => void;
}) {
  const { slot1, slot2 } = parseIntervals(hour.hours);

  const handleSlotChange = (slot: 1 | 2, part: "open" | "close", value: string) => {
    const current = parseIntervals(hour.hours);
    const s1 = { ...current.slot1 };
    const s2 = { ...current.slot2 };
    if (slot === 1) s1[part] = value;
    else s2[part] = value;
    updateOpeningHour(index, "hours", rebuildHours(s1, s2));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-primary">Modo Intervalos</span>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onSwitchSimple}>
          Modo simples
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">1º Período (manhã)</span>
        <div className="flex items-center gap-2">
          <Input type="time" key={`${hour.day}-s1o-${slot1.open}`} defaultValue={slot1.open} onChange={(e) => handleSlotChange(1, "open", e.target.value)} className="h-9 text-sm flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">até</span>
          <Input type="time" key={`${hour.day}-s1c-${slot1.close}`} defaultValue={slot1.close} onChange={(e) => handleSlotChange(1, "close", e.target.value)} className="h-9 text-sm flex-1" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">2º Período (tarde/noite)</span>
        <div className="flex items-center gap-2">
          <Input type="time" key={`${hour.day}-s2o-${slot2.open}`} defaultValue={slot2.open} onChange={(e) => handleSlotChange(2, "open", e.target.value)} className="h-9 text-sm flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">até</span>
          <Input type="time" key={`${hour.day}-s2c-${slot2.close}`} defaultValue={slot2.close} onChange={(e) => handleSlotChange(2, "close", e.target.value)} className="h-9 text-sm flex-1" />
        </div>
      </div>
      {hour.hours && (
        <div className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
          Resultado: <strong>{hour.hours}</strong>
        </div>
      )}
    </div>
  );
}

function HoursGrid({
  hours,
  updateHour,
  label,
}: {
  hours: { day: string; hours: string; isOpen: boolean }[];
  updateHour: (index: number, field: string, value: string | boolean) => void;
  label?: string;
}) {
  const [advancedDays, setAdvancedDays] = useState<Record<string, boolean>>(() => {
    const adv: Record<string, boolean> = {};
    hours.forEach((h) => {
      if (h.hours && hasMultipleIntervals(h.hours)) adv[h.day] = true;
    });
    return adv;
  });

  const updateSimpleTime = (index: number, part: "open" | "close", value: string) => {
    const current = hours[index];
    const parsed = parseSimpleRange(current.hours) || parseTimeLenient(current.hours);
    const open = part === "open" ? value : parsed?.open || "";
    const close = part === "close" ? value : parsed?.close || "";
    updateHour(index, "hours", formatSimpleRange(open, close));
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      {hours.map((hour, index) => {
        const isAdvanced = advancedDays[hour.day] || false;
        const simple = !isAdvanced ? (parseSimpleRange(hour.hours) || parseTimeLenient(hour.hours)) : null;

        return (
          <div
            key={hour.day}
            className={`p-3 rounded-xl border transition-all ${
              hour.isOpen ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Switch
                checked={hour.isOpen}
                onCheckedChange={(checked) => updateHour(index, "isOpen", checked)}
              />
              <span className={`text-sm font-medium min-w-[3rem] sm:w-20 ${hour.isOpen ? "text-foreground" : "text-muted-foreground"}`}>
                {hour.day}
              </span>
              {!hour.isOpen && (
                <span className="text-xs text-muted-foreground italic">Fechado</span>
              )}
            </div>

            {hour.isOpen && (
              <div className="mt-2 pl-[calc(2rem+0.5rem)] sm:pl-[calc(2.25rem+0.75rem)]">
                {!isAdvanced ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input type="time" value={simple?.open || ""} onChange={(e) => updateSimpleTime(index, "open", e.target.value)} className="h-9 text-sm w-[110px] sm:w-[130px]" />
                    <span className="text-xs text-muted-foreground shrink-0">até</span>
                    <Input type="time" value={simple?.close || ""} onChange={(e) => updateSimpleTime(index, "close", e.target.value)} className="h-9 text-sm w-[110px] sm:w-[130px]" />
                    <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 text-xs px-2" onClick={() => setAdvancedDays((prev) => ({ ...prev, [hour.day]: true }))}>
                      Intervalos
                    </Button>
                  </div>
                ) : (
                  <AdvancedMode
                    hour={hour as OpeningHour}
                    index={index}
                    updateOpeningHour={(i, f, v) => updateHour(i, f as string, v)}
                    onSwitchSimple={() => {
                      const first = parseTimeLenient(hour.hours);
                      const simpleHours = formatSimpleRange(first.open, first.close);
                      updateHour(index, "hours", simpleHours);
                      setAdvancedDays((prev) => ({ ...prev, [hour.day]: false }));
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HoursTab({ formData, setFormData, preorderEnabled, preorderConfig, onPreorderConfigChange }: HoursTabProps) {
  const acceptWhenClosed = preorderConfig?.accept_when_closed !== false;
  const updateOpeningHour = (index: number, field: string, value: string | boolean) => {
    setFormData((prev) => {
      const next = prev.opening_hours.map((hour, i) => {
        if (i !== index) return hour;
        const updated = { ...hour, [field]: value };
        if (field === "isOpen" && value === false) return { ...updated, hours: "" };
        return updated;
      });
      return { ...prev, opening_hours: next };
    });
  };

  const updateOrderingHour = (index: number, field: string, value: string | boolean) => {
    setFormData((prev) => {
      const currentHours = prev.ordering_hours.length > 0 ? prev.ordering_hours : defaultOpeningHours;
      const next = currentHours.map((hour, i) => {
        if (i !== index) return hour;
        const updated = { ...hour, [field]: value };
        if (field === "isOpen" && value === false) return { ...updated, hours: "" };
        return updated;
      });
      return { ...prev, ordering_hours: next };
    });
  };

  const orderingHoursData = formData.ordering_hours.length > 0 ? formData.ordering_hours : defaultOpeningHours;

  return (
    <div className="space-y-6">
      {/* Ordering Mode Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Recebimento de Pedidos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Controle quando sua loja aceita novos pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
          <Select
            value={formData.ordering_mode}
            onValueChange={(val) => setFormData((prev) => ({ ...prev, ordering_mode: val }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours_only">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Apenas no horário de funcionamento</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="always">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">24 horas — sempre aberto</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Horário personalizado para pedidos</span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            {formData.ordering_mode === "hours_only" && "Pedidos serão aceitos apenas durante o horário de funcionamento configurado abaixo."}
            {formData.ordering_mode === "always" && "Sua loja aceitará pedidos a qualquer hora, 24h por dia, 7 dias por semana."}
            {formData.ordering_mode === "custom" && "Configure abaixo um horário separado para aceitar pedidos (pode ser diferente do horário de funcionamento)."}
          </p>

          {formData.ordering_mode === "custom" && (
            <div className="border border-primary/20 rounded-xl p-4 bg-primary/5">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Horário de pedidos
              </p>
              <HoursGrid
                hours={orderingHoursData}
                updateHour={updateOrderingHour}
              />
            </div>
          )}

          {/* Preorder outside hours toggle */}
          {preorderEnabled && (
            <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-50/50 dark:bg-amber-500/5 space-y-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 shrink-0 mt-0.5">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Aceitar encomendas fora do horário
                    </span>
                    <Switch
                      checked={acceptWhenClosed}
                      onCheckedChange={(checked) => {
                        onPreorderConfigChange?.({
                          ...preorderConfig,
                          accept_when_closed: checked,
                        });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {acceptWhenClosed
                      ? "Clientes podem fazer encomendas agendadas mesmo quando a loja estiver fechada para pedidos rápidos. Isso aumenta vendas fora do horário."
                      : "Encomendas só serão aceitas durante o horário de funcionamento, junto com os pedidos rápidos."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opening Hours Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Horários de Funcionamento</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Configure os horários por dia (modo simples) ou personalize com intervalos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
          <HoursGrid
            hours={formData.opening_hours}
            updateHour={updateOpeningHour}
          />
          <p className="text-xs text-muted-foreground pt-2">
            💡 Dica: use "Intervalos" para almoço/pausas. O Storefront exibe exatamente o texto salvo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
