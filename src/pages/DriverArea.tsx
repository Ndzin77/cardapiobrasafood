import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDriverAuth } from "@/hooks/useDriverAuth";
import { useDriverDeliveries, Delivery } from "@/hooks/useDriverDeliveries";
import { applyThemeToDocument } from "@/lib/storeTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, LogOut, MapPin, Phone, Package, CheckCircle2, Navigation, Truck, User, RefreshCw, AlertTriangle, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function DriverLogin({ storeId, storeName, logoUrl, onLogin }: {
  storeId: string; storeName: string; logoUrl?: string | null;
  onLogin: (phone: string, pin: string) => Promise<boolean>;
}) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || pin.length !== 4) return;
    setLoading(true);
    setError("");
    const ok = await onLogin(phone, pin);
    if (!ok) setError("Telefone ou PIN incorretos");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-3">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="w-16 h-16 rounded-2xl mx-auto object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Truck className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{storeName}</h1>
          <p className="text-sm text-muted-foreground">Área do Entregador</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
            <Input
              type="tel"
              placeholder="(99) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">PIN (4 dígitos)</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || !phone || pin.length !== 4}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function DeliveryCard({ delivery, onUpdateStatus }: {
  delivery: Delivery;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const isAssigned = delivery.status === "assigned";
  const isCollected = delivery.status === "collected";
  const isDelivered = delivery.status === "delivered";

  const statusColors = {
    assigned: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    collected: "bg-blue-500/10 border-blue-500/30 text-blue-700",
    delivered: "bg-green-500/10 border-green-500/30 text-green-700",
  };

  const statusLabels = {
    assigned: "Pendente",
    collected: "Em rota",
    delivered: "Entregue",
  };

  const address = delivery.customer_address || "";
  const mapsUrl = delivery.customer_maps_url ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  return (
    <Card className={`p-4 border-2 transition-all duration-250 ease-out ${statusColors[delivery.status as keyof typeof statusColors] || ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm truncate">{delivery.customer_name || "Cliente"}</span>
          </div>
          {delivery.order_type === "preorder" && delivery.scheduled_date && (
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-xs font-medium text-purple-700">
                Agendado {format(new Date(delivery.scheduled_date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                {delivery.scheduled_time ? ` às ${delivery.scheduled_time}` : ""}
              </span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{address}</span>
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
          R$ {Number(delivery.total).toFixed(2).replace(".", ",")}
        </Badge>
      </div>

      {/* Items summary */}
      <div className="text-xs text-muted-foreground mb-3">
        {(delivery.items || []).map((item: any, i: number) => (
          <span key={i}>{i > 0 ? ", " : ""}{item.quantity}x {item.product_name}</span>
        ))}
      </div>

      {/* Phone */}
      {delivery.customer_phone && (
        <div className="flex items-center gap-2 mb-3">
          <a href={`tel:${delivery.customer_phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Phone className="w-3.5 h-3.5" /> {delivery.customer_phone}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isAssigned && (
          <>
            <Button
              className="flex-1 h-12 text-base font-semibold gap-2"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
                onUpdateStatus(delivery.id, "collected");
              }}
            >
              <Package className="w-5 h-5" /> Coletei
            </Button>
            {address && (
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => window.open(mapsUrl, "_blank")}
              >
                <Navigation className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
        {isCollected && (
          <>
            <Button
              className="flex-1 h-12 text-base font-semibold gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                onUpdateStatus(delivery.id, "delivered");
              }}
            >
              <CheckCircle2 className="w-5 h-5" /> Entreguei
            </Button>
            {address && (
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => window.open(mapsUrl, "_blank")}
              >
                <Navigation className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
        {isDelivered && (
          <div className="flex items-center gap-2 text-green-600 py-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Entregue ✓</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function DriverDashboard({ driver, storeId, onLogout }: {
  driver: { id: string; name: string }; storeId: string; onLogout: () => void;
}) {
  const { assigned, collected, delivered, loading, error, lastRefresh, updateStatus, refresh } = useDriverDeliveries(driver.id, storeId);

  const total = assigned.length + collected.length + delivered.length;
  const doneCount = delivered.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{driver.name}</p>
              <p className="text-xs text-muted-foreground">Entregas do dia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refresh} className="text-muted-foreground h-9 w-9" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{doneCount} de {total} entregas</span>
            <span className="font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {lastRefresh && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Atualizado às {format(lastRefresh, "HH:mm:ss")}
          </p>
        )}
      </header>

      <div className="p-4 space-y-6 pb-20">
        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Erro ao carregar entregas</p>
              <p className="text-xs text-muted-foreground truncate">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} className="shrink-0">
              Tentar novamente
            </Button>
          </div>
        )}

        {loading && total === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && !error && total === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma entrega atribuída ainda</p>
            <p className="text-xs text-muted-foreground">Novas entregas aparecerão automaticamente</p>
            <Button variant="outline" size="sm" onClick={refresh} className="mt-2 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
          </div>
        )}

        {/* Assigned = Yellow */}
        {assigned.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pendentes ({assigned.length})
            </h2>
            <div className="space-y-3">
              {assigned.map((d) => <DeliveryCard key={d.id} delivery={d} onUpdateStatus={updateStatus} />)}
            </div>
          </section>
        )}

        {/* Collected = Blue */}
        {collected.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Em Rota ({collected.length})
            </h2>
            <div className="space-y-3">
              {collected.map((d) => <DeliveryCard key={d.id} delivery={d} onUpdateStatus={updateStatus} />)}
            </div>
          </section>
        )}

        {/* Delivered = Green */}
        {delivered.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Concluídas ({delivered.length})
            </h2>
            <div className="space-y-3">
              {delivered.map((d) => <DeliveryCard key={d.id} delivery={d} onUpdateStatus={updateStatus} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function DriverArea() {
  const rawSlug = useParams<{ slug: string }>().slug;
  const slug = rawSlug?.split("?")[0]?.split("#")[0] || "";
  const [store, setStore] = useState<any>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("public_stores" as any)
      .select("id, name, slug, logo_url, theme_color")
      .eq("slug", slug)
      .single()
      .then(({ data }: { data: any }) => {
        setStore(data);
        setLoadingStore(false);
        if (data?.theme_color) {
          applyThemeToDocument({ themeColorField: data.theme_color });
        }
      });
  }, [slug]);

  const { driver, login, logout, loading: authLoading, error: authError } = useDriverAuth(store?.id || null);

  if (loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center space-y-3">
          <Truck className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-semibold">Loja não encontrada</p>
          <p className="text-sm text-muted-foreground">Verifique o link e tente novamente</p>
        </Card>
      </div>
    );
  }

  if (!driver) {
    return <DriverLogin storeId={store.id} storeName={store.name} logoUrl={store.logo_url} onLogin={login} />;
  }

  return <DriverDashboard driver={driver} storeId={store.id} onLogout={logout} />;
}
