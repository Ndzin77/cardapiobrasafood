import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { SettingsFormData } from "./types";
import { DeliveryZonesEditor } from "./DeliveryZonesEditor";

interface LocationTabProps {
  formData: SettingsFormData;
  setFormData: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  deliveryEnabled: boolean;
  setDeliveryEnabled: (v: boolean) => void;
  pickupEnabled: boolean;
  setPickupEnabled: (v: boolean) => void;
  storeId?: string;
  deliveryZoneEnabled: boolean;
  setDeliveryZoneEnabled: (v: boolean) => void;
}

export function LocationTab({ formData, setFormData, deliveryEnabled, setDeliveryEnabled, pickupEnabled, setPickupEnabled, storeId, deliveryZoneEnabled, setDeliveryZoneEnabled }: LocationTabProps) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Localização e Contato</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Endereço e informações de contato</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm">Endereço Completo</Label>
          <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, número, bairro, cidade - estado" rows={2} className="text-sm" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="google_maps_url" className="flex items-center gap-2 text-sm">
            Link do Google Maps
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </Label>
          <Input id="google_maps_url" type="url" value={formData.google_maps_url} onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })} placeholder="https://maps.google.com/..." className="h-10 text-sm" />
          <p className="text-xs text-muted-foreground">Cole o link de compartilhamento do Google Maps</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm">Telefone</Label>
            <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm">WhatsApp (números)</Label>
            <Input id="whatsapp" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, "") })} placeholder="5511999999999" className="h-10" />
          </div>
        </div>

        <div className={`grid gap-4 ${deliveryEnabled && !deliveryZoneEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {deliveryEnabled && !deliveryZoneEnabled && (
            <div className="space-y-2">
              <Label htmlFor="delivery_fee" className="text-sm">Taxa Entrega (R$)</Label>
              <Input id="delivery_fee" type="number" step="0.01" min="0" value={formData.delivery_fee} onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })} className="h-10" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="min_order" className="text-sm">Pedido Mínimo (R$)</Label>
            <Input id="min_order" type="number" step="0.01" min="0" value={formData.min_order} onChange={(e) => setFormData({ ...formData, min_order: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_time" className="text-sm">Tempo Estimado</Label>
            <Input id="estimated_time" value={formData.estimated_time} onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })} placeholder="30-45 min" className="h-10" />
          </div>
        </div>

        {/* Fulfillment options */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Faz entrega?</p>
              <p className="text-xs text-muted-foreground">Mostra a opção de entrega no checkout</p>
            </div>
            <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Aceita retirada?</p>
              <p className="text-xs text-muted-foreground">Mostra a opção de retirada no checkout</p>
            </div>
            <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
          </div>
        </div>

        {/* Delivery Zones */}
        {deliveryEnabled && storeId && (
          <div className="pt-4 border-t">
            <DeliveryZonesEditor
              storeId={storeId}
              zoneEnabled={deliveryZoneEnabled}
              setZoneEnabled={setDeliveryZoneEnabled}
              storeAddress={formData.address}
            />
          </div>
        )}

        {/* Rating and Reviews */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium text-foreground mb-3">Métricas do Cabeçalho</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rating" className="text-sm">Avaliação (1-5)</Label>
              <Input id="rating" type="number" step="0.1" min="1" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} placeholder="4.8" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review_count" className="text-sm">Nº Avaliações</Label>
              <Input id="review_count" type="number" min="0" value={formData.review_count} onChange={(e) => setFormData({ ...formData, review_count: e.target.value })} placeholder="234" className="h-10" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
