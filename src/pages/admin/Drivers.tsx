import { useState } from "react";
import { useMyStore } from "@/hooks/useStore";
import { useDrivers } from "@/hooks/useDrivers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Plus, Users, Package, Clock, Trash2, Copy, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Drivers() {
  const { data: store } = useMyStore();
  const { drivers, isLoading, createDriver, toggleActive, deleteDriver, deliveryStats } = useDrivers(store?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const { toast } = useToast();

  const todayDelivered = deliveryStats.filter((d: any) => d.status === "delivered").length;
  const todayActive = deliveryStats.filter((d: any) => d.status !== "cancelled" && d.status !== "delivered").length;

  // Driver stats
  const getDriverStats = (driverId: string) => {
    const driverDeliveries = deliveryStats.filter((d: any) => d.driver_id === driverId);
    return {
      today: driverDeliveries.filter((d: any) => d.status === "delivered").length,
      active: driverDeliveries.filter((d: any) => d.status !== "cancelled" && d.status !== "delivered").length,
    };
  };

  const handleCreate = async () => {
    if (!name || !phone || pin.length !== 4) return;
    await createDriver.mutateAsync({ name, phone, pin });
    setName("");
    setPhone("");
    setPin("");
    setModalOpen(false);
  };

  const driverLink = store?.slug ? `${window.location.origin}/entregador/${store.slug}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(driverLink);
    toast({ title: "Link copiado! 📋" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Entregadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua equipe de entregas</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Entregador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Entregador</DialogTitle>
              <DialogDescription>Preencha os dados do entregador. Ele usará o telefone e PIN para acessar a área de entregas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome</label>
                <Input placeholder="João Silva" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefone</label>
                <Input type="tel" placeholder="(99) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">PIN (4 dígitos)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="text-center text-xl tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">O entregador usará este PIN para fazer login</p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!name || !phone || pin.length !== 4 || createDriver.isPending}>
                {createDriver.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{drivers.length}</p>
                <p className="text-xs text-muted-foreground">Entregadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayDelivered}</p>
                <p className="text-xs text-muted-foreground">Entregues hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayActive}</p>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{drivers.filter((d: any) => d.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Link */}
      {driverLink && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" /> Link para entregadores
            </p>
            <div className="flex gap-2">
              <Input value={driverLink} readOnly className="text-xs bg-background" />
              <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 gap-1">
                <Copy className="w-3 h-3" /> Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Compartilhe este link com seus entregadores para acessarem a área de entregas</p>
          </CardContent>
        </Card>
      )}

      {/* Drivers List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : drivers.length === 0 ? (
        <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">Controle total das entregas</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Configure em 3 passos e nunca mais perca uma entrega de vista</p>
            </div>

            {/* 3-Step Onboarding */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="relative flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2">1</div>
                <p className="text-sm font-semibold text-foreground">Cadastre entregadores</p>
                <p className="text-xs text-muted-foreground mt-1">Nome, telefone e PIN de 4 dígitos</p>
              </div>
              <div className="relative flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2">2</div>
                <p className="text-sm font-semibold text-foreground">Atribua nos pedidos</p>
                <p className="text-xs text-muted-foreground mt-1">Ao marcar "Pronto", escolha o entregador</p>
              </div>
              <div className="relative flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2">3</div>
                <p className="text-sm font-semibold text-foreground">Entregador acessa pelo celular</p>
                <p className="text-xs text-muted-foreground mt-1">Ele abre o link, faz login e controla as entregas</p>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={() => setModalOpen(true)} className="gap-2" size="lg">
                <Plus className="w-4 h-4" /> Cadastrar Primeiro Entregador
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver: any) => {
            const stats = getDriverStats(driver.id);
            return (
              <Card key={driver.id} className={`transition-all ${!driver.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.phone}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {stats.active > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                        {stats.active} ativas
                      </Badge>
                    )}
                    {stats.today > 0 && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">
                        {stats.today} hoje
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={driver.is_active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: driver.id, is_active: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => {
                      if (confirm("Remover entregador?")) deleteDriver.mutate(driver.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
