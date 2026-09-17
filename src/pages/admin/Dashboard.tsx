import { forwardRef, useMemo, useState } from "react";
import { useMyStore, useProducts, useCategories } from "@/hooks/useStore";
import { useLowStockIngredients, useProductProfitability } from "@/hooks/useIngredients";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useOrders, Order, OrderStatus, ORDER_STATUS_LABELS } from "@/hooks/useOrders";
import { useVisitorCount } from "@/hooks/useStorePresence";
import { useStoreCustomers } from "@/hooks/useCustomers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Package, Eye, TrendingUp, Copy, ExternalLink, Sparkles,
  ShoppingCart, DollarSign, Users, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Clock, Star, PackageX, Zap, Target,
  TrendingDown, Award, BarChart3, Tag, MessageCircle,
  CheckCircle2, XCircle, Timer, Wallet, CalendarDays, MapPin,
  Shield, Image, CreditCard, Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Helpers ──────────────────────────────────────────────
function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(dateStr: string) {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  return d >= weekAgo && d <= now;
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Hook: Checkouts resumo ───────────────────────────────
function useCheckoutStats(storeId: string | undefined) {
  return useQuery({
    queryKey: ["checkout-stats", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("pending_checkouts")
        .select("id, status, total, customer_name, customer_phone, created_at, expires_at")
        .eq("store_id", storeId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

// ── Component ────────────────────────────────────────────
export default function Dashboard() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data: products, isLoading: productsLoading } = useProducts(store?.id);
  const { data: categories } = useCategories(store?.id);
  const { data: orders, isLoading: ordersLoading } = useOrders(store?.id);
  const { data: customers } = useStoreCustomers(store?.id);
  const { data: checkouts } = useCheckoutStats(store?.id);
  const { data: deliveryZones } = useDeliveryZones(store?.id);
  const { data: lowStockIngredients } = useLowStockIngredients(store?.id);
  const { data: profitData } = useProductProfitability(store?.id);
  const visitorCount = useVisitorCount(store?.slug);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState(false);

  const storeUrl = store?.slug ? `${window.location.origin}/loja/${store.slug}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Link copiado!");
  };

  // ── Computed Metrics ──────────────────────────────────
  const metrics = useMemo(() => {
    if (!orders) return null;

    const activeOrders = orders.filter(o => o.status !== "cancelled");
    const todayOrders = activeOrders.filter(o => isToday(o.created_at));
    const yesterdayOrders = activeOrders.filter(o => isYesterday(o.created_at));
    const weekOrders = activeOrders.filter(o => isThisWeek(o.created_at));

    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0);
    const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);

    const avgTicket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
    const todayAvgTicket = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    const pendingOrders = orders.filter(o => o.status === "pending");
    const preparingOrders = orders.filter(o => o.status === "preparing");
    const readyOrders = orders.filter(o => o.status === "ready");

    const conversionRate = visitorCount > 0 && todayOrders.length > 0
      ? Math.min(100, Math.round((todayOrders.length / visitorCount) * 100))
      : 0;

    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    weekOrders.forEach(o => {
      o.items.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
        }
        productSales[item.product_id].qty += item.quantity;
        productSales[item.product_id].revenue += item.total_price;
      });
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueChange = percentChange(todayRevenue, yesterdayRevenue);
    const ordersChange = percentChange(todayOrders.length, yesterdayOrders.length);

      // Preorder metrics
      const today = new Date().toISOString().split("T")[0];
      const upcomingPreorders = activeOrders.filter(o =>
        o.order_type === "preorder" && o.scheduled_date && o.scheduled_date >= today && o.status !== "cancelled"
      );
      const pendingDeposits = activeOrders.filter(o =>
        (o.deposit_amount ?? 0) > 0 && o.deposit_status !== "paid" && o.status !== "cancelled"
      );
      const pendingDepositTotal = pendingDeposits.reduce((s, o) => s + (o.deposit_amount || 0), 0);

    return {
      todayRevenue, yesterdayRevenue, weekRevenue, totalRevenue,
      todayOrders: todayOrders.length, yesterdayOrders: yesterdayOrders.length,
      totalOrders: activeOrders.length, avgTicket, todayAvgTicket,
      pendingOrders, preparingOrders, readyOrders,
      revenueChange, ordersChange, conversionRate, topProducts,
      upcomingPreorders, pendingDeposits, pendingDepositTotal,
    };
  }, [orders, visitorCount]);

  // ── Checkout Stats ───────────────────────────────────
  const checkoutStats = useMemo(() => {
    if (!checkouts) return null;
    const paid = checkouts.filter(c => c.status === "paid");
    const expired = checkouts.filter(c => c.status === "expired");
    const pending = checkouts.filter(c => c.status === "pending");
    const paidTotal = paid.reduce((s, c) => s + c.total, 0);
    const expiredTotal = expired.reduce((s, c) => s + c.total, 0);
    const conversionRate = (paid.length + expired.length) > 0
      ? Math.round((paid.length / (paid.length + expired.length)) * 100)
      : 0;
    // Checkouts expirados recentes (últimas 48h) para recuperação
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const recoverable = expired.filter(c => new Date(c.created_at) >= twoDaysAgo);
    return { paid, expired, pending, paidTotal, expiredTotal, conversionRate, recoverable };
  }, [checkouts]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p.stock_enabled && p.stock_quantity !== null && p.stock_quantity <= 5 && p.available)
      .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
      .slice(0, 5);
  }, [products]);

  const outOfStock = useMemo(() => {
    if (!products) return [];
    return products.filter(p => !p.available || (p.stock_enabled && p.stock_quantity === 0));
  }, [products]);

  if (storeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const loading = productsLoading || ordersLoading;

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* ── Welcome ── */}
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display flex items-center gap-2">
            <span className="text-3xl">👋</span> Olá!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aqui está o resumo da sua loja hoje
          </p>
        </div>
        {visitorCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-bold text-green-600">{visitorCount}</span>
            <span className="text-xs text-green-600/80 hidden sm:inline">online agora</span>
          </div>
        )}
      </div>

      {/* ── Urgent Alerts ── */}
      {metrics && metrics.pendingOrders.length > 0 && (
        <Link to="/admin/orders">
          <Card className="border-yellow-500/30 bg-yellow-500/5 shadow-soft animate-slide-up cursor-pointer hover:shadow-medium transition-all group">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-yellow-600 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">
                  {metrics.pendingOrders.length} pedido{metrics.pendingOrders.length > 1 ? "s" : ""} aguardando confirmação
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clique para gerenciar → Clientes esperando!
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-yellow-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── Low Stock Ingredients Alert ── */}
      {lowStockIngredients && lowStockIngredients.length > 0 && (
        <Link to="/admin/ingredients">
          <Card className="border-orange-500/30 bg-orange-500/5 shadow-soft animate-slide-up cursor-pointer hover:shadow-medium transition-all group">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <PackageX className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">
                  {lowStockIngredients.length} insumo{lowStockIngredients.length > 1 ? "s" : ""} em alerta de estoque
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {lowStockIngredients.slice(0, 3).map(i => i.name).join(", ")}
                  {lowStockIngredients.length > 3 ? "…" : ""} — reponha antes que acabe
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-orange-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── Store Link ── */}
      <Card className="relative overflow-hidden border-primary/20 shadow-soft animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5" />
        <CardContent className="relative p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <code className="flex-1 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs border border-border font-medium truncate block">
                {storeUrl}
              </code>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={copyLink} size="sm" className="rounded-lg">
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
              </Button>
              <Button size="sm" className="rounded-lg gradient-primary text-white border-0" asChild>
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Primary Metrics (Today-focused) ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Faturamento Hoje"
          value={loading ? null : formatCurrency(metrics?.todayRevenue ?? 0)}
          change={metrics?.revenueChange}
          icon={DollarSign}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          gradient="from-green-500/10 to-emerald-500/10"
          delay={0}
        />
        <MetricCard
          title="Pedidos Hoje"
          value={loading ? null : String(metrics?.todayOrders ?? 0)}
          change={metrics?.ordersChange}
          icon={ShoppingCart}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
          gradient="from-blue-500/10 to-cyan-500/10"
          delay={50}
        />
        <MetricCard
          title="Ticket Médio"
          value={loading ? null : formatCurrency(metrics?.avgTicket ?? 0)}
          subtitle="geral"
          icon={Target}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
          gradient="from-purple-500/10 to-pink-500/10"
          delay={100}
        />
        <MetricCard
          title="Conversão"
          value={loading ? null : `${metrics?.conversionRate ?? 0}%`}
          subtitle={visitorCount > 0 ? `${visitorCount} visitantes` : "sem visitantes"}
          icon={Zap}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          gradient="from-amber-500/10 to-yellow-500/10"
          delay={150}
        />
      </div>

      {/* ── Revenue Summary ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <MiniStat label="Ontem" value={formatCurrency(metrics?.yesterdayRevenue ?? 0)} loading={loading} />
        <MiniStat label="Esta semana" value={formatCurrency(metrics?.weekRevenue ?? 0)} loading={loading} />
        <MiniStat label="Total" value={formatCurrency(metrics?.totalRevenue ?? 0)} loading={loading} />
      </div>

      {/* ── Store Health Score ── */}
      <StoreHealthCard store={store} products={products} categories={categories} deliveryZones={deliveryZones} />

      {/* ── Delivery Zones Overview ── */}
      {store?.delivery_zone_enabled && deliveryZones && deliveryZones.length > 0 && (
        <Card className="shadow-soft animate-slide-up border-primary/10 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Zonas de Entrega ({deliveryZones.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {deliveryZones.filter(z => z.is_active).map(z => (
              <div key={z.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{z.label}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  R$ {Number(z.delivery_fee).toFixed(2).replace(".", ",")}
                </Badge>
              </div>
            ))}
            {deliveryZones.filter(z => !z.is_active).length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                +{deliveryZones.filter(z => !z.is_active).length} zona(s) desativada(s)
              </p>
            )}
            <Link to="/admin/settings">
              <Button variant="ghost" size="sm" className="w-full text-xs text-primary hover:bg-primary/10 mt-1">
                Gerenciar zonas <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}


      {checkoutStats && (checkoutStats.paid.length + checkoutStats.expired.length + checkoutStats.pending.length) > 0 && (
        <Card className="shadow-soft animate-slide-up border-primary/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Checkouts Recentes (30 dias)
              </CardTitle>
              {checkoutStats.recoverable.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:bg-primary/10 h-7 gap-1"
                  onClick={() => setShowCheckoutSheet(true)}
                >
                  Recuperar ({checkoutStats.recoverable.length})
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {/* Conversion Rate destaque */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Taxa de Conversão</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-primary font-display">{checkoutStats.conversionRate}%</span>
                  <Progress value={checkoutStats.conversionRate} className="flex-1 h-2" />
                </div>
              </div>
            </div>

            {/* Status grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Pagos</span>
                </div>
                <p className="text-xl font-bold text-green-700">{checkoutStats.paid.length}</p>
                <p className="text-[10px] text-green-600/80 mt-0.5">{formatCurrency(checkoutStats.paidTotal)}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">Expirados</span>
                </div>
                <p className="text-xl font-bold text-destructive">{checkoutStats.expired.length}</p>
                <p className="text-[10px] text-destructive/80 mt-0.5">{formatCurrency(checkoutStats.expiredTotal)}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Timer className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">Pendentes</span>
                </div>
                <p className="text-xl font-bold text-amber-700">{checkoutStats.pending.length}</p>
                <p className="text-[10px] text-amber-600/80 mt-0.5">em aberto</p>
              </div>
            </div>

            {/* Loss aversion insight */}
            {checkoutStats.expiredTotal > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/15">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">
                  {formatCurrency(checkoutStats.expiredTotal)} em vendas perdidas — recupere via WhatsApp
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Urgent Preorder Countdown ── */}
      {metrics && (metrics.upcomingPreorders?.length ?? 0) > 0 && (() => {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

        const urgentOrders = metrics.upcomingPreorders!
          .filter((o) => o.scheduled_date === todayStr || o.scheduled_date === tomorrowStr)
          .sort((a, b) => {
            const da = `${a.scheduled_date}T${a.scheduled_time || "23:59"}`;
            const db = `${b.scheduled_date}T${b.scheduled_time || "23:59"}`;
            return da.localeCompare(db);
          })
          .slice(0, 4);

        if (urgentOrders.length === 0) return null;

        return (
          <Card className="shadow-soft border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent animate-slide-up overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-violet-600" />
                  🔥 Encomendas Urgentes
                </CardTitle>
                <Link to="/admin/orders">
                  <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:bg-violet-500/10 h-7 gap-1">
                    Ver todas <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              {urgentOrders.map((o) => {
                const isToday = o.scheduled_date === todayStr;
                const scheduledAt = new Date(`${o.scheduled_date}T${o.scheduled_time || "23:59"}:00-03:00`);
                const diffMs = scheduledAt.getTime() - now.getTime();
                const diffH = Math.max(0, Math.floor(diffMs / 3600000));
                const diffM = Math.max(0, Math.floor((diffMs % 3600000) / 60000));
                const isUrgent = diffMs > 0 && diffH < 2;
                const isPast = diffMs <= 0;

                return (
                  <div
                    key={o.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isPast
                        ? "bg-destructive/10 border-destructive/30"
                        : isUrgent
                          ? "bg-destructive/5 border-destructive/20 animate-pulse"
                          : isToday
                            ? "bg-warning/5 border-warning/20"
                            : "bg-muted/30 border-border/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                      isPast ? "bg-destructive/20 text-destructive" :
                      isUrgent ? "bg-destructive/15 text-destructive" :
                      isToday ? "bg-warning/15 text-warning" :
                      "bg-violet-500/10 text-violet-600"
                    }`}>
                      {isPast ? "⚠️" : `${diffH}h`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {o.customer_name || "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isToday ? "Hoje" : "Amanhã"} às {o.scheduled_time || "—"} • {formatCurrency(o.total)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {isPast ? (
                        <span className="text-[10px] font-bold text-destructive">ATRASADO</span>
                      ) : (
                        <span className={`text-[10px] font-bold ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
                          {diffH > 0 ? `${diffH}h ${diffM}min` : `${diffM}min`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Preorder Metrics ── */}
      {metrics && ((metrics.upcomingPreorders?.length ?? 0) > 0 || (metrics.pendingDeposits?.length ?? 0) > 0) && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {(metrics.upcomingPreorders?.length ?? 0) > 0 && (
            <Card className="shadow-soft border-violet-500/20 animate-slide-up overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
              <CardContent className="relative p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Encomendas Agendadas</p>
                  <p className="text-2xl font-bold text-violet-600 font-display">{metrics.upcomingPreorders!.length}</p>
                </div>
                <Link to="/admin/orders">
                  <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:bg-violet-500/10 h-7 gap-1">
                    Ver <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {(metrics.pendingDeposits?.length ?? 0) > 0 && (
            <Card className="shadow-soft border-yellow-500/20 animate-slide-up overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
              <CardContent className="relative p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Depósitos Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600 font-display">{metrics.pendingDeposits!.length}</p>
                  <p className="text-[10px] text-yellow-600/80">{formatCurrency(metrics.pendingDepositTotal!)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {(metrics.upcomingPreorders?.length ?? 0) > 0 && (
            <Card className="shadow-soft animate-slide-up sm:col-span-2 lg:col-span-1">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Próximas Entregas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2">
                {metrics.upcomingPreorders!
                  .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))
                  .slice(0, 3)
                  .map((o) => (
                    <div key={o.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/40">
                      <CalendarDays className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span className="text-xs font-semibold text-violet-600">
                        {o.scheduled_date ? format(new Date(o.scheduled_date + "T12:00:00"), "dd/MM") : "—"}
                      </span>
                      <span className="text-xs text-foreground truncate flex-1">{o.customer_name || "Cliente"}</span>
                      <span className="text-xs font-bold text-foreground shrink-0">{formatCurrency(o.total)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Profit Vision Card ── */}
      {profitData && profitData.length > 0 && (() => {
        const avgMargin = Math.round(profitData.reduce((s, p) => s + p.margin, 0) / profitData.length);
        const totalPotentialProfit = profitData.reduce((s, p) => s + p.potentialProfit, 0);
        const top3 = profitData.slice(0, 3);
        return (
          <Card className="shadow-soft border-green-500/20 animate-slide-up overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/3 pointer-events-none" />
            <CardHeader className="relative p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-700">
                  <TrendingUp className="w-4 h-4" /> Visão de Lucro
                </CardTitle>
                <Link to="/admin/ingredients">
                  <Button variant="ghost" size="sm" className="text-xs text-green-600 hover:bg-green-500/10 h-7 gap-1">
                    Detalhes <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="relative p-4 pt-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-[10px] text-green-600/80 font-medium">Margem Média</p>
                  <p className={`text-2xl font-bold ${avgMargin >= 40 ? "text-green-700" : avgMargin >= 25 ? "text-yellow-600" : "text-destructive"}`}>
                    {avgMargin}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[10px] text-emerald-600/80 font-medium">Lucro Potencial</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPotentialProfit)}</p>
                  <p className="text-[9px] text-muted-foreground">no estoque</p>
                </div>
              </div>
              {top3.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Margens</p>
                  {top3.map((p, i) => (
                    <div key={p.productId} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/30">
                      <span className="text-xs font-bold text-green-600 w-5">{i + 1}°</span>
                      <span className="text-xs font-medium truncate flex-1">{p.productName}</span>
                      <Badge className={`text-[10px] border-0 ${p.margin >= 50 ? "bg-green-600 text-white" : p.margin >= 30 ? "bg-yellow-500 text-white" : "bg-destructive text-white"}`}>
                        {p.margin}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Low Stock Ingredients Alert ── */}
      {lowStockIngredients && lowStockIngredients.length > 0 && (
        <Card className="shadow-soft border-orange-500/20 animate-slide-up overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <CardHeader className="relative p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700">
                <AlertTriangle className="w-4 h-4" /> Insumos com Estoque Baixo
              </CardTitle>
              <Link to="/admin/ingredients">
                <Button variant="ghost" size="sm" className="text-xs text-orange-600 hover:bg-orange-500/10 h-7 gap-1">
                  Ver todos <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="relative p-4 pt-1 space-y-2">
            {lowStockIngredients.slice(0, 5).map((ing) => {
              const pct = ing.min_stock_alert > 0 ? Math.min(100, Math.round((ing.stock_quantity / ing.min_stock_alert) * 100)) : 0;
              const barColor = ing.stock_quantity <= 0 ? "bg-destructive" : pct <= 30 ? "bg-destructive" : "bg-yellow-500";
              return (
                <div key={ing.id} className="py-2 px-3 rounded-lg bg-orange-500/5 border border-orange-500/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{ing.stock_quantity <= 0 ? "🔴" : "🟡"}</span>
                      <span className="text-sm font-medium truncate">{ing.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-orange-700">
                      {ing.stock_quantity} / {ing.min_stock_alert} {ing.unit}
                    </span>
                  </div>
                  {ing.min_stock_alert > 0 && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Pipeline + Top Products ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Order Pipeline */}
        <Card className="shadow-soft animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Pipeline de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <>
                <PipelineRow
                  label="Pendentes"
                  count={metrics?.pendingOrders.length ?? 0}
                  color="bg-yellow-500"
                  total={metrics?.totalOrders ?? 1}
                  urgent
                />
                <PipelineRow
                  label="Preparando"
                  count={metrics?.preparingOrders.length ?? 0}
                  color="bg-orange-500"
                  total={metrics?.totalOrders ?? 1}
                />
                <PipelineRow
                  label="Prontos"
                  count={metrics?.readyOrders.length ?? 0}
                  color="bg-green-500"
                  total={metrics?.totalOrders ?? 1}
                />
                {(metrics?.pendingOrders.length ?? 0) + (metrics?.preparingOrders.length ?? 0) + (metrics?.readyOrders.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum pedido ativo agora 🎉</p>
                )}
                <Link to="/admin/orders">
                  <Button variant="outline" size="sm" className="w-full mt-2 rounded-lg text-xs">
                    Ver todos os pedidos <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="shadow-soft animate-slide-up" style={{ animationDelay: "250ms" }}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Mais Vendidos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : metrics?.topProducts && metrics.topProducts.length > 0 ? (
              <div className="space-y-2">
                {metrics.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-700" :
                      i === 1 ? "bg-gray-300/30 text-gray-600" :
                      i === 2 ? "bg-amber-700/20 text-amber-800" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.qty} vendido{p.qty > 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0">
                      {formatCurrency(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 gap-3 animate-fade-in">
                <div className="text-4xl">🚀</div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Primeiras vendas a caminho!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                    Compartilhe o link da sua loja para receber pedidos
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={copyLink}
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar link da loja
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Alerts Row: Low Stock + Out of Stock ── */}
      {(lowStockProducts.length > 0 || outOfStock.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {lowStockProducts.length > 0 && (
            <Card className="shadow-soft border-amber-500/20 animate-slide-up" style={{ animationDelay: "300ms" }}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" /> Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-700 text-xs shrink-0">
                      {p.stock_quantity} un.
                    </Badge>
                  </div>
                ))}
                <Link to="/admin/products">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-amber-700 hover:bg-amber-500/10 mt-1">
                    Gerenciar estoque <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {outOfStock.length > 0 && (
            <Card className="shadow-soft border-destructive/20 animate-slide-up" style={{ animationDelay: "350ms" }}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <PackageX className="w-4 h-4" /> Esgotados ({outOfStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {outOfStock.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                    <Badge variant="outline" className="border-destructive/30 text-destructive text-xs shrink-0">
                      Esgotado
                    </Badge>
                  </div>
                ))}
                {outOfStock.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center">+{outOfStock.length - 4} mais</p>
                )}
                <Link to="/admin/products">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-destructive hover:bg-destructive/10 mt-1">
                    Repor estoque <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Peak Hours + Customer Insights ── */}
      <PeakHoursAndCustomers orders={orders} customers={customers} loading={loading} />

      {/* ── Weekday Revenue ── */}
      <WeekdayRevenue orders={orders} loading={loading} />

      {/* ── Stale Products ── */}
      <StaleProducts orders={orders} products={products} loading={loading} />

      {/* ── Quick Stats Footer ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <QuickStat icon={Package} label="Produtos" value={String(products?.length ?? 0)} />
        <QuickStat icon={Tag} label="Categorias" value={String(categories?.length ?? 0)} />
        <QuickStat icon={Users} label="Clientes" value={String(customers?.length ?? 0)} />
        <QuickStat icon={TrendingUp} label="Ativos" value={String(products?.filter(p => p.available).length ?? 0)} />
      </div>

      {/* ── Quick Actions ── */}
      <Card className="shadow-soft animate-slide-up" style={{ animationDelay: "400ms" }}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 grid gap-3 sm:grid-cols-3">
          <QuickAction href="/admin/products" icon={Package} label="Produtos" desc="Gerenciar catálogo" />
          <QuickAction href="/admin/categories" icon={Tag} label="Categorias" desc="Organizar produtos" />
          <QuickAction href="/admin/settings" icon={Sparkles} label="Configurações" desc="Personalizar loja" />
        </CardContent>
      </Card>

      {/* ── Sheet: Checkouts Recuperáveis ── */}
      <Sheet open={showCheckoutSheet} onOpenChange={setShowCheckoutSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-5 h-5 text-primary" />
              Recuperar Checkouts Abandonados
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes que iniciaram o pagamento mas não concluíram nas últimas 48h
            </p>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {checkoutStats?.recoverable.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum checkout para recuperar</p>
                <p className="text-xs mt-1">Todos os checkouts recentes foram convertidos!</p>
              </div>
            ) : checkoutStats?.recoverable.map((checkout) => {
              const phone = (checkout.customer_phone || "").replace(/\D/g, "");
              const name = checkout.customer_name || "cliente";
              const ago = formatDistanceToNow(new Date(checkout.created_at), { locale: ptBR, addSuffix: true });
              const msg = encodeURIComponent(
                `Olá ${name}! 👋 Vi que você estava interessado(a) em finalizar seu pedido de ${formatCurrency(checkout.total)} na nossa loja. Posso te ajudar a concluir? 😊`
              );
              const waLink = `https://wa.me/55${phone}?text=${msg}`;

              return (
                <div
                  key={checkout.id}
                  className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                        <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive shrink-0">
                          Expirado
                        </Badge>
                      </div>
                      {phone && (
                        <p className="text-xs text-muted-foreground mb-1">📱 {checkout.customer_phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{ago}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base text-primary">{formatCurrency(checkout.total)}</p>
                    </div>
                  </div>

                  {phone ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#25D366]/90 transition-all shadow-soft hover:shadow-medium active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Recuperar via WhatsApp
                    </a>
                  ) : (
                    <p className="mt-3 text-[11px] text-muted-foreground text-center bg-muted/40 rounded-lg py-2">
                      Sem número de telefone disponível
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────
function MetricCard({
  title, value, change, subtitle, icon: Icon, iconBg, iconColor, gradient, delay,
}: {
  title: string; value: string | null; change?: number; subtitle?: string;
  icon: any; iconBg: string; iconColor: string; gradient: string; delay: number;
}) {
  return (
    <Card
      className="relative overflow-hidden admin-card-interactive animate-slide-up group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-70 transition-opacity`} />
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}>
            <Icon className={`h-4 w-4 ${iconColor} icon-hover-rotate`} />
          </div>
        </div>
        {value === null ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-display animate-counter-spring" style={{ animationDelay: `${delay + 100}ms` }}>{value}</div>
            <div className="flex items-center gap-1 mt-1">
              {change !== undefined && change !== 0 ? (
                <>
                  {change > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-bold ${change > 0 ? "text-green-600" : "text-red-500"}`}>
                    {change > 0 ? "+" : ""}{change}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs ontem</span>
                </>
              ) : subtitle ? (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <Card className="shadow-soft animate-slide-up">
      <CardContent className="p-3 sm:p-4 text-center">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {loading ? <Skeleton className="h-6 w-16 mx-auto mt-1" /> : (
          <p className="text-base sm:text-lg font-bold text-foreground mt-0.5">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

const PipelineRow = forwardRef<HTMLDivElement, {
  label: string; count: number; color: string; total: number; urgent?: boolean;
}>(({ label, count, color, total, urgent }, ref) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0 ${urgent && count > 0 ? "animate-pulse" : ""}`} />
      <span className="text-sm font-medium flex-1">{label}</span>
      <span className={`text-sm font-bold ${urgent && count > 0 ? "text-yellow-700" : "text-foreground"}`}>{count}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }} />
      </div>
    </div>
  );
});
PipelineRow.displayName = "PipelineRow";

function QuickStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Bug fix: QuickAction sem asChild+Link aninhados — Link é o elemento raiz direto
function QuickAction({ href, icon: Icon, label, desc }: { href: string; icon: any; label: string; desc: string }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-start h-auto py-3 px-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group bg-card"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-left">
        <div className="font-semibold text-sm text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}

// ── Peak Hours & Customer Insights ──
function PeakHoursAndCustomers({ orders, customers, loading }: { orders: Order[] | undefined; customers: any[] | undefined; loading: boolean }) {
  const peakHour = useMemo(() => {
    if (!orders) return null;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const hourCounts: Record<number, number> = {};
    orders.filter(o => new Date(o.created_at) >= weekAgo && o.status !== "cancelled")
      .forEach(o => {
        const h = new Date(o.created_at).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
    const sorted = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (sorted.length === 0) return null;
    const topHour = Number(sorted[0][0]);
    return `${topHour}h - ${topHour + 1}h`;
  }, [orders]);

  const customerInsights = useMemo(() => {
    if (!orders) return { unique: 0, recurring: 0 };
    const phoneCounts: Record<string, number> = {};
    orders.filter(o => o.customer_phone && o.status !== "cancelled")
      .forEach(o => {
        const phone = o.customer_phone!;
        phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
      });
    const unique = Object.keys(phoneCounts).length;
    const recurring = Object.values(phoneCounts).filter(c => c >= 2).length;
    return { unique, recurring };
  }, [orders]);

  if (loading) return null;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      {peakHour && (
        <Card className="shadow-soft animate-slide-up">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Horário de Pico</p>
              <p className="text-lg font-bold text-foreground">{peakHour}</p>
              <p className="text-[10px] text-muted-foreground">últimos 7 dias</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-soft animate-slide-up">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Clientes Únicos</p>
            <p className="text-lg font-bold text-foreground">{customerInsights.unique}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-soft animate-slide-up">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Clientes Recorrentes</p>
            <p className="text-lg font-bold text-foreground">{customerInsights.recurring}</p>
            <p className="text-[10px] text-muted-foreground">2+ pedidos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Weekday Revenue Chart ──
function WeekdayRevenue({ orders, loading }: { orders: Order[] | undefined; loading: boolean }) {
  const weekdayData = useMemo(() => {
    if (!orders) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const revenue = [0, 0, 0, 0, 0, 0, 0];
    orders
      .filter(o => new Date(o.created_at) >= thirtyDaysAgo && o.status !== "cancelled")
      .forEach(o => {
        const day = new Date(o.created_at).getDay();
        revenue[day] += o.total;
      });
    const max = Math.max(...revenue, 1);
    return dayNames.map((name, i) => ({
      name,
      revenue: revenue[i],
      pct: (revenue[i] / max) * 100,
      isToday: new Date().getDay() === i,
    }));
  }, [orders]);

  if (loading || weekdayData.every(d => d.revenue === 0)) return null;

  return (
    <Card className="shadow-soft animate-slide-up">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Receita por Dia da Semana
        </CardTitle>
        <CardDescription className="text-xs">Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex items-end gap-2" style={{ height: 128 }}>
          {weekdayData.map((d) => (
            <div key={d.name} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] text-muted-foreground font-medium">
                {d.revenue > 0 ? formatCurrency(d.revenue) : "-"}
              </span>
              <div
                className={`w-full max-w-[32px] rounded-t-md transition-all duration-500 ${
                  d.isToday ? "bg-primary" : "bg-primary/40"
                }`}
                style={{ height: `${Math.max(d.pct, d.revenue > 0 ? 8 : 2)}%`, minHeight: d.revenue > 0 ? 6 : 2 }}
              />
              <span className={`text-[11px] font-semibold ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>
                {d.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stale Products ──
function StaleProducts({ orders, products, loading }: { orders: Order[] | undefined; products: any[] | undefined; loading: boolean }) {
  const staleProducts = useMemo(() => {
    if (!orders || !products) return [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentProductIds = new Set<string>();
    orders.filter(o => new Date(o.created_at) >= weekAgo && o.status !== "cancelled")
      .forEach(o => {
        o.items.forEach(item => recentProductIds.add(item.product_id));
      });
    return products
      .filter(p => p.available && !recentProductIds.has(p.id))
      .slice(0, 5);
  }, [orders, products]);

  if (loading || staleProducts.length === 0) return null;

  return (
    <Card className="shadow-soft border-amber-500/20 animate-slide-up">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
          <TrendingDown className="w-4 h-4" /> Sem Vendas há 7+ Dias
        </CardTitle>
        <CardDescription className="text-xs">Considere destacar ou criar promoções</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        {staleProducts.map(p => (
          <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <span className="text-sm font-medium truncate flex-1">{p.name}</span>
            <Link to="/admin/products">
              <Button variant="ghost" size="sm" className="text-xs text-amber-700 h-7 px-2">
                Editar
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Store Health Score Card ──
function StoreHealthCard({ store, products, categories, deliveryZones }: {
  store: any; products: any[] | undefined; categories: any[] | undefined; deliveryZones: any[] | undefined;
}) {
  const checks = useMemo(() => {
    if (!store) return [];
    const items: { label: string; done: boolean; icon: any; link: string }[] = [
      { label: "Logo da loja", done: !!store.logo_url, icon: Image, link: "/admin/settings" },
      { label: "Foto de capa", done: !!store.cover_image_url, icon: Image, link: "/admin/settings" },
      { label: "Endereço configurado", done: !!store.address, icon: MapPin, link: "/admin/settings" },
      { label: "WhatsApp configurado", done: !!store.whatsapp, icon: Phone, link: "/admin/settings" },
      { label: "Categorias criadas", done: (categories?.length ?? 0) > 0, icon: Tag, link: "/admin/categories" },
      { label: "Produtos cadastrados", done: (products?.length ?? 0) >= 3, icon: Package, link: "/admin/products" },
      { label: "Pagamentos configurados", done: (store.accepted_payments?.length ?? 0) > 0, icon: CreditCard, link: "/admin/settings" },
      { label: "Horário de funcionamento", done: store.opening_hours?.some((h: any) => h.isOpen), icon: Clock, link: "/admin/settings" },
    ];

    if (store.delivery_zone_enabled) {
      items.push({ label: "Zonas de entrega", done: (deliveryZones?.length ?? 0) > 0, icon: MapPin, link: "/admin/settings" });
    }

    return items;
  }, [store, products, categories, deliveryZones]);

  if (!store || checks.length === 0) return null;

  const doneCount = checks.filter(c => c.done).length;
  const score = Math.round((doneCount / checks.length) * 100);
  const incomplete = checks.filter(c => !c.done);

  if (score === 100) return null; // All done — hide card

  return (
    <Card className="shadow-soft animate-slide-up border-primary/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
      <CardHeader className="relative p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Saúde da Loja
          </CardTitle>
          <span className="text-2xl font-bold text-primary font-display">{score}%</span>
        </div>
      </CardHeader>
      <CardContent className="relative p-4 pt-2 space-y-3">
        <Progress value={score} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {doneCount}/{checks.length} configurações completas — complete para aumentar conversões
        </p>
        {incomplete.slice(0, 3).map((item) => (
          <Link key={item.label} to={item.link}>
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <item.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground flex-1">{item.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
        {incomplete.length > 3 && (
          <p className="text-[10px] text-muted-foreground text-center">+{incomplete.length - 3} pendente(s)</p>
        )}
      </CardContent>
    </Card>
  );
}
