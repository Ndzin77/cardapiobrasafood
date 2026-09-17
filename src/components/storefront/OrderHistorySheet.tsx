import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Package,
  Clock,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Truck,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  ChefHat,
} from "lucide-react";
import { useCustomerOrders } from "@/hooks/useCustomerOrders";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from "@/hooks/useOrders";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderHistorySheetProps {
  storeId: string;
}

// Status pipeline for progress visualization
const STATUS_PIPELINE: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "delivered"];
const STATUS_PIPELINE_LABELS: Record<string, string> = {
  pending: "Recebido",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
};

function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
        <XCircle className="w-3.5 h-3.5 text-destructive" />
        <span className="text-xs font-semibold text-destructive">Cancelado</span>
      </div>
    );
  }

  const currentIndex = STATUS_PIPELINE.indexOf(status);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STATUS_PIPELINE.length) * 100 : 0;

  return (
    <div className="space-y-2 pt-2">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: status === "delivered"
              ? "hsl(var(--accent))"
              : "hsl(var(--primary))",
          }}
        />
      </div>
      {/* Step dots */}
      <div className="flex justify-between">
        {STATUS_PIPELINE.map((step, i) => {
          const isCompleted = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  isCompleted
                    ? isCurrent
                      ? "bg-primary scale-125 ring-2 ring-primary/30"
                      : "bg-primary"
                    : "bg-muted-foreground/20"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              />
              <span className={`text-[8px] leading-tight ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                {STATUS_PIPELINE_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderHistorySheet({ storeId }: OrderHistorySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { customer } = useCustomerAuth();

  const { data: orders, isLoading, refetch, isRefetching } = useCustomerOrders(
    storeId,
    customer?.phone || null
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) {
        return `Hoje às ${format(date, "HH:mm", { locale: ptBR })}`;
      }
      if (isYesterday(date)) {
        return `Ontem às ${format(date, "HH:mm", { locale: ptBR })}`;
      }
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

  // Only show if customer is logged in
  if (!customer) return null;

  // Active/recent stats
  const activeOrders = orders?.filter(o => !["delivered", "cancelled"].includes(o.status as string)) || [];
  const totalOrders = orders?.length || 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-primary relative"
          title="Meus pedidos"
        >
          <History className="w-3.5 h-3.5 mr-1" />
          Pedidos
          {activeOrders.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold animate-pulse">
              {activeOrders.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <div className="p-2 rounded-lg bg-primary/10">
                <History className="w-4 h-4 text-primary" />
              </div>
              Meus Pedidos
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-3 mt-2">
            {activeOrders.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary">{activeOrders.length} em andamento</span>
              </div>
            )}
            {totalOrders > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalOrders} {totalOrders === 1 ? "pedido" : "pedidos"} no total
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order, idx) => {
                const isExpanded = expandedOrderId === order.id;
                const status = order.status as OrderStatus;
                const fulfillmentLabel = String(order.delivery_type || "delivery").toLowerCase() === "pickup" ? "Retirada" : "Entrega";
                const isActive = !["delivered", "cancelled"].includes(status);

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border overflow-hidden bg-card shadow-soft hover:shadow-medium transition-all animate-scale-in ${
                      isActive ? "border-primary/20 ring-1 ring-primary/5" : "border-border"
                    }`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Order Header */}
                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="w-full p-3 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <Badge
                              variant="outline"
                              className={`${ORDER_STATUS_COLORS[status] || ""} text-xs flex items-center gap-1`}
                            >
                              {status === "pending" && <Clock className="w-3 h-3" />}
                              {status === "confirmed" && <CheckCircle2 className="w-3 h-3" />}
                              {status === "preparing" && <ChefHat className="w-3 h-3" />}
                              {status === "ready" && <Package className="w-3 h-3" />}
                              {status === "delivered" && <Truck className="w-3 h-3" />}
                              {status === "cancelled" && <XCircle className="w-3 h-3" />}
                              {ORDER_STATUS_LABELS[status] || status}
                            </Badge>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{formatDate(order.created_at)}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                            <span className="flex items-center gap-1">
                              {fulfillmentLabel === "Entrega" ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                              {fulfillmentLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-primary text-sm">
                            {formatPrice(order.total)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Status Timeline (always visible for active orders) */}
                      {isActive && <StatusTimeline status={status} />}
                    </button>

                    {/* Order Details (Expanded) */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 space-y-3 animate-fade-in border-t border-border">
                        {/* Status Timeline for completed/cancelled (only in expanded) */}
                        {!isActive && <StatusTimeline status={status} />}

                        {/* Items */}
                        <div className="pt-3 space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                            <Package className="w-3 h-3" />
                            Itens do pedido
                          </h4>
                          <div className="space-y-1.5 bg-secondary/30 rounded-lg p-2.5">
                            {order.items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-foreground">
                                  <span className="font-medium">{item.quantity}x</span> {item.product_name}
                                </span>
                                <span className="text-muted-foreground font-medium">
                                  {formatPrice(item.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Info */}
                        {order.customer_address && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                              <MapPin className="w-3 h-3" />
                              Endereço
                            </h4>
                            <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-2.5">
                              {order.customer_address}
                            </p>
                          </div>
                        )}

                        {/* Payment */}
                        {order.payment_method && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-foreground capitalize">{order.payment_method}</span>
                          </div>
                        )}

                        {/* Totals */}
                        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-3 space-y-1.5 border border-primary/10">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          {fulfillmentLabel === "Entrega" && order.delivery_fee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Taxa de entrega</span>
                              <span>{formatPrice(order.delivery_fee)}</span>
                            </div>
                          )}
                          <Separator className="my-1.5" />
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span className="text-primary text-lg">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-4xl mx-auto mb-4 animate-float">
                📭
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum pedido ainda
              </h3>
              <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
                Seus pedidos aparecerão aqui depois da primeira compra
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
