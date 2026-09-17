import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Clock, Package, AlertCircle, Plus, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type PreorderConfig, defaultPreorderConfig } from "./types";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

interface PreorderTabProps {
  preorderEnabled: boolean;
  setPreorderEnabled: (v: boolean) => void;
  preorderConfig: PreorderConfig;
  setPreorderConfig: (v: PreorderConfig) => void;
  products?: { id: string; name: string; image_url?: string | null }[];
}

export function PreorderTab({
  preorderEnabled,
  setPreorderEnabled,
  preorderConfig,
  setPreorderConfig,
  products = [],
}: PreorderTabProps) {
  const config = { ...defaultPreorderConfig, ...preorderConfig };
  const [newTimeSlot, setNewTimeSlot] = useState("");

  const updateConfig = (partial: Partial<PreorderConfig>) => {
    setPreorderConfig({ ...config, ...partial });
  };

  const addTimeSlot = () => {
    const trimmed = newTimeSlot.trim();
    if (!trimmed || config.time_slots.includes(trimmed)) return;
    // Validate HH:MM format
    if (!/^\d{2}:\d{2}$/.test(trimmed)) return;
    updateConfig({ time_slots: [...config.time_slots, trimmed].sort() });
    setNewTimeSlot("");
  };

  const removeTimeSlot = (slot: string) => {
    updateConfig({ time_slots: config.time_slots.filter((s) => s !== slot) });
  };

  const toggleBlockedDay = (day: number) => {
    const current = config.blocked_days || [];
    updateConfig({
      blocked_days: current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    });
  };

  const addBlockedDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (config.blocked_dates.includes(dateStr)) return;
    updateConfig({ blocked_dates: [...config.blocked_dates, dateStr].sort() });
  };

  const removeBlockedDate = (dateStr: string) => {
    updateConfig({ blocked_dates: config.blocked_dates.filter((d) => d !== dateStr) });
  };

  const toggleProduct = (productId: string) => {
    const current = config.product_ids || [];
    updateConfig({
      product_ids: current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    });
  };

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Encomendas
            </CardTitle>
            <Switch checked={preorderEnabled} onCheckedChange={setPreorderEnabled} />
          </div>
          <p className="text-sm text-muted-foreground">
            Permita que clientes agendem pedidos para datas futuras
          </p>
        </CardHeader>
      </Card>

      {preorderEnabled && (
        <div className="space-y-4 animate-fade-in">
          {/* Timing rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Regras de Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Antecedência mínima (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.min_advance_hours}
                    onChange={(e) => updateConfig({ min_advance_hours: Number(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: 24h = cliente deve pedir com 1 dia de antecedência
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Máximo de dias no futuro</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={config.max_advance_days}
                    onChange={(e) => updateConfig({ max_advance_days: Number(e.target.value) || 14 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Limite diário de encomendas</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.daily_limit}
                  onChange={(e) => updateConfig({ daily_limit: Number(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  0 = sem limite. Define quantas encomendas aceitar por dia.
                </p>
              </div>

              {/* Time slots */}
              <div className="space-y-2">
                <Label>Horários disponíveis para encomenda</Label>
                <div className="flex flex-wrap gap-2">
                  {config.time_slots.map((slot) => (
                    <Badge key={slot} variant="secondary" className="gap-1 text-sm py-1 px-2.5">
                      {slot}
                      <button onClick={() => removeTimeSlot(slot)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="time"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="max-w-[140px]"
                    onKeyDown={(e) => e.key === "Enter" && addTimeSlot()}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTimeSlot}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>

              {/* Blocked days */}
              <div className="space-y-2">
                <Label>Dias da semana bloqueados</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <label key={day.value} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={config.blocked_days.includes(day.value)}
                        onCheckedChange={() => toggleBlockedDay(day.value)}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Blocked dates */}
              <div className="space-y-2">
                <Label>Datas específicas bloqueadas</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {config.blocked_dates.map((dateStr) => (
                    <Badge key={dateStr} variant="outline" className="gap-1 text-xs">
                      {format(new Date(dateStr + "T12:00:00"), "dd/MM/yyyy")}
                      <button onClick={() => removeBlockedDate(dateStr)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <CalendarDays className="w-3.5 h-3.5 mr-1" /> Bloquear data
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      onSelect={addBlockedDate}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Deposit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                💰 Sinal (Pagamento Antecipado)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Porcentagem do sinal (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.deposit_percent}
                  onChange={(e) => updateConfig({ deposit_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                  className="max-w-[140px]"
                />
                <p className="text-xs text-muted-foreground">
                  0 = sem sinal. Incide apenas sobre os itens elegíveis para encomenda.
                </p>
              </div>
              {config.deposit_percent > 0 && (
                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">
                  <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>
                    O cliente verá um aviso transparente sobre o sinal de {config.deposit_percent}% antes de confirmar a encomenda.
                    {config.deposit_percent < 100 && " O restante será pago na entrega/retirada."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product eligibility — now per-product */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos Elegíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>
                  A elegibilidade para encomenda agora é configurada <strong>em cada produto individualmente</strong>. 
                  Acesse o formulário de edição do produto e escolha o modo de atendimento: ⚡ Pronta entrega, 📦 Encomenda ou 🔄 Ambos.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery fee mode for preorders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                🚚 Frete em Encomendas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup
                value={config.delivery_fee_mode || "instant_only"}
                onValueChange={(v) => updateConfig({ delivery_fee_mode: v as any })}
                className="space-y-2"
              >
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="instant_only" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Sem frete na encomenda</p>
                    <p className="text-xs text-muted-foreground">Encomenda não tem frete. Frete cobrado apenas nos pedidos rápidos (pronta entrega).</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="full_upfront" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Frete incluído no sinal</p>
                    <p className="text-xs text-muted-foreground">O cliente paga o frete junto com a entrada antecipada. Ele vê: "✅ Frete já incluído no valor que você paga agora".</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="on_delivery" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Frete pago na entrega</p>
                    <p className="text-xs text-muted-foreground">O cliente vê o valor do frete mas só paga quando receber. Ele vê: "🚚 Frete cobrado só quando você receber".</p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Customer notice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Aviso ao Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={config.customer_notice || ""}
                onChange={(e) => updateConfig({ customer_notice: e.target.value })}
                placeholder="Mensagem que aparecerá para o cliente ao agendar encomenda..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Exibido no checkout quando o cliente escolhe agendar.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
