import { useState, useMemo } from "react";
import { useMyStore } from "@/hooks/useStore";
import {
  useIngredients,
  useCreateIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  useDeleteIngredientsBulk,
  useProductProfitability,
  useIngredientUsageCounts,
  useOptionChoiceIngredients,
  useUpsertOptionChoiceIngredient,
  useDeleteOptionChoiceIngredient,
  useStoreOptionChoices,
  Ingredient,
  ProductProfit,
  OptionChoiceIngredient,
} from "@/hooks/useIngredients";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Pencil, Trash2, Wheat, Search, Package, DollarSign,
  AlertTriangle, PackageX, TrendingUp, Award, Target, ArrowUpRight,
  Calculator, Lightbulb, BarChart3, HelpCircle, ChevronDown, Sparkles,
  CheckSquare, X,
} from "lucide-react";
import { CostCalculatorModal } from "@/components/admin/CostCalculatorModal";
import { QuantityWithUnit } from "@/components/admin/QuantityWithUnit";
import { ShoppingListChat } from "@/components/admin/ShoppingListChat";
import { IngredientPurchasesList } from "@/components/admin/IngredientPurchasesList";

const UNITS = [
  { value: "g", label: "Gramas (g)" },
  { value: "kg", label: "Quilos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "L", label: "Litros (L)" },
  { value: "un", label: "Unidade (un)" },
];

interface FormData {
  name: string;
  unit: string;
  cost_per_unit: string;
  stock_quantity: string;
  min_stock_alert: string;
}

const defaultForm: FormData = {
  name: "",
  unit: "g",
  cost_per_unit: "",
  stock_quantity: "0",
  min_stock_alert: "0",
};

function getStockStatus(ing: Ingredient) {
  if (ing.stock_quantity <= 0) return { label: "Zerado", color: "destructive" as const, emoji: "🔴" };
  if (ing.min_stock_alert > 0 && ing.stock_quantity <= ing.min_stock_alert)
    return { label: "Baixo", color: "secondary" as const, emoji: "🟡" };
  return { label: "OK", color: "default" as const, emoji: "🟢" };
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function Ingredients() {
  const { data: store } = useMyStore();
  const { data: ingredients, isLoading } = useIngredients(store?.id);
  const { data: profitData } = useProductProfitability(store?.id);
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const deleteIngredientsBulk = useDeleteIngredientsBulk();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [search, setSearch] = useState("");
  const [calcProduct, setCalcProduct] = useState("");
  const [calcQty, setCalcQty] = useState("");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Option choice ingredients
  const { data: optionChoiceIngredients } = useOptionChoiceIngredients(store?.id);
  const { data: storeOptionChoices } = useStoreOptionChoices(store?.id);
  const upsertOCI = useUpsertOptionChoiceIngredient();
  const deleteOCI = useDeleteOptionChoiceIngredient();
  const [ociGroup, setOciGroup] = useState("");
  const [ociChoice, setOciChoice] = useState("");
  const [ociIngredientId, setOciIngredientId] = useState("");
  const [ociQty, setOciQty] = useState(0); // already in ingredient base unit
  const [ociResetKey, setOciResetKey] = useState(0);
  const [calcOpen, setCalcOpen] = useState(false);

  // Count how many products use each ingredient from profitData
  const { data: ingredientUsageCounts } = useIngredientUsageCounts(store?.id);

  const resetForm = () => {
    setForm(defaultForm);
    setEditing(null);
  };

  const openEdit = (ing: Ingredient) => {
    setEditing(ing);
    setForm({
      name: ing.name,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit.toString(),
      stock_quantity: ing.stock_quantity.toString(),
      min_stock_alert: ing.min_stock_alert.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    const data = {
      store_id: store.id,
      name: form.name.trim(),
      unit: form.unit,
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      stock_quantity: parseFloat(form.stock_quantity) || 0,
      min_stock_alert: parseFloat(form.min_stock_alert) || 0,
    };

    if (editing) {
      await updateIngredient.mutateAsync({ id: editing.id, ...data });
    } else {
      await createIngredient.mutateAsync(data);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const filtered = (ingredients ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  // KPI calculations
  const totalIngredients = ingredients?.length ?? 0;
  const totalStockCost = (ingredients ?? []).reduce((s, i) => s + i.stock_quantity * i.cost_per_unit, 0);
  const alertCount = (ingredients ?? []).filter(i => i.min_stock_alert > 0 && i.stock_quantity <= i.min_stock_alert && i.stock_quantity > 0).length;
  const zeroCount = (ingredients ?? []).filter(i => i.stock_quantity <= 0).length;

  // Profit intelligence
  const bestProduct = profitData && profitData.length > 0 ? profitData[0] : null;
  const worstProduct = profitData && profitData.length > 0
    ? profitData.filter(p => p.margin < 30).sort((a, b) => a.margin - b.margin)[0]
    : null;
  const totalPotentialProfit = (profitData ?? []).reduce((s, p) => s + p.potentialProfit, 0);
  const avgMargin = profitData && profitData.length > 0
    ? Math.round(profitData.reduce((s, p) => s + p.margin, 0) / profitData.length)
    : 0;

  // Calculator
  const calcSelected = profitData?.find(p => p.productId === calcProduct);
  const calcQuantity = parseInt(calcQty) || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Custos & Lucro
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de insumos e inteligência de margem
          </p>
        </div>
      </div>

      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="ingredients" className="flex-1 sm:flex-none">
            <Wheat className="w-3.5 h-3.5 mr-1.5" />
            Insumos
          </TabsTrigger>
          <TabsTrigger value="purchase" className="flex-1 sm:flex-none">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Nova Compra
          </TabsTrigger>
          <TabsTrigger value="additionals" className="flex-1 sm:flex-none">
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Adicionais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase" className="space-y-4">
          {store ? (
            <ShoppingListChat storeId={store.id} />
          ) : (
            <Skeleton className="h-40" />
          )}
        </TabsContent>

        <TabsContent value="ingredients" className="space-y-4 sm:space-y-6">
          <div className="flex justify-end">
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
              <DialogDescription>
                {editing ? "Atualize as informações" : "Cadastre um novo insumo"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Farinha de trigo"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Unidade</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Custo por {form.unit} (R$)</Label>
                    <button
                      type="button"
                      onClick={() => setCalcOpen(true)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Calculator className="w-3 h-3" />
                      Não sei calcular
                    </button>
                  </div>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.cost_per_unit}
                    onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Estoque Atual</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Alerta Mínimo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_stock_alert}
                    onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })}
                    placeholder="0 = sem alerta"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createIngredient.isPending || updateIngredient.isPending} className="w-full">
                  {editing ? "Salvar" : "Criar Insumo"}
                </Button>
              </DialogFooter>
            </form>

            {editing && (
              <>
                <Separator className="my-2" />
                <IngredientPurchasesList ingredient={editing} />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Como Funciona — Collapsible ── */}
      <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 shadow-xs hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <HelpCircle className="w-4 h-4 text-primary" />
              Como funciona?
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${howItWorksOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 animate-fade-in">
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">1</span>
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Cadastre os materiais</strong> que você usa para fazer cada produto (farinha, queijo, embalagem etc.)</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">2</span>
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Vincule ao produto</strong> e informe quanto usa de cada insumo (na aba do produto)</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">3</span>
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Estoque descontado automaticamente</strong> quando um pedido é confirmado</p>
            </div>
          </div>
          <Separator />
          <div className="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-[11px] text-blue-700">
              ⚠️ <strong>Estoque de insumos ≠ Estoque do produto.</strong> O estoque do produto controla itens prontos para venda. Os insumos controlam a matéria-prima usada na produção.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Profit Intelligence Insights ── */}
      {profitData && profitData.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm animate-fade-in" style={{ animationDelay: "0ms" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Margem Média</span>
              </div>
              <p className={`text-xl font-bold ${avgMargin >= 40 ? "text-green-600" : avgMargin >= 25 ? "text-yellow-600" : "text-destructive"}`}>
                {avgMargin}%
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm animate-fade-in" style={{ animationDelay: "50ms" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Lucro Potencial</span>
              </div>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPotentialProfit)}</p>
              <p className="text-[10px] text-muted-foreground">com estoque atual</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm animate-fade-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Valor em Estoque</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalStockCost)}</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm animate-fade-in" style={{ animationDelay: "150ms" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Alertas</span>
              </div>
              <p className="text-xl font-bold" style={{ color: (alertCount + zeroCount) > 0 ? "hsl(var(--destructive))" : undefined }}>
                {alertCount + zeroCount}
              </p>
            </div>
          </div>

          {/* Insight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Best product */}
            {bestProduct && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Mais Lucrativo</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{bestProduct.productName}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Custo: {formatCurrency(bestProduct.cost)}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-muted-foreground">
                    Venda: {formatCurrency(bestProduct.price)}
                  </span>
                  <Badge className="text-[10px] bg-green-600 text-white border-0">
                    {bestProduct.margin}%
                  </Badge>
                </div>
                {bestProduct.maxProducible > 0 && (
                  <p className="text-[10px] text-green-600/80 mt-1.5">
                    📦 Estoque para {bestProduct.maxProducible} unidades = {formatCurrency(bestProduct.potentialProfit)} de lucro
                  </p>
                )}
              </div>
            )}

            {/* Worst product / suggestion */}
            {worstProduct ? (
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 animate-fade-in" style={{ animationDelay: "250ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-700">Atenção — Margem Baixa</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{worstProduct.productName}</p>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="destructive" className="text-[10px]">
                    {worstProduct.margin}% margem
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  💡 Suba para <strong className="text-foreground">{formatCurrency(worstProduct.suggestedPrice40)}</strong> para atingir 40% de margem
                </p>
              </div>
            ) : bestProduct && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 animate-fade-in" style={{ animationDelay: "250ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Todas as Margens Saudáveis</span>
                </div>
                <p className="text-sm text-foreground">
                  ✅ Todos os produtos com insumos estão acima de 30% de margem!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Production Calculator ── */}
      {profitData && profitData.length > 0 && (
        <Card className="shadow-sm animate-fade-in border-primary/10" style={{ animationDelay: "300ms" }}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Calculadora de Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="flex gap-2">
              <Select value={calcProduct} onValueChange={setCalcProduct}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {profitData.map(p => (
                    <SelectItem key={p.productId} value={p.productId}>
                      {p.productName} ({p.margin}% margem)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={calcQty}
                onChange={(e) => setCalcQty(e.target.value)}
                placeholder="Qtd"
                className="w-24 h-9 text-xs"
              />
            </div>

            {calcSelected && calcQuantity > 0 && (
              <div className="space-y-2 animate-fade-in">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Custo Total</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(calcSelected.cost * calcQuantity)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-green-500/10 text-center">
                    <p className="text-[10px] text-muted-foreground">Lucro Esperado</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency((calcSelected.price - calcSelected.cost) * calcQuantity)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary/10 text-center">
                    <p className="text-[10px] text-muted-foreground">Receita</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(calcSelected.price * calcQuantity)}</p>
                  </div>
                </div>
                {calcQuantity > calcSelected.maxProducible && calcSelected.maxProducible >= 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <p className="text-xs text-destructive font-medium">
                      Estoque insuficiente! Máximo produzível: {calcSelected.maxProducible} unidades
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {totalIngredients > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insumo..."
            className="pl-10 h-10"
          />
        </div>
      )}

      {/* Ingredient list header */}
      {totalIngredients > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wheat className="w-4 h-4 text-primary" />
            Insumos ({totalIngredients})
          </h2>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} selecionado(s)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (selectedIds.size === filtered.length && filtered.length > 0) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(filtered.map((i) => i.id)));
                    }
                  }}
                  disabled={filtered.length === 0}
                >
                  {selectedIds.size === filtered.length && filtered.length > 0
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs"
                  disabled={selectedIds.size === 0 || deleteIngredientsBulk.isPending}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setSelectionMode(true)}
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                Selecionar
              </Button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="py-10 shadow-sm">
          <CardContent className="text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center animate-fade-in">
              <DollarSign className="w-10 h-10 text-primary" />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <h3 className="text-lg font-bold mb-1">
                {search ? "Nenhum insumo encontrado" : "Descubra quanto você realmente lucra"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {search ? `Nenhum resultado para "${search}"` : "Cadastre seus insumos e veja instantaneamente a margem real de cada produto. Sem achismo — com dados."}
              </p>
            </div>
            {!search && (
              <>
                {/* Profit simulation */}
                <div className="max-w-xs mx-auto p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 space-y-2 animate-fade-in" style={{ animationDelay: "200ms" }}>
                  <p className="text-xs font-semibold text-green-700">💰 Simulação rápida</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Custo de produção</span>
                      <span className="font-mono">R$ 3,00</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Preço de venda</span>
                      <span className="font-mono">R$ 10,00</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-xs font-bold text-green-700">
                      <span>Margem de lucro</span>
                      <span>70% → R$ 7,00 / un</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-green-600">
                      <span>50 vendas/mês</span>
                      <span>= R$ 350,00 de lucro</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-left max-w-xs mx-auto animate-fade-in" style={{ animationDelay: "300ms" }}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-green-500">✓</span> Calcule o custo real de cada produto
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-green-500">✓</span> Receba sugestões de preço inteligentes
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-green-500">✓</span> Saiba quanto pode produzir com seu estoque
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-green-500">✓</span> Desconto automático ao vender
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((ing, idx) => {
            const status = getStockStatus(ing);
            const isSelected = selectedIds.has(ing.id);
            return (
              <div
                key={ing.id}
                className={`flex items-center gap-3 p-3 rounded-xl bg-card border shadow-xs animate-fade-in transition-colors ${
                  selectionMode && isSelected
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/50"
                } ${selectionMode ? "cursor-pointer" : ""}`}
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                onClick={
                  selectionMode
                    ? () => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(ing.id)) next.delete(ing.id);
                          else next.add(ing.id);
                          return next;
                        });
                      }
                    : undefined
                }
              >
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(c) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (c) next.add(ing.id);
                        else next.delete(ing.id);
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Selecionar ${ing.name}`}
                    className="shrink-0"
                  />
                )}
                <span className="text-lg shrink-0">{status.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {ing.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ing.unit}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>
                      R$ {ing.cost_per_unit.toFixed(2).replace(".", ",")}/{ing.unit}
                    </span>
                    <span>
                      Estoque: {ing.stock_quantity} {ing.unit}
                    </span>
                    {ingredientUsageCounts && ingredientUsageCounts[ing.id] && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                        {ingredientUsageCounts[ing.id]} {ingredientUsageCounts[ing.id] === 1 ? "produto" : "produtos"}
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge variant={status.color} className="text-[10px] shrink-0">
                  {status.label}
                </Badge>
                {!selectionMode && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(ing)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-4 max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir insumo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{ing.name}" será removido e desvinculado de todos os produtos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteIngredient.mutate(ing.id)}
                            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="additionals" className="space-y-4">
          {/* Header */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Vincular Adicionais a Insumos
            </h3>
            <p className="text-xs text-muted-foreground">
              Quando um cliente escolhe um adicional (ex: "Bacon extra"), o sistema deduz automaticamente os insumos vinculados do estoque.
            </p>
          </div>

          {/* Add new mapping form */}
          {storeOptionChoices && storeOptionChoices.length > 0 && ingredients && ingredients.length > 0 ? (
            <Card className="shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Novo Vínculo</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Select value={`${ociGroup}||${ociChoice}`} onValueChange={(v) => {
                    const [g, c] = v.split("||");
                    setOciGroup(g);
                    setOciChoice(c);
                  }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Adicional..." />
                    </SelectTrigger>
                    <SelectContent>
                      {storeOptionChoices.map((oc) => (
                        <SelectItem key={`${oc.group}||${oc.choice}`} value={`${oc.group}||${oc.choice}`}>
                          {oc.group}: {oc.choice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={ociIngredientId} onValueChange={setOciIngredientId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Insumo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const selectedIng = ingredients.find((i) => i.id === ociIngredientId);
                    const baseUnit = selectedIng?.unit ?? "un";
                    return (
                      <QuantityWithUnit
                        valueInBaseUnit={ociQty}
                        baseUnit={baseUnit}
                        onChange={setOciQty}
                        placeholder="Qtd usada"
                        resetKey={`${ociIngredientId}-${ociResetKey}`}
                      />
                    );
                  })()}
                  <Button
                    size="sm"
                    className="h-9"
                    disabled={!ociGroup || !ociChoice || !ociIngredientId || ociQty <= 0 || upsertOCI.isPending}
                    onClick={() => {
                      if (!store) return;
                      upsertOCI.mutate({
                        store_id: store.id,
                        option_group_name: ociGroup,
                        choice_name: ociChoice,
                        ingredient_id: ociIngredientId,
                        quantity_used: ociQty,
                      }, {
                        onSuccess: () => {
                          setOciGroup("");
                          setOciChoice("");
                          setOciIngredientId("");
                          setOciQty(0);
                          setOciResetKey((k) => k + 1);
                        }
                      });
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Vincular
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-8 shadow-sm">
              <CardContent className="text-center space-y-3">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {!ingredients || ingredients.length === 0
                    ? "Cadastre insumos primeiro na aba 'Insumos'."
                    : "Nenhum produto com adicionais/opções encontrado. Crie opções nos produtos primeiro."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Existing mappings */}
          {optionChoiceIngredients && optionChoiceIngredients.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Vínculos Ativos ({optionChoiceIngredients.length})
              </h3>
              {optionChoiceIngredients.map((oci, idx) => (
                <div
                  key={oci.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-xs animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{oci.option_group_name}</Badge>
                      <span className="text-sm font-semibold text-foreground">{oci.choice_name}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs text-muted-foreground">
                        {oci.quantity_used} {oci.ingredient?.unit ?? ""} de{" "}
                        <strong className="text-foreground">{oci.ingredient?.name ?? "?"}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOCI.mutate(oci.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CostCalculatorModal
        open={calcOpen}
        onOpenChange={setCalcOpen}
        targetUnit={form.unit}
        onApply={(cost) => setForm((f) => ({ ...f, cost_per_unit: String(cost) }))}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} insumo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os insumos selecionados serão removidos permanentemente e desvinculados de todos os
              produtos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const ids = Array.from(selectedIds);
                await deleteIngredientsBulk.mutateAsync(ids);
                setSelectedIds(new Set());
                setSelectionMode(false);
                setBulkDeleteOpen(false);
              }}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
