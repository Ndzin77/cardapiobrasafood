import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Printer, Phone, MapPin, ExternalLink, MessageCircle,
  Clock, Truck, ShoppingBag, CreditCard, CheckCircle2,
  ChefHat, Package, XCircle, ArrowRight, CalendarDays, Wallet, Zap, StickyNote, ChevronDown,
  User, AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix", credit: "Crédito", debit: "Débito", cash: "Dinheiro", online: "Pgto Online",
};

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  pending: { label: "Aceitar", status: "confirmed" },
  confirmed: { label: "Preparar", status: "preparing" },
  preparing: { label: "Pronto", status: "ready" },
  ready: { label: "Entregue", status: "delivered" },
};

interface OrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  storeName?: string;
  storeId?: string;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
}

export function OrderDetailModal({ open, onOpenChange, order, storeName, storeId, onStatusChange, onRequestCancel }: OrderDetailModalProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState<string | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch drivers for assignment
  useEffect(() => {
    if (!storeId || !open) return;
    supabase
      .from("drivers")
      .select("id, name, phone, is_active")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .then(({ data }) => setDrivers(data || []));

    // Check if order has delivery assigned
    if (order?.id) {
      supabase
        .from("deliveries")
        .select("id, driver_id, status, drivers!deliveries_driver_id_fkey(name)")
        .eq("order_id", order.id)
        .neq("status", "cancelled")
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const d = data[0] as any;
            setAssignedDriver(d.drivers?.name || "Atribuído");
            setDeliveryId(d.id || null);
            setDeliveryStatus(d.status || null);
          } else {
            setAssignedDriver(null);
            setDeliveryId(null);
            setDeliveryStatus(null);
          }
        });
    }
  }, [storeId, open, order?.id]);

  const handleAssignDriver = async () => {
    if (!selectedDriver || !order?.id || !storeId) return;
    setAssigning(true);
    try {
      const { error } = await supabase.rpc("assign_delivery", {
        p_order_id: order.id,
        p_driver_id: selectedDriver,
        p_store_id: storeId,
      } as any);
      if (error) throw error;
      const driverName = drivers.find((d: any) => d.id === selectedDriver)?.name;
      setAssignedDriver(driverName || "Atribuído");
      setSelectedDriver("");
    } catch (err: any) {
      console.error("Error assigning driver:", err);
    }
    setAssigning(false);
  };

  // Sync notes when order changes
  const currentNotes = order?.admin_notes || "";
  if (order && adminNotes !== currentNotes && !saving) {
    // Only reset if the order actually changed
    if (adminNotes === "" || adminNotes !== currentNotes) {
      // We use a simple check — on open, set from order
    }
  }

  if (!order) return null;

  const isDelivery = String(order.delivery_type || "delivery").toLowerCase() !== "pickup";
  const statusColor = ORDER_STATUS_COLORS[order.status as OrderStatus] || ORDER_STATUS_COLORS.pending;
  const next = NEXT_STATUS[order.status as OrderStatus];
  const isActive = !["delivered", "cancelled"].includes(order.status);

  const handlePrint = () => window.print();

  const phone = order.customer_phone?.replace(/\D/g, "") || "";
  const whatsappMsg = encodeURIComponent(
    `Olá ${order.customer_name || ""}! 👋 Atualização do seu pedido #${order.id.slice(-6).toUpperCase()}.`
  );

  const handleSaveNotes = async (value: string) => {
    setSaving(true);
    try {
      await supabase
        .from("orders")
        .update({ admin_notes: value } as any)
        .eq("id", order.id);
      order.admin_notes = value;
    } catch {
      // silent
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        // Reset state
        setAdminNotes("");
        setNotesOpen(false);
      }
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 print-order-detail">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between no-print-actions">
          <DialogHeader className="flex-1">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              Pedido #{order.id.slice(-6).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimir" className="shrink-0 no-print-actions">
            <Printer className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4 print-content">
          {/* Print header */}
          <div className="hidden print:block text-center mb-4">
            {storeName && <p className="text-sm font-bold">{storeName}</p>}
            <p className="text-xs">Pedido #{order.id.slice(-6).toUpperCase()}</p>
            <p className="text-xs">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge className={`${statusColor} border text-xs px-2 py-0.5`}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </Badge>
            <Badge variant="outline" className={`text-xs px-2 py-0.5 inline-flex items-center gap-1 ${isDelivery ? "bg-primary/10 text-primary border-primary/40" : "bg-muted text-foreground border-border"}`}>
              {isDelivery ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
              {isDelivery ? "Entrega" : "Retirada"}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          </div>

          <Separator />

          {/* Customer */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</p>
            <p className="text-sm font-medium">{order.customer_name || "Não informado"}</p>
            {order.customer_phone && (
              <div className="flex items-center gap-2">
                <a href={`tel:${order.customer_phone}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
                </a>
                <a
                  href={`https://wa.me/55${phone}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 text-xs font-medium transition-colors no-print-actions"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Address */}
          {isDelivery && order.customer_address && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{order.customer_address}</p>
                </div>
                {order.customer_maps_url && (
                  <a
                    href={order.customer_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-semibold transition-colors no-print-actions"
                  >
                    <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                  </a>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens</p>
            <div className="space-y-2">
              {(order.items || []).map((item: any, i: number) => {
                const fc = item.fulfillment_choice || item.fulfillment_mode;
                return (
                  <div key={i} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {fc === "preorder" && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-violet-600 bg-violet-500/10 px-1.5 py-0.5 rounded-full">📦</span>}
                        {fc === "instant" && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">⚡</span>}
                        {item.quantity}x {item.product_name}
                      </p>
                      {item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0 && (
                        <div className="pl-4 space-y-0.5">
                          {item.selected_options.map((opt: any, oi: number) => (
                            <p key={oi} className="text-xs text-muted-foreground">
                              <span className="font-medium">{opt.group}:</span>{" "}
                              {opt.choices.map((c: any) => c.name + (c.price > 0 ? ` (+R$${c.price.toFixed(2).replace(".", ",")})` : "")).join(", ")}
                            </p>
                          ))}
                        </div>
                      )}
                      {item.notes && !item.selected_options?.length && <p className="text-xs text-muted-foreground pl-4">↳ {item.notes}</p>}
                    </div>
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">
                      R$ {(item.total_price || item.unit_price * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {Number(order.subtotal).toFixed(2).replace(".", ",")}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>R$ {Number(order.delivery_fee).toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
              <span>Total</span>
              <span className="text-primary">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          {/* Scheduling */}
          {order.order_type === "preorder" && order.scheduled_date && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-1">
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Agendamento
                </p>
                <p className="text-sm font-bold text-foreground">
                  {format(new Date(order.scheduled_date + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  {order.scheduled_time && <span className="ml-1 text-muted-foreground font-normal">às {order.scheduled_time}</span>}
                </p>
              </div>
            </>
          )}

          {/* Deposit */}
          {order.deposit_amount > 0 && (
            <>
              <Separator />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border/50">
                <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Sinal</p>
                  <p className="text-sm font-bold">R$ {Number(order.deposit_amount).toFixed(2).replace(".", ",")}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${order.deposit_status === "paid" ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"}`}>
                  {order.deposit_status === "paid" ? "✓ Pago" : "Pendente"}
                </Badge>
              </div>
            </>
          )}

          {/* Payment */}
          {order.payment_method && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Pagamento: </span>
                  <span className="font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
                </span>
              </div>
            </>
          )}

          {/* Customer notes */}
          {order.notes && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-secondary/80 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Observações do cliente</p>
                <p className="text-sm text-foreground whitespace-pre-line">{order.notes}</p>
              </div>
            </>
          )}

          {/* Admin internal notes */}
          <Separator />
          <Collapsible open={notesOpen || !!(order.admin_notes)} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group no-print-actions">
              <StickyNote className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                Notas internas
                {order.admin_notes && <span className="text-amber-600 ml-1">•</span>}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${notesOpen || order.admin_notes ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 no-print-actions">
              <Textarea
                placeholder="Adicione observações internas (visíveis só para você)..."
                defaultValue={order.admin_notes || ""}
                className="min-h-[60px] text-sm resize-none"
                onBlur={(e) => {
                  if (e.target.value !== (order.admin_notes || "")) {
                    handleSaveNotes(e.target.value);
                  }
                }}
              />
              {saving && <p className="text-[10px] text-muted-foreground mt-1">Salvando...</p>}
            </CollapsibleContent>
          </Collapsible>

          {/* Assign Driver */}
          {isDelivery && ["ready", "confirmed", "preparing"].includes(order.status) && (
            <>
              <Separator />
              <div className="space-y-2 no-print-actions">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Entregador
                </p>
                {drivers.length === 0 ? (
                  <button
                    onClick={() => { onOpenChange(false); navigate("/admin/drivers"); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary">Cadastre entregadores</p>
                      <p className="text-[10px] text-muted-foreground">Rastreie entregas em tempo real</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary ml-auto" />
                  </button>
                ) : assignedDriver ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-xs gap-1">
                        <User className="w-3 h-3" /> {assignedDriver}
                      </Badge>
                      {deliveryStatus && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                          deliveryStatus === "assigned" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" :
                          deliveryStatus === "collected" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
                          "bg-green-500/10 text-green-600 border-green-500/30"
                        }`}>
                          {deliveryStatus === "assigned" ? "Aguardando coleta" : deliveryStatus === "collected" ? "Em rota" : "Entregue"}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs h-7 ml-auto" onClick={() => setAssignedDriver(null)}>
                        Trocar
                      </Button>
                    </div>
                    {order.status !== "ready" && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Mude para "Pronto" quando o pedido estiver pronto para coleta
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue placeholder="Selecionar entregador" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-9" onClick={handleAssignDriver} disabled={!selectedDriver || assigning}>
                      {assigning ? "..." : "Atribuir"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          {isActive && (
            <>
              <Separator />
              <div className="flex gap-2 no-print-actions">
                {next && (() => {
                  // If order is "ready" and has a delivery assigned, hide "Entregue" button
                  const hasActiveDelivery = assignedDriver && deliveryStatus && deliveryStatus !== "delivered";
                  if (order.status === "ready" && hasActiveDelivery) {
                    return (
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                        <Truck className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-xs font-medium text-primary">
                          {deliveryStatus === "assigned" ? "Aguardando entregador coletar" : "Entregador em rota"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <Button
                      className="flex-1 h-11 gap-2 font-semibold"
                      onClick={async () => {
                        // If marking as delivered manually and there's a delivery, sync it
                        if (next.status === "delivered" && deliveryId) {
                          await supabase
                            .from("deliveries" as any)
                            .update({ status: "delivered", delivered_at: new Date().toISOString() } as any)
                            .eq("id", deliveryId);
                        }
                        onStatusChange(order.id, next.status);
                        onOpenChange(false);
                      }}
                    >
                      {next.label}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  );
                })()}
                <Button
                  variant="outline"
                  className="h-11 px-4 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    onRequestCancel(order.id, order.payment_method);
                    onOpenChange(false);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
