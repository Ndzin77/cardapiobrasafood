import React, { useState, useMemo, useEffect, useCallback, forwardRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyStore } from "@/hooks/useStore";
import { useOrders, useUpdateOrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from "@/hooks/useOrders";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Truck,
  ShoppingBag,
  Phone,
  MapPin,
  CreditCard,
  Search,
  RefreshCw,
  ArrowRight,
  LayoutGrid,
  List,
  Timer,
  MessageCircle,
  ExternalLink,
  Eye,
  CalendarDays,
  StickyNote,
  DollarSign,
  Wallet,
  User,
  UserPlus,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday, isTomorrow, isThisWeek, startOfDay, compareAsc, differenceInMinutes, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

// Kanban column definitions
const KANBAN_COLUMNS: { status: OrderStatus; icon: React.ReactNode; color: string; gradient: string }[] = [
  { status: "pending", icon: <Clock className="w-4 h-4" />, color: "text-yellow-600", gradient: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30" },
  { status: "confirmed", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-blue-600", gradient: "from-blue-500/20 to-blue-500/5 border-blue-500/30" },
  { status: "preparing", icon: <ChefHat className="w-4 h-4" />, color: "text-orange-600", gradient: "from-orange-500/20 to-orange-500/5 border-orange-500/30" },
  { status: "ready", icon: <Package className="w-4 h-4" />, color: "text-green-600", gradient: "from-green-500/20 to-green-500/5 border-green-500/30" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; status: OrderStatus; icon: React.ReactNode }>> = {
  pending: { label: "Aceitar", status: "confirmed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  confirmed: { label: "Preparar", status: "preparing", icon: <ChefHat className="w-3.5 h-3.5" /> },
  preparing: { label: "Pronto", status: "ready", icon: <Package className="w-3.5 h-3.5" /> },
  ready: { label: "Entregue", status: "delivered", icon: <Truck className="w-3.5 h-3.5" /> },
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix", credit: "Crédito", debit: "Débito", cash: "Dinheiro", online: "Pgto Online",
};

export default function Orders() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data: orders = [], isLoading: ordersLoading, refetch } = useOrders(store?.id);
  const updateStatus = useUpdateOrderStatus();
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; isOnline: boolean } | null>(null);
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);
  const [deliveryMap, setDeliveryMap] = useState<Record<string, { driverName: string; status: string }>>({});
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);

  // Fetch drivers once
  useEffect(() => {
    if (!store?.id) return;
    supabase
      .from("drivers")
      .select("id, name")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setDrivers(data);
      });
  }, [store?.id]);

  const refreshDeliveryMap = useCallback(() => {
    if (!store?.id) return;
    supabase
      .from("deliveries")
      .select("order_id, status, drivers!deliveries_driver_id_fkey(name)")
      .eq("store_id", store.id)
      .neq("status", "cancelled")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, { driverName: string; status: string }> = {};
        data.forEach((d: any) => {
          map[d.order_id] = { driverName: d.drivers?.name || "?", status: d.status };
        });
        setDeliveryMap(map);
      });
  }, [store?.id]);

  // Fetch active deliveries with driver names
  useEffect(() => {
    refreshDeliveryMap();
  }, [refreshDeliveryMap, orders]);

  useRealtimeOrders(store?.id, useCallback((orderId: string) => {
    setNewOrderId(orderId);
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGEcBj+a2teleUMfPJ3e35RNGQxFq9/bkUMFBl+84M13IgBhv+DMYR0Ab8Dayo0NAHjE28dvAwBy0t7AXwAAhu3srlIYAIfy7qhJEAB5//LjNQ0Aj/rxxywLAJf47M0uCwCn8eW/LQ0As+3ds0ATAMH06K49GADa4t6eWSYA");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  }, []));

  useEffect(() => {
    if (!newOrderId) return;
    const t = setTimeout(() => setNewOrderId(null), 10000);
    return () => clearTimeout(t);
  }, [newOrderId]);

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivery" | "pickup">("all");

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.id.toLowerCase().includes(q)
      );
    }
    if (deliveryFilter !== "all") {
      result = result.filter((o) => o.delivery_type === deliveryFilter);
    }
    return result;
  }, [orders, searchQuery, deliveryFilter]);

  const activeOrders = filteredOrders.filter((o) => !["delivered", "cancelled"].includes(o.status) && (o as any).order_type !== "preorder");
  const completedOrders = filteredOrders.filter((o) => ["delivered", "cancelled"].includes(o.status) && (o as any).order_type !== "preorder");
  const preorderOrders = filteredOrders.filter((o) => (o as any).order_type === "preorder");

  const completedToday = useMemo(() => {
    return orders.filter(o => o.status === "delivered" && isToday(new Date(o.created_at))).length;
  }, [orders]);

  const pendingCount = activeOrders.filter(o => o.status === "pending").length;
  const preparingCount = activeOrders.filter(o => o.status === "preparing").length;
  const readyCount = activeOrders.filter(o => o.status === "ready").length;
  const confirmedCount = activeOrders.filter(o => o.status === "confirmed").length;

  const columnOrders = useMemo(() => {
    const map: Record<string, typeof orders> = {};
    KANBAN_COLUMNS.forEach((col) => {
      map[col.status] = activeOrders
        .filter((o) => o.status === col.status)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    return map;
  }, [activeOrders]);

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    if (!store) return;
    updateStatus.mutate({ id: orderId, status, storeId: store.id }, {
      onSuccess: () => {
        if (status === "delivered") {
          setLastCompletedId(orderId);
          setTimeout(() => setLastCompletedId(null), 3000);
        }
      }
    });
  };

  const requestCancel = (orderId: string, paymentMethod?: string | null) => {
    setCancelTarget({ id: orderId, isOnline: paymentMethod === "online" });
  };

  const confirmCancel = () => {
    if (!cancelTarget || !store) return;
    handleStatusChange(cancelTarget.id, "cancelled");
    setCancelTarget(null);
  };

  if (storeLoading || ordersLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary text-white shadow-medium">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pedidos</h1>
            <p className="text-xs text-muted-foreground">
              {activeOrders.length} ativos · {orders.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-md transition-all ${viewMode === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Search — collapsible on mobile */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, telefone ou ID..."
          className="pl-10 h-10 sm:h-9 text-base sm:text-sm"
        />
      </div>

      {/* Delivery type filter chips */}
      <div className="flex gap-2">
        {([
          { key: "all" as const, label: "Todos", icon: "📋" },
          { key: "delivery" as const, label: "Entrega", icon: "🚚" },
          { key: "pickup" as const, label: "Retirada", icon: "🏪" },
        ]).map(({ key, label, icon }) => {
          const count = key === "all"
            ? orders.length
            : orders.filter((o) => o.delivery_type === key).length;
          const isActive = deliveryFilter === key;
          return (
            <button
              key={key}
              onClick={() => setDeliveryFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isActive
                  ? key === "delivery"
                    ? "bg-blue-500/15 text-blue-700 border-blue-500/40 ring-1 ring-blue-500/30 dark:text-blue-300"
                    : key === "pickup"
                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                    : "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              <span className={`ml-0.5 text-[10px] font-bold ${isActive ? "opacity-100" : "opacity-60"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="active">
        <TabsList className="h-10 w-full sm:w-auto">
          <TabsTrigger value="active" className="gap-1 sm:gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ativos</span>
            <span className="sm:hidden">{activeOrders.length}</span>
            <span className="hidden sm:inline">({activeOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1 sm:gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finalizados</span>
            <span className="sm:hidden">{completedOrders.length}</span>
            <span className="hidden sm:inline">({completedOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="preorders" className="gap-1 sm:gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Encomendas</span>
            <span className="sm:hidden">{preorderOrders.length}</span>
            <span className="hidden sm:inline">({preorderOrders.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {/* KPI Strip — horizontal scroll on mobile */}
          <div className="relative">
            <div className="flex sm:grid sm:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-card transition-all snap-start min-w-[140px] sm:min-w-0 shrink-0 sm:shrink ${pendingCount > 0 ? "border-yellow-500/40 ring-1 ring-yellow-500/10" : ""}`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${pendingCount > 0 ? "bg-yellow-500/15 animate-pulse" : "bg-muted"}`}>
                  <Clock className={`w-4 h-4 ${pendingCount > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight truncate">Aguardando</p>
                  <p className={`text-lg font-bold tabular-nums leading-tight ${pendingCount > 0 ? "text-yellow-600" : "text-foreground"}`}>{pendingCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card snap-start min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${confirmedCount > 0 ? "bg-blue-500/15" : "bg-muted"}`}>
                  <CheckCircle2 className={`w-4 h-4 ${confirmedCount > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight truncate">Confirmados</p>
                  <p className="text-lg font-bold tabular-nums leading-tight text-foreground">{confirmedCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card snap-start min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${preparingCount > 0 ? "bg-orange-500/15" : "bg-muted"}`}>
                  <ChefHat className={`w-4 h-4 ${preparingCount > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight truncate">Preparando</p>
                  <p className="text-lg font-bold tabular-nums leading-tight text-foreground">{preparingCount}</p>
                </div>
              </div>

              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-card snap-start min-w-[140px] sm:min-w-0 shrink-0 sm:shrink ${readyCount > 0 ? "border-green-500/40" : ""}`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${readyCount > 0 ? "bg-green-500/15" : "bg-muted"}`}>
                  <Package className={`w-4 h-4 ${readyCount > 0 ? "text-green-600" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight truncate">Prontos</p>
                  <p className={`text-lg font-bold tabular-nums leading-tight ${readyCount > 0 ? "text-green-600" : "text-foreground"}`}>{readyCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 snap-start min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-base">{completedToday >= 10 ? "🔥" : completedToday >= 5 ? "⚡" : "✅"}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight truncate">Entregues hoje</p>
                  <p className="text-lg font-bold tabular-nums leading-tight text-primary">{completedToday}</p>
                </div>
              </div>
            </div>
            {/* Fade gradient indicator on mobile */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
          </div>

          {lastCompletedId && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 animate-scale-in">
              <span className="text-xl">🎉</span>
              <span className="text-sm font-semibold text-green-700">Pedido entregue com sucesso!</span>
              {completedToday > 1 && (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs ml-auto">
                  {completedToday}x hoje {completedToday >= 5 ? "🔥" : ""}
                </Badge>
              )}
            </div>
          )}

          {viewMode === "kanban" ? (
            <DragDropKanban
              columns={KANBAN_COLUMNS}
              columnOrders={columnOrders}
              onStatusChange={handleStatusChange}
              onRequestCancel={requestCancel}
              onViewDetail={setDetailOrder}
              newOrderId={newOrderId}
              deliveryMap={deliveryMap}
              drivers={drivers}
              storeId={store?.id}
              onDriverAssigned={refreshDeliveryMap}
            />
          ) : (
            <OrderList orders={activeOrders} onStatusChange={handleStatusChange} onRequestCancel={requestCancel} onViewDetail={setDetailOrder} deliveryMap={deliveryMap} drivers={drivers} storeId={store?.id} onDriverAssigned={refreshDeliveryMap} />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <OrderList orders={completedOrders} onStatusChange={handleStatusChange} onRequestCancel={requestCancel} isCompleted onViewDetail={setDetailOrder} deliveryMap={deliveryMap} drivers={drivers} storeId={store?.id} onDriverAssigned={refreshDeliveryMap} />
        </TabsContent>

        <TabsContent value="preorders" className="mt-4">
          <PreorderBoard orders={preorderOrders} onStatusChange={handleStatusChange} onRequestCancel={requestCancel} onViewDetail={setDetailOrder} deliveryMap={deliveryMap} drivers={drivers} storeId={store?.id} onDriverAssigned={refreshDeliveryMap} />
        </TabsContent>
      </Tabs>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>Essa ação não pode ser desfeita. O estoque será restaurado automaticamente se já tiver sido descontado.</span>
              {cancelTarget?.isOnline && (
                <span className="block mt-3 p-3 rounded-lg bg-warning/10 border border-warning/30 text-foreground text-sm">
                  💳 <strong>Pagamento online detectado.</strong> O reembolso deve ser feito diretamente pelo app do provedor de pagamento.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrderDetailModal
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOrder(null);
            refreshDeliveryMap();
          }
        }}
        order={detailOrder}
        storeName={store?.name}
        storeId={store?.id}
        onStatusChange={handleStatusChange}
        onRequestCancel={requestCancel}
      />
    </div>
  );
}

/* ───── Drag & Drop Kanban ───── */

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`transition-all duration-200 ${isOver ? "ring-2 ring-primary/40 rounded-b-xl" : ""}`}>
      {children}
    </div>
  );
}

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      {children}
    </div>
  );
}

function DragDropKanban({
  columns,
  columnOrders,
  onStatusChange,
  onRequestCancel,
  onViewDetail,
  newOrderId,
  deliveryMap,
  drivers = [],
  storeId,
  onDriverAssigned,
}: {
  columns: typeof KANBAN_COLUMNS;
  columnOrders: Record<string, any[]>;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
  onViewDetail: (order: any) => void;
  newOrderId: string | null;
  deliveryMap: Record<string, { driverName: string; status: string }>;
  drivers?: { id: string; name: string }[];
  storeId?: string;
  onDriverAssigned?: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Find which order is being dragged
  const allOrders = Object.values(columnOrders).flat();
  const draggedOrder = activeId ? allOrders.find(o => o.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const orderId = active.id as string;
    const targetStatus = over.id as OrderStatus;

    // Find current status
    const order = allOrders.find(o => o.id === orderId);
    if (!order || order.status === targetStatus) return;

    // Only allow valid transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed"],
      confirmed: ["preparing"],
      preparing: ["ready"],
      ready: ["delivered"],
    };
    if (validTransitions[order.status]?.includes(targetStatus)) {
      // Block ready→delivered if driver is assigned and active
      if (order.status === "ready" && targetStatus === "delivered" && deliveryMap[orderId] && deliveryMap[orderId].status !== "delivered") {
        // Show toast-like feedback — can't use hook here, so just reject silently
        return;
      }
      onStatusChange(orderId, targetStatus);
    }
  };

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<string>("pending");

  if (isMobile) {
    // Mobile: Tabs por status
    return (
      <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
          {columns.map((col) => {
            const count = (columnOrders[col.status] || []).length;
            const isActive = mobileTab === col.status;
            return (
              <button
                key={col.status}
                onClick={() => setMobileTab(col.status)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all snap-start shrink-0 active:scale-[0.97] ${
                  isActive
                    ? `bg-gradient-to-b ${col.gradient} ${col.color} border-current shadow-sm`
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                {col.icon}
                <span className="tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {(() => {
            const orders = columnOrders[mobileTab] || [];
            if (orders.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-8 h-8 mb-2 opacity-30" />
                  <span className="text-xs">Nenhum pedido</span>
                </div>
              );
            }
            return orders.map((order) => (
              <div key={order.id} className="animate-fade-in">
                <KanbanCard order={order} onStatusChange={onStatusChange} onRequestCancel={onRequestCancel} onViewDetail={onViewDetail} newOrderId={newOrderId} deliveryMap={deliveryMap} drivers={drivers} storeId={storeId} onDriverAssigned={onDriverAssigned} />
              </div>
            ));
          })()}
        </div>
      </div>
    );
  }

  // Desktop: Drag & Drop Grid
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {columns.map((col) => {
          const orders = columnOrders[col.status] || [];
          return (
            <div key={col.status} className="flex flex-col min-h-[200px]">
              <div className={`flex items-center justify-between p-3 rounded-t-xl border bg-gradient-to-b ${col.gradient}`}>
                <div className="flex items-center gap-2">
                  <span className={col.color}>{col.icon}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {ORDER_STATUS_LABELS[col.status]}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs font-bold tabular-nums">
                  {orders.length}
                </Badge>
              </div>

              <DroppableColumn id={col.status}>
                <ScrollArea className="flex-1 max-h-[calc(100vh-340px)] min-h-[180px] border border-t-0 rounded-b-xl bg-muted/30 p-2">
                  <div className="space-y-2">
                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="w-8 h-8 mb-2 opacity-30" />
                        <span className="text-xs">Nenhum pedido</span>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <DraggableCard key={order.id} id={order.id}>
                          <KanbanCard order={order} onStatusChange={onStatusChange} onRequestCancel={onRequestCancel} onViewDetail={onViewDetail} newOrderId={newOrderId} deliveryMap={deliveryMap} drivers={drivers} storeId={storeId} onDriverAssigned={onDriverAssigned} />
                        </DraggableCard>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {draggedOrder ? (
          <div className="opacity-90 rotate-2 scale-105 shadow-2xl">
            <KanbanCard order={draggedOrder} onStatusChange={onStatusChange} onRequestCancel={onRequestCancel} onViewDetail={onViewDetail} newOrderId={null} deliveryMap={deliveryMap} drivers={drivers} storeId={storeId} onDriverAssigned={onDriverAssigned} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ───── Quick Assign Driver ───── */

const QuickAssignDriver = forwardRef<HTMLDivElement, {
  orderId: string;
  drivers: { id: string; name: string }[];
  storeId?: string;
  onAssigned?: () => void;
}>(function QuickAssignDriver({ orderId, drivers, storeId, onAssigned }, ref) {
  const [selectedDriver, setSelectedDriver] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedDriver || !storeId) return;
    setAssigning(true);
    try {
      const { error } = await supabase.rpc("assign_delivery", {
        p_order_id: orderId,
        p_driver_id: selectedDriver,
        p_store_id: storeId,
      });
      if (error) throw error;
      if (navigator.vibrate) navigator.vibrate(50);
      setSelectedDriver("");
      onAssigned?.();
    } catch (err) {
      console.error("Assign error:", err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div ref={ref} className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Select value={selectedDriver} onValueChange={setSelectedDriver}>
        <SelectTrigger className="h-7 text-[10px] flex-1 min-w-0 px-2 border-dashed border-primary/30 bg-primary/5">
          <SelectValue placeholder="🚚 Atribuir entregador" />
        </SelectTrigger>
        <SelectContent>
          {drivers.map((d) => (
            <SelectItem key={d.id} value={d.id} className="text-xs">
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedDriver && (
        <Button size="sm" className="h-7 px-2 text-[10px] font-semibold animate-scale-in" onClick={handleAssign} disabled={assigning}>
          <Truck className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
});

/* ───── Kanban Card ───── */

function KanbanCard({
  order,
  onStatusChange,
  onRequestCancel,
  onViewDetail,
  newOrderId,
  deliveryMap = {},
  drivers = [],
  storeId,
  onDriverAssigned,
}: {
  order: any;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
  onViewDetail: (order: any) => void;
  newOrderId: string | null;
  deliveryMap?: Record<string, { driverName: string; status: string }>;
  drivers?: { id: string; name: string }[];
  storeId?: string;
  onDriverAssigned?: () => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const next = NEXT_STATUS[order.status as OrderStatus];
  const isDelivery = String(order.delivery_type || "delivery").toLowerCase() !== "pickup";
  const elapsed = formatDistanceToNow(parseISO(order.created_at), { locale: ptBR, addSuffix: false });
  const orderTime = format(new Date(order.created_at), "HH:mm");

  const minutesElapsed = (Date.now() - new Date(order.created_at).getTime()) / 60000;
  const isUrgent = order.status === "pending" && minutesElapsed > 5;
  const timeUrgencyColor = minutesElapsed < 5
    ? "text-green-600 bg-green-500/10 border-green-500/30"
    : minutesElapsed < 15
    ? "text-yellow-600 bg-yellow-500/10 border-yellow-500/30"
    : "text-destructive bg-destructive/10 border-destructive/30 animate-pulse";

  const hasAdminNotes = !!(order as any).admin_notes;

  return (
    <div className={`bg-card rounded-lg border shadow-sm hover:shadow-md transition-all group ${isUrgent ? "border-destructive/50 ring-1 ring-destructive/20" : "border-border"} ${order.id === newOrderId ? "animate-new-order-glow" : ""}`} data-order-id={order.id}>
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-foreground">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${timeUrgencyColor}`}>
                <Timer className="w-2.5 h-2.5" />
                {Math.floor(minutesElapsed)}min
              </span>
              {hasAdminNotes && (
                <span className="text-[10px] text-amber-600" title="Tem nota interna">
                  <StickyNote className="w-3 h-3" />
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground truncate mt-0.5">
              {order.customer_name || "Cliente"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {order.customer_phone && (() => {
              const phone = order.customer_phone.replace(/\D/g, "");
              const msg = encodeURIComponent(`Olá ${order.customer_name || ""}! 👋`);
              return (
                <a
                  href={`https://wa.me/55${phone}?text=${msg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/25 text-[#25D366] transition-all hover:scale-110"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              );
            })()}
            <span className="text-sm font-bold text-primary whitespace-nowrap">
              R$ {order.total.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {orderTime} · {elapsed}
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 inline-flex items-center gap-0.5 ${isDelivery ? "bg-primary/10 text-primary border-primary/40" : "bg-muted text-foreground border-border"}`}>
            {isDelivery ? <Truck className="w-2.5 h-2.5 shrink-0" /> : <ShoppingBag className="w-2.5 h-2.5 shrink-0" />}
            <span>{isDelivery ? "Entrega" : "Retirada"}</span>
          </Badge>
          {order.payment_method && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              <CreditCard className="w-2.5 h-2.5 mr-0.5" />
              {PAYMENT_LABELS[order.payment_method] || order.payment_method}
            </Badge>
          )}
          {deliveryMap[order.id] && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 inline-flex items-center gap-0.5 bg-primary/10 text-primary border-primary/30">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span>{deliveryMap[order.id].driverName}</span>
            </Badge>
          )}
        </div>
        {order.status === "pending" && order.payment_method !== "online" && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-warning-foreground bg-warning/10 border border-warning/30 rounded px-1.5 py-0.5 w-fit">
            <Package className="w-2.5 h-2.5 shrink-0" />
            Estoque reservado ao aceitar
          </div>
        )}
      </div>

      <div className="px-3 pb-2">
        <p className="text-[11px] text-muted-foreground truncate">
          {order.items.map((item: any) => `${item.quantity}x ${item.product_name}`).join(", ")}
        </p>
        {order.items.some((item: any) => item.notes) && (
          <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
            📝 {order.items.filter((i: any) => i.notes).map((i: any) => i.notes).join("; ")}
          </p>
        )}
      </div>

      {order.customer_phone && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors flex-1">
            <Phone className="w-3 h-3" /> {order.customer_phone}
          </a>
          {(() => {
            const phone = order.customer_phone.replace(/\D/g, "");
            const statusPtBR: Record<string, string> = {
              pending: "pendente", confirmed: "confirmado", preparing: "sendo preparado",
              ready: "pronto para retirada/entrega", delivered: "entregue",
            };
            const statusText = statusPtBR[order.status] || order.status;
            const msg = encodeURIComponent(
              `Olá ${order.customer_name || ""}! 👋 Seu pedido está ${statusText}. Qualquer dúvida, é só chamar! 😊`
            );
            return (
              <a
                href={`https://wa.me/55${phone}?text=${msg}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/25 text-[#25D366] transition-all hover:scale-110 shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            );
          })()}
        </div>
      )}

      {isDelivery && order.customer_address && (
        <div className="mx-3 mb-2 p-1.5 rounded bg-muted/60 text-[10px] text-muted-foreground space-y-1">
          <div className="flex items-start gap-1">
            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{order.customer_address}</span>
          </div>
          {order.customer_maps_url && (
            <a href={order.customer_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-[10px] font-semibold">
              <ExternalLink className="w-3 h-3" /> Abrir no Maps
            </a>
          )}
        </div>
      )}

      {order.notes && (
        <div className="mx-3 mb-2 p-1.5 rounded bg-warning/10 text-[10px] text-foreground">
          📝 {order.notes}
        </div>
      )}

      {/* Quick assign driver — inline for delivery orders without driver */}
      {isDelivery && !deliveryMap[order.id] && drivers.length > 0 && ["confirmed", "preparing", "ready"].includes(order.status) && (
        <div className="px-2 pb-1.5">
          <QuickAssignDriver orderId={order.id} drivers={drivers} storeId={storeId} onAssigned={onDriverAssigned} />
        </div>
      )}

      <div className="p-2 pt-0 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-11 sm:h-8 px-3 text-xs gap-1.5 min-w-[48px]" onClick={(e) => { e.stopPropagation(); onViewDetail(order); }}>
          <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span className="sm:inline">Detalhes</span>
        </Button>
        {next && (() => {
          const delivery = deliveryMap[order.id];
          const hasActiveDelivery = delivery && delivery.status !== "delivered";
          if (order.status === "ready" && hasActiveDelivery) {
            return (
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/20 text-[10px] font-semibold text-primary">
                <Truck className="w-3 h-3 animate-pulse" />
                {delivery.status === "assigned" ? "Aguardando coleta" : "Em rota"}
              </div>
            );
          }
          return (
            <Button size="sm" className="flex-1 h-11 sm:h-8 text-sm sm:text-xs gap-1.5 font-semibold min-w-[48px]" onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, next.status); }}>
              {next.icon} {next.label} <ArrowRight className="w-3 h-3" />
            </Button>
          );
        })()}
        <Button size="sm" variant="ghost" className="h-11 sm:h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 min-w-[48px]" onClick={(e) => { e.stopPropagation(); onRequestCancel(order.id, order.payment_method); }}>
          <XCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ───── List View ───── */

function OrderList({
  orders,
  onStatusChange,
  onRequestCancel,
  isCompleted,
  onViewDetail,
  deliveryMap = {},
  drivers = [],
  storeId,
  onDriverAssigned,
}: {
  orders: any[];
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
  isCompleted?: boolean;
  onViewDetail: (order: any) => void;
  deliveryMap?: Record<string, { driverName: string; status: string }>;
  drivers?: { id: string; name: string }[];
  storeId?: string;
  onDriverAssigned?: () => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="w-12 h-12 mb-3 opacity-30" />
        <span className="text-sm font-medium">Nenhum pedido</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
      <div className="space-y-2 pr-2">
        {orders.map((order) => (
          <ListOrderRow key={order.id} order={order} onStatusChange={onStatusChange} onRequestCancel={onRequestCancel} isCompleted={isCompleted} onViewDetail={onViewDetail} deliveryMap={deliveryMap} drivers={drivers} storeId={storeId} onDriverAssigned={onDriverAssigned} />
        ))}
      </div>
    </ScrollArea>
  );
}

function ListOrderRow({
  order,
  onStatusChange,
  onRequestCancel,
  isCompleted,
  onViewDetail,
  deliveryMap = {},
  drivers = [],
  storeId,
  onDriverAssigned,
}: {
  order: any;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
  isCompleted?: boolean;
  onViewDetail: (order: any) => void;
  deliveryMap?: Record<string, { driverName: string; status: string }>;
  drivers?: { id: string; name: string }[];
  storeId?: string;
  onDriverAssigned?: () => void;
}) {
  const next = NEXT_STATUS[order.status as OrderStatus];
  const isDelivery = String(order.delivery_type || "delivery").toLowerCase() !== "pickup";
  const statusColor = ORDER_STATUS_COLORS[order.status as OrderStatus] || ORDER_STATUS_COLORS.pending;
  const orderTime = format(new Date(order.created_at), "HH:mm", { locale: ptBR });
  const orderDate = format(new Date(order.created_at), "dd/MM", { locale: ptBR });

  const delivery = deliveryMap[order.id];
  const hasActiveDriver = delivery && delivery.status !== "delivered";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-all group active:scale-[0.99]">
      {/* Top row: status icon + info + price */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${statusColor}`}>
          {order.status === "pending" && <Clock className="w-4 h-4" />}
          {order.status === "confirmed" && <CheckCircle2 className="w-4 h-4" />}
          {order.status === "preparing" && <ChefHat className="w-4 h-4" />}
          {order.status === "ready" && <Package className="w-4 h-4" />}
          {order.status === "delivered" && <Truck className="w-4 h-4" />}
          {order.status === "cancelled" && <XCircle className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono font-bold">#{order.id.slice(-6).toUpperCase()}</span>
            <Badge className={`${statusColor} border text-[10px] h-4 px-1.5`}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </Badge>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 inline-flex items-center gap-0.5 ${isDelivery ? "bg-primary/10 text-primary border-primary/40" : "bg-muted text-foreground border-border"}`}>
              {isDelivery ? <Truck className="w-2.5 h-2.5 shrink-0" /> : <ShoppingBag className="w-2.5 h-2.5 shrink-0" />}
              <span className="hidden sm:inline">{isDelivery ? "Entrega" : "Retirada"}</span>
            </Badge>
            {hasActiveDriver && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/30 inline-flex items-center gap-0.5">
                <Truck className="w-2.5 h-2.5" /> {delivery.driverName}
              </Badge>
            )}
            {(order as any).admin_notes && (
              <span className="text-amber-600" title="Nota interna"><StickyNote className="w-3 h-3" /></span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-medium truncate">{order.customer_name || "Cliente"}</span>
            <span className="text-xs text-muted-foreground">{orderDate} {orderTime}</span>
            <span className="text-sm font-bold text-primary ml-auto sm:hidden">R$ {order.total.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {order.items.map((i: any) => `${i.quantity}x ${i.product_name}${i.notes ? ` (${i.notes})` : ""}`).join(", ")}
          </div>
        </div>
      </div>

      {/* Quick assign for delivery orders */}
      {isDelivery && !hasActiveDriver && drivers.length > 0 && !isCompleted && ["confirmed", "preparing", "ready"].includes(order.status) && (
        <div className="pl-11 sm:pl-0 sm:ml-auto shrink-0 w-full sm:w-48">
          <QuickAssignDriver orderId={order.id} drivers={drivers} storeId={storeId} onAssigned={onDriverAssigned} />
        </div>
      )}

      {/* Actions row — full-width on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 sm:ml-0 pl-11 sm:pl-0">
        <span className="text-sm font-bold text-primary hidden sm:block">R$ {order.total.toFixed(2).replace(".", ",")}</span>
        <Button size="sm" variant="outline" className="h-9 sm:h-8 px-2.5 text-xs gap-1 min-w-[44px]" onClick={() => onViewDetail(order)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
        {!isCompleted && next && (
          hasActiveDriver && next.status === "delivered" ? (
            <Badge variant="outline" className="h-8 px-3 text-xs bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Com entregador
            </Badge>
          ) : (
            <Button size="sm" className="h-9 sm:h-8 text-xs gap-1 font-semibold flex-1 sm:flex-none min-w-[44px]" onClick={() => onStatusChange(order.id, next.status)}>
              {next.icon} <span className="truncate">{next.label}</span>
            </Button>
          )
        )}
        {!isCompleted && (
          <Button size="sm" variant="ghost" className="h-9 sm:h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 min-w-[44px]" onClick={() => onRequestCancel(order.id, order.payment_method)}>
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ───── Preorder Board ───── */

type PreorderFilter = "all" | "today" | "tomorrow" | "week";
type PreorderStatusFilter = "all" | "pending" | "confirmed" | "preparing" | "ready";

function PreorderBoard({
  orders,
  onStatusChange,
  onRequestCancel,
  onViewDetail,
  deliveryMap,
  drivers,
  storeId,
  onDriverAssigned,
}: {
  orders: any[];
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
  onViewDetail: (order: any) => void;
  deliveryMap: Record<string, { driverName: string; status: string }>;
  drivers: { id: string; name: string }[];
  storeId?: string;
  onDriverAssigned?: () => void;
}) {
  const [filter, setFilter] = useState<PreorderFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PreorderStatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activePreorders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const todayCount = useMemo(() => orders.filter(o => o.scheduled_date && isToday(new Date(o.scheduled_date + "T12:00:00"))).length, [orders]);
  const tomorrowCount = useMemo(() => orders.filter(o => o.scheduled_date && isTomorrow(new Date(o.scheduled_date + "T12:00:00"))).length, [orders]);
  const pendingDeposits = useMemo(() => {
    return orders
      .filter(o => o.deposit_amount > 0 && o.deposit_status !== "paid" && !["delivered", "cancelled"].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.deposit_amount || 0), 0);
  }, [orders]);

  // New KPIs: revenue expected + deposits received
  const expectedRevenue = useMemo(() => {
    return activePreorders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [activePreorders]);

  const depositsReceived = useMemo(() => {
    return orders
      .filter(o => o.deposit_amount > 0 && o.deposit_status === "paid" && !["cancelled"].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.deposit_amount || 0), 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Date filter
        if (filter !== "all") {
          if (!o.scheduled_date) return false;
          const d = new Date(o.scheduled_date + "T12:00:00");
          if (filter === "today" && !isToday(d)) return false;
          if (filter === "tomorrow" && !isTomorrow(d)) return false;
          if (filter === "week" && !isThisWeek(d, { locale: ptBR })) return false;
        }
        // Status filter
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date + "T" + (a.scheduled_time || "23:59") + ":00-03:00") : new Date("2099-01-01");
        const dateB = b.scheduled_date ? new Date(b.scheduled_date + "T" + (b.scheduled_time || "23:59") + ":00-03:00") : new Date("2099-01-01");
        return compareAsc(dateA, dateB);
      });
  }, [orders, filter, statusFilter]);

  // Group by date
  const groupedOrders = useMemo(() => {
    const groups: { key: string; label: string; sublabel: string; urgency: "today" | "tomorrow" | "future" | "none"; orders: any[] }[] = [];
    const map = new Map<string, any[]>();
    filteredOrders.forEach((o) => {
      const key = o.scheduled_date || "sem-data";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    map.forEach((groupOrders, key) => {
      if (key === "sem-data") {
        groups.push({ key, label: "Sem data", sublabel: "", urgency: "none", orders: groupOrders });
        return;
      }
      const d = new Date(key + "T12:00:00");
      const isTod = isToday(d);
      const isTom = isTomorrow(d);
      const dayName = isTod ? "HOJE" : isTom ? "AMANHÃ" : format(d, "EEEE", { locale: ptBR }).toUpperCase();
      const dateStr = format(d, "d 'de' MMM", { locale: ptBR });
      groups.push({ key, label: dayName, sublabel: dateStr, urgency: isTod ? "today" : isTom ? "tomorrow" : "future", orders: groupOrders });
    });
    return groups;
  }, [filteredOrders]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchAction = (status: OrderStatus) => {
    selectedIds.forEach(id => onStatusChange(id, status));
    setSelectedIds(new Set());
  };

  const filters: { key: PreorderFilter; label: string; count?: number }[] = [
    { key: "all", label: "Todos", count: orders.length },
    { key: "today", label: "Hoje", count: todayCount },
    { key: "tomorrow", label: "Amanhã", count: tomorrowCount },
    { key: "week", label: "Esta semana" },
  ];

  const statusFilters: { key: PreorderStatusFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Todos", icon: null },
    { key: "pending", label: "Pendentes", icon: <Clock className="w-3 h-3" /> },
    { key: "confirmed", label: "Confirmados", icon: <CheckCircle2 className="w-3 h-3" /> },
    { key: "preparing", label: "Preparando", icon: <ChefHat className="w-3 h-3" /> },
    { key: "ready", label: "Prontos", icon: <Package className="w-3 h-3" /> },
  ];

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium mb-1">Nenhuma encomenda</p>
        <p className="text-xs text-muted-foreground/70 max-w-xs text-center">
          Quando seus clientes fizerem pedidos agendados, eles aparecerão aqui organizados por data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Strip — horizontal scroll on mobile */}
      <div className="relative">
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border bg-card snap-start min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Total Ativas</p>
              <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{activePreorders.length}</p>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border bg-card snap-start min-w-[130px] sm:min-w-0 shrink-0 sm:shrink ${todayCount > 0 ? "border-destructive/40 ring-1 ring-destructive/10" : ""}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${todayCount > 0 ? "bg-destructive/15 animate-pulse" : "bg-muted"}`}>
              <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${todayCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Hoje</p>
              <p className={`text-lg sm:text-xl font-bold tabular-nums ${todayCount > 0 ? "text-destructive" : "text-foreground"}`}>{todayCount}</p>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border bg-card snap-start min-w-[130px] sm:min-w-0 shrink-0 sm:shrink ${tomorrowCount > 0 ? "border-yellow-500/40" : ""}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${tomorrowCount > 0 ? "bg-yellow-500/15" : "bg-muted"}`}>
              <CalendarDays className={`w-4 h-4 sm:w-5 sm:h-5 ${tomorrowCount > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Amanhã</p>
              <p className={`text-lg sm:text-xl font-bold tabular-nums ${tomorrowCount > 0 ? "text-yellow-600" : "text-foreground"}`}>{tomorrowCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border bg-card snap-start min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Receita</p>
              <p className="text-base sm:text-lg font-bold tabular-nums text-green-600">
                R$ {expectedRevenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border bg-card snap-start min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${depositsReceived > 0 ? "bg-green-500/15" : "bg-muted"}`}>
              <Wallet className={`w-4 h-4 sm:w-5 sm:h-5 ${depositsReceived > 0 ? "text-green-600" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Sinais ✓</p>
              <p className={`text-base sm:text-lg font-bold tabular-nums ${depositsReceived > 0 ? "text-green-600" : "text-foreground"}`}>
                R$ {depositsReceived.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border bg-card snap-start min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${pendingDeposits > 0 ? "bg-yellow-500/15" : "bg-muted"}`}>
              <CreditCard className={`w-4 h-4 sm:w-5 sm:h-5 ${pendingDeposits > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Sinais ⏳</p>
              <p className={`text-base sm:text-lg font-bold tabular-nums ${pendingDeposits > 0 ? "text-yellow-600" : "text-foreground"}`}>
                R$ {pendingDeposits.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </p>
            </div>
          </div>
        </div>
        {/* Fade gradient indicator on mobile */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
      </div>

      {/* Date filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {f.label}
            {f.key === "today" && todayCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center animate-pulse">
                {todayCount}
              </span>
            )}
            {f.key !== "today" && f.count !== undefined && f.count > 0 && (
              <span className="text-[10px] opacity-70">({f.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mr-1">Status:</span>
        {statusFilters.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setStatusFilter(sf.key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
              statusFilter === sf.key
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {sf.icon}
            {sf.label}
          </button>
        ))}
      </div>

      {/* Timeline grouped by date */}
      {groupedOrders.length > 0 ? (
        <div className="space-y-6">
          {groupedOrders.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm ${
                  group.urgency === "today"
                    ? "bg-destructive/15 text-destructive border border-destructive/30"
                    : group.urgency === "tomorrow"
                    ? "bg-yellow-500/15 text-yellow-700 border border-yellow-500/30"
                    : "bg-muted text-foreground border border-border"
                }`}>
                  <CalendarDays className="w-4 h-4" />
                  {group.label}
                  {group.sublabel && <span className="text-xs font-normal opacity-70">· {group.sublabel}</span>}
                  <Badge variant="secondary" className="text-[10px] font-bold ml-1">{group.orders.length}</Badge>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.orders.map((order) => (
                  <PreorderCard
                    key={order.id}
                    order={order}
                    onStatusChange={onStatusChange}
                    onRequestCancel={onRequestCancel}
                    onViewDetail={onViewDetail}
                    isSelected={selectedIds.has(order.id)}
                    onToggleSelect={toggleSelect}
                    deliveryMap={deliveryMap}
                    drivers={drivers}
                    storeId={storeId}
                    onDriverAssigned={onDriverAssigned}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhuma encomenda para este período.
        </div>
      )}

      {/* Batch action bar — compact on mobile */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-[calc(100%-2rem)] sm:w-auto max-w-lg">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-foreground text-background shadow-2xl border border-background/10">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-sm font-bold tabular-nums">{selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-background/70 hover:text-background sm:hidden" onClick={() => setSelectedIds(new Set())}>
                ✕
              </Button>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <Button size="sm" variant="secondary" className="h-7 sm:h-8 text-xs font-semibold gap-1 shrink-0 flex-1 sm:flex-none" onClick={() => handleBatchAction("confirmed")}>
                <CheckCircle2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Aceitar</span><span className="sm:hidden">✓</span>
              </Button>
              <Button size="sm" variant="secondary" className="h-7 sm:h-8 text-xs font-semibold gap-1 shrink-0 flex-1 sm:flex-none" onClick={() => handleBatchAction("preparing")}>
                <ChefHat className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preparar</span><span className="sm:hidden">🍳</span>
              </Button>
              <Button size="sm" variant="secondary" className="h-7 sm:h-8 text-xs font-semibold gap-1 shrink-0 flex-1 sm:flex-none" onClick={() => handleBatchAction("ready")}>
                <Package className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pronto</span><span className="sm:hidden">📦</span>
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background/70 hover:text-background hidden sm:inline-flex" onClick={() => setSelectedIds(new Set())}>
              Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Preorder Card with Countdown ───── */

const PreorderCard = React.forwardRef<HTMLDivElement, {
  order: any;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onRequestCancel: (id: string, paymentMethod?: string | null) => void;
  onViewDetail: (order: any) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  deliveryMap: Record<string, { driverName: string; status: string }>;
  drivers: { id: string; name: string }[];
  storeId?: string;
  onDriverAssigned?: () => void;
}>(({
  order,
  onStatusChange,
  onRequestCancel,
  onViewDetail,
  isSelected,
  onToggleSelect,
  deliveryMap,
  drivers,
  storeId,
  onDriverAssigned,
}, ref) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const next = NEXT_STATUS[order.status as OrderStatus];
  const statusColor = ORDER_STATUS_COLORS[order.status as OrderStatus] || ORDER_STATUS_COLORS.pending;
  const isDelivery = String(order.delivery_type || "delivery").toLowerCase() !== "pickup";
  const hasAdminNotes = !!(order as any).admin_notes;

  // Countdown
  const scheduledDate = order.scheduled_date ? new Date(order.scheduled_date + "T" + (order.scheduled_time || "12:00") + ":00") : null;
  const now = new Date();
  const isScheduledToday = order.scheduled_date ? isToday(new Date(order.scheduled_date + "T12:00:00")) : false;
  const isScheduledTomorrow = order.scheduled_date ? isTomorrow(new Date(order.scheduled_date + "T12:00:00")) : false;

  let countdownText = "";
  let countdownUrgency: "green" | "yellow" | "red" | "pulse" = "green";
  if (scheduledDate) {
    const hoursLeft = differenceInHours(scheduledDate, now);
    const minsLeft = differenceInMinutes(scheduledDate, now) % 60;
    if (hoursLeft < 0) {
      countdownText = "⚠️ Atrasado!";
      countdownUrgency = "pulse";
    } else if (hoursLeft < 2) {
      countdownText = `⏱ ${hoursLeft}h ${minsLeft}min`;
      countdownUrgency = "pulse";
    } else if (hoursLeft < 4) {
      countdownText = `⏱ ${hoursLeft}h ${minsLeft}min`;
      countdownUrgency = "red";
    } else if (hoursLeft < 24) {
      countdownText = `⏱ ${hoursLeft}h`;
      countdownUrgency = "yellow";
    } else {
      const daysLeft = Math.floor(hoursLeft / 24);
      countdownText = `⏱ ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`;
      countdownUrgency = "green";
    }
  }

  const countdownColors = {
    green: "text-green-600 bg-green-500/10 border-green-500/30",
    yellow: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30",
    red: "text-destructive bg-destructive/10 border-destructive/30",
    pulse: "text-destructive bg-destructive/10 border-destructive/30 animate-pulse",
  };

  const urgencyBarColor = isScheduledToday
    ? "bg-destructive"
    : isScheduledTomorrow
    ? "bg-yellow-500"
    : "bg-primary/30";

  const remainingBalance = order.deposit_amount && order.deposit_status === "paid"
    ? order.total - Number(order.deposit_amount)
    : null;

  return (
    <div className={`bg-card rounded-xl border shadow-sm hover:shadow-md transition-all flex overflow-hidden ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}>
      {/* Left urgency bar */}
      <div className={`w-1.5 shrink-0 ${urgencyBarColor} ${countdownUrgency === "pulse" ? "animate-pulse" : ""}`} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="p-3 pb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(order.id)}
              className="shrink-0"
            />
            {order.scheduled_time && (
              <span className="text-lg font-bold text-foreground tabular-nums shrink-0">
                {order.scheduled_time}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {order.customer_name || "Cliente"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground">
                  #{order.id.slice(-6).toUpperCase()}
                </span>
                {hasAdminNotes && (
                  <span className="text-amber-600" title="Nota interna">
                    <StickyNote className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={`${statusColor} border text-[10px] h-5 px-1.5`}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </Badge>
            {countdownText && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${countdownColors[countdownUrgency]}`}>
                {countdownText}
              </span>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 inline-flex items-center gap-0.5 ${isDelivery ? "bg-primary/10 text-primary border-primary/40" : "bg-muted text-foreground border-border"}`}>
            {isDelivery ? <Truck className="w-2.5 h-2.5 shrink-0" /> : <ShoppingBag className="w-2.5 h-2.5 shrink-0" />}
            <span>{isDelivery ? "Entrega" : "Retirada"}</span>
          </Badge>
          {order.payment_method && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              <CreditCard className="w-2.5 h-2.5 mr-0.5" />
              {PAYMENT_LABELS[order.payment_method] || order.payment_method}
            </Badge>
          )}
          {deliveryMap[order.id] && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 inline-flex items-center gap-0.5 bg-primary/10 text-primary border-primary/30">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span>{deliveryMap[order.id].driverName}</span>
            </Badge>
          )}
        </div>

        {/* Deposit / balance */}
        {order.deposit_amount > 0 && (
          <div className="mx-3 mb-2 p-2 rounded-lg border bg-muted/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">💰 Sinal</span>
              <span className={`text-xs font-bold ${order.deposit_status === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                R$ {Number(order.deposit_amount).toFixed(2).replace(".", ",")}
                {order.deposit_status === "paid" ? " ✓" : " ⏳"}
              </span>
            </div>
            {remainingBalance !== null && remainingBalance > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Restante</span>
                <span className="text-sm font-bold text-primary">
                  R$ {remainingBalance.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="px-3 pb-2">
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {order.items.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="truncate pr-2">{item.quantity}x {item.product_name}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  R$ {(item.total_price || item.unit_price * item.quantity).toFixed(2).replace(".", ",")}
                </span>
              </div>
            ))}
            {order.items.length > 3 && (
              <span className="text-[10px] text-muted-foreground/70">+{order.items.length - 3} itens</span>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-bold text-primary tabular-nums">
            R$ {order.total.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Quick assign driver for delivery preorders */}
        {isDelivery && !deliveryMap[order.id] && drivers.length > 0 && ["confirmed", "preparing", "ready"].includes(order.status) && (
          <div className="px-2 pb-1.5">
            <QuickAssignDriver orderId={order.id} drivers={drivers} storeId={storeId} onAssigned={onDriverAssigned} />
          </div>
        )}

        {/* Actions */}
        <div className="p-2 pt-0 flex flex-wrap gap-1.5 border-t border-border/50 mt-1">
          <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1" onClick={() => onViewDetail(order)}>
            <Eye className="w-3 h-3" /> <span className="hidden sm:inline">Detalhes</span>
          </Button>
          {order.customer_phone && (
            <a
              href={`https://wa.me/55${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${order.customer_name || ""}! 📦 Sobre sua encomenda para ${scheduledDate ? format(scheduledDate, "dd/MM") : "a data agendada"}${order.scheduled_time ? ` às ${order.scheduled_time}` : ""}, `)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-accent transition-colors shrink-0"
              title="WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
            </a>
          )}
          {next && (() => {
            const delivery = deliveryMap[order.id];
            const hasActiveDelivery = delivery && delivery.status !== "delivered";
            if (order.status === "ready" && hasActiveDelivery) {
              return (
                <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/20 text-[10px] font-semibold text-primary">
                  <Truck className="w-3 h-3 animate-pulse" />
                  {delivery.status === "assigned" ? "Aguardando coleta" : "Em rota"}
                </div>
              );
            }
            return (
              <Button size="sm" className="flex-1 h-8 text-xs gap-1 font-semibold min-w-0" onClick={() => onStatusChange(order.id, next.status)}>
                {next.icon} <span className="truncate">{next.label}</span> <ArrowRight className="w-3 h-3 shrink-0" />
              </Button>
            );
          })()}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRequestCancel(order.id, order.payment_method)}
          >
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});
PreorderCard.displayName = "PreorderCard";
