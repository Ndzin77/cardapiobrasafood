import { useState, useMemo } from "react";
import { useMyStore } from "@/hooks/useStore";
import { useStoreCustomers, useResetCustomerPassword, formatPhoneDisplay, Customer } from "@/hooks/useCustomers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Search, KeyRound, Check, X, Loader2, ShoppingBag, MessageCircle, Star, DollarSign, TrendingUp, ArrowUpDown } from "lucide-react";

type FilterType = "all" | "with_password" | "without_password" | "recurring" | "loyal";
type SortType = "last_order" | "total_revenue" | "order_count" | "name";

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function Customers() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data: customers = [], isLoading: customersLoading } = useStoreCustomers(store?.id);
  const resetPassword = useResetCustomerPassword();
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("last_order");

  const filteredCustomers = useMemo(() => {
    let result = customers.filter((customer) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(search.replace(/\D/g, ""));
      if (!matchesSearch) return false;

      switch (activeFilter) {
        case "with_password": return customer.has_password;
        case "without_password": return !customer.has_password;
        case "recurring": return (customer.order_count ?? 0) >= 2;
        case "loyal": return (customer.order_count ?? 0) >= 3;
        default: return true;
      }
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "last_order": {
          const aTime = a.last_order_at ? new Date(a.last_order_at).getTime() : 0;
          const bTime = b.last_order_at ? new Date(b.last_order_at).getTime() : 0;
          return bTime - aTime;
        }
        case "total_revenue":
          return (b.total_revenue ?? 0) - (a.total_revenue ?? 0);
        case "order_count":
          return (b.order_count ?? 0) - (a.order_count ?? 0);
        case "name":
          return a.name.localeCompare(b.name, "pt-BR");
        default:
          return 0;
      }
    });

    return result;
  }, [customers, search, activeFilter, sortBy]);

  const handleResetPassword = async (customer: Customer) => {
    setResettingId(customer.id);
    try {
      await resetPassword.mutateAsync(customer.id);
      toast.success(`Senha de ${customer.name} foi removida. O cliente pode criar uma nova.`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao resetar senha");
    } finally {
      setResettingId(null);
    }
  };

  const isLoading = storeLoading || customersLoading;

  const totalCustomers = customers.length;
  const withPassword = customers.filter((c) => c.has_password).length;
  const loyalCount = customers.filter((c) => (c.order_count ?? 0) >= 3).length;
  const totalRevenue = customers.reduce((s, c) => s + (c.total_revenue ?? 0), 0);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "with_password", label: "Com senha" },
    { key: "without_password", label: "Sem senha" },
    { key: "recurring", label: "Recorrentes" },
    { key: "loyal", label: "⭐ Fiéis" },
  ];

  const SORTS: { key: SortType; label: string }[] = [
    { key: "last_order", label: "Último pedido" },
    { key: "total_revenue", label: "Maior LTV" },
    { key: "order_count", label: "Mais pedidos" },
    { key: "name", label: "Nome A-Z" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-secondary/30 border border-primary/10 shadow-soft">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl gradient-primary text-white shadow-medium">
            <Users className="w-5 h-5" />
          </span>
          Clientes
        </h1>
        <p className="text-muted-foreground mt-1 pl-[52px] text-sm">Gerencie e conheça os clientes da sua loja</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="card-interactive group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Total de Clientes
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {isLoading ? <Skeleton className="h-9 w-16" /> : totalCustomers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="card-interactive group border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5 text-accent" />
              Com Senha
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-accent">
              {isLoading ? <Skeleton className="h-9 w-16" /> : withPassword}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="card-interactive group border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Star className="w-3.5 h-3.5 text-yellow-600" />
              Clientes Fiéis
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-yellow-700">
              {isLoading ? <Skeleton className="h-9 w-16" /> : loyalCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="card-interactive group border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              Receita Total
            </CardDescription>
            <CardTitle className="text-lg font-bold text-green-700">
              {isLoading ? <Skeleton className="h-9 w-16" /> : formatCurrency(totalRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="overflow-hidden shadow-soft">
        <CardHeader className="bg-gradient-to-r from-secondary/50 to-transparent border-b border-border/50">
          <div className="flex flex-col gap-4">
            {/* Top row: title + search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                Lista de Clientes
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-card border-border/50 focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === f.key
                      ? "gradient-primary text-primary-foreground shadow-soft"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.label}
                  {f.key !== "all" && (
                    <span className="ml-1.5 opacity-70">
                      {f.key === "with_password" ? withPassword :
                       f.key === "without_password" ? totalCustomers - withPassword :
                       f.key === "loyal" ? loyalCount :
                       customers.filter(c => (c.order_count ?? 0) >= 2).length}
                    </span>
                  )}
                </button>
              ))}

              {/* Sort selector */}
              <div className="ml-auto flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="text-xs bg-transparent text-muted-foreground border-0 outline-none cursor-pointer hover:text-foreground transition-colors"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-4">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? <>Nenhum cliente encontrado para "{search}"</> : <>Nenhum cliente com este filtro</>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="text-center font-semibold">Pedidos</TableHead>
                    <TableHead className="text-right font-semibold hidden sm:table-cell">LTV</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Último Pedido</TableHead>
                    <TableHead className="text-center font-semibold">Senha</TableHead>
                    <TableHead className="text-right font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, idx) => {
                    const isLoyal = (customer.order_count ?? 0) >= 3;
                    const phone = customer.phone.replace(/\D/g, "");
                    const waLink = `https://wa.me/55${phone}`;

                    return (
                      <TableRow
                        key={customer.id}
                        className="group hover:bg-primary/5 transition-colors"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        {/* Nome + badge fiel */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{customer.name}</span>
                            {isLoyal && (
                              <span
                                title="Cliente fiel — 3+ pedidos"
                                className="text-[10px] font-bold text-yellow-700 bg-yellow-500/15 px-1.5 py-0.5 rounded-full border border-yellow-500/30"
                              >
                                ⭐ Fiel
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Telefone clicável → WhatsApp */}
                        <TableCell>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir no WhatsApp"
                            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-[#25D366] transition-colors group/wa"
                          >
                            <MessageCircle className="w-3.5 h-3.5 opacity-0 group-hover/wa:opacity-100 transition-opacity text-[#25D366]" />
                            {formatPhoneDisplay(customer.phone)}
                          </a>
                        </TableCell>

                        {/* Contagem de pedidos */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1 hover:bg-primary/10 transition-colors cursor-default">
                            <ShoppingBag className="h-3 w-3" />
                            {customer.order_count || 0}
                          </Badge>
                        </TableCell>

                        {/* LTV */}
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className={`text-sm font-bold ${(customer.total_revenue ?? 0) > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                            {(customer.total_revenue ?? 0) > 0 ? formatCurrency(customer.total_revenue!) : "—"}
                          </span>
                        </TableCell>

                        {/* Último pedido */}
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {customer.last_order_at
                            ? formatDistanceToNow(new Date(customer.last_order_at), { locale: ptBR, addSuffix: true })
                            : "—"}
                        </TableCell>

                        {/* Senha */}
                        <TableCell className="text-center">
                          {customer.has_password ? (
                            <Badge variant="default" className="justify-center">
                              <Check className="h-3 w-3 mr-1" />
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="justify-center">
                              <X className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right">
                          {customer.has_password && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={resettingId === customer.id}>
                                  {resettingId === customer.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <KeyRound className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">Resetar Senha</span>
                                      <span className="sm:hidden">Resetar</span>
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover a senha de <strong>{customer.name}</strong>?
                                    <br /><br />
                                    O cliente poderá criar uma nova senha no próximo acesso. O histórico de pedidos será mantido.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetPassword(customer)}>Sim, Resetar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
