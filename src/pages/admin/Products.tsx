import { useState, useMemo } from "react";
import { useMyStore, useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, DbProduct } from "@/hooks/useStore";
import { useIngredients, useProductIngredients, useLinkIngredient, useUnlinkIngredient, calculateProductCost, calculateMargin, useProductProfitability, type Ingredient } from "@/hooks/useIngredients";
import { QuantityWithUnit } from "@/components/admin/QuantityWithUnit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Star, Package, Settings2, Search, ArrowUpDown, Wheat, X } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { ProductOptionsEditor, ProductOption } from "@/components/admin/ProductOptionsEditor";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  original_price: string;
  image_url: string;
  category_id: string;
  available: boolean;
  featured: boolean;
  min_order_quantity: string;
  has_options: boolean;
  options: ProductOption[];
  stock_enabled: boolean;
  stock_quantity: string;
  fulfillment_mode: string;
}

const defaultFormData: ProductFormData = {
  name: "",
  description: "",
  price: "",
  original_price: "",
  image_url: "",
  category_id: "",
  available: true,
  featured: false,
  min_order_quantity: "1",
  has_options: false,
  options: [],
  stock_enabled: false,
  stock_quantity: "",
  fulfillment_mode: "instant",
};

type SortOption = "name" | "price-asc" | "price-desc" | "newest";

export default function Products() {
  const { data: store } = useMyStore();
  const { data: products, isLoading } = useProducts(store?.id);
  const { data: categories } = useCategories(store?.id);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const isMobile = useIsMobile();
  const { data: allIngredients } = useIngredients(store?.id);
  const { data: profitData } = useProductProfitability(store?.id);
  const linkIngredient = useLinkIngredient();
  const unlinkIngredient = useUnlinkIngredient();

  // Profit lookup map for margin badges
  const profitByProductId = useMemo(() => {
    const map: Record<string, { margin: number; cost: number }> = {};
    (profitData ?? []).forEach(p => { map[p.productId] = { margin: p.margin, cost: p.cost }; });
    return map;
  }, [profitData]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [ingredientForm, setIngredientForm] = useState({ ingredientId: "", qty: 0 });
  const [ingredientResetKey, setIngredientResetKey] = useState(0);

  const { data: productIngredients } = useProductIngredients(editingProduct?.id);
  const productCost = useMemo(() => calculateProductCost(productIngredients ?? []), [productIngredients]);
  const productMargin = useMemo(() => calculateMargin(parseFloat(formData.price) || 0, productCost), [formData.price, productCost]);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Sem categoria";
    return categories?.find((c) => c.id === categoryId)?.name || "Sem categoria";
  };

  // Filter + sort products
  const filteredProducts = (() => {
    let result = products ?? [];
    
    // Category filter
    if (filterCategory !== "all") {
      result = result.filter(p => (p.category_id || "") === filterCategory);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        getCategoryName(p.category_id).toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: return 0;
      }
    });

    return result;
  })();

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingProduct(null);
  };

  const openEditDialog = (product: DbProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      original_price: product.original_price?.toString() || "",
      image_url: product.image_url || "",
      category_id: product.category_id || "",
      available: product.available ?? true,
      featured: product.featured ?? false,
      min_order_quantity: product.min_order_quantity?.toString() || "1",
      has_options: product.has_options || false,
      options: (product.options as ProductOption[]) || [],
      stock_enabled: product.stock_enabled || false,
      stock_quantity: product.stock_quantity?.toString() || "",
      fulfillment_mode: (product as any).fulfillment_mode || "instant",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    const stockQty = formData.stock_enabled && formData.stock_quantity ? parseInt(formData.stock_quantity) : null;
    const computedAvailable = formData.stock_enabled && stockQty !== null ? stockQty > 0 : formData.available;

    const productData = {
      store_id: store.id,
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image_url: formData.image_url || null,
      category_id: formData.category_id || null,
      available: computedAvailable,
      featured: formData.featured,
      sort_order: products?.length || 0,
      min_order_quantity: parseInt(formData.min_order_quantity) || 1,
      has_options: formData.has_options,
      options: formData.has_options ? formData.options : [],
      stock_enabled: formData.stock_enabled,
      stock_quantity: stockQty,
      fulfillment_mode: formData.fulfillment_mode,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDelete = async (product: DbProduct) => {
    if (!store) return;
    await deleteProduct.mutateAsync({ id: product.id, storeId: store.id });
  };

  const handleToggleAvailability = (product: DbProduct) => {
    if (product.stock_enabled) return;
    updateProduct.mutate({ id: product.id, available: !product.available });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} produtos</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] p-0 mx-2 sm:mx-auto">
            <DialogHeader className="p-4 sm:p-6 pb-0">
              <DialogTitle className="text-base sm:text-lg">{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingProduct ? "Atualize as informações" : "Preencha os dados"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-3 sm:pt-4">
                <div className="space-y-4">
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    label="Foto do Produto"
                    folder="products"
                    aspectRatio="video"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Nome *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: X-Burger Especial" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">Descrição</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descreva seu produto..." rows={2} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-xs sm:text-sm">Preço (R$) *</Label>
                      <Input id="price" type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="29.90" required className="h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="original_price" className="text-xs sm:text-sm">Preço Orig.</Label>
                      <Input id="original_price" type="number" step="0.01" min="0" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} placeholder="39.90" className="h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_order" className="text-xs sm:text-sm">Qtd. Mín.</Label>
                      <Input id="min_order" type="number" min="1" value={formData.min_order_quantity} onChange={(e) => setFormData({ ...formData, min_order_quantity: e.target.value })} placeholder="1" className="h-10 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Categoria</Label>
                    <Select value={formData.category_id || "__none__"} onValueChange={(value) => setFormData({ ...formData, category_id: value === "__none__" ? "" : value })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem categoria</SelectItem>
                        {categories?.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Switch id="available" checked={formData.available} onCheckedChange={(checked) => setFormData({ ...formData, available: checked })} disabled={formData.stock_enabled} />
                        <Label htmlFor="available" className="text-sm">Disponível {formData.stock_enabled && <span className="text-xs text-muted-foreground">(automático)</span>}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="featured" checked={formData.featured} onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })} />
                        <Label htmlFor="featured" className="text-sm">Destaque</Label>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch id="stock_enabled" checked={formData.stock_enabled} onCheckedChange={(checked) => setFormData({ ...formData, stock_enabled: checked })} />
                        <Label htmlFor="stock_enabled" className="text-sm">Controlar Estoque</Label>
                      </div>
                      {formData.stock_enabled && (
                        <div className="space-y-2 pl-1">
                          <Label htmlFor="stock_quantity" className="text-xs text-muted-foreground">Quantidade em estoque (0 = indisponível automaticamente)</Label>
                          <Input id="stock_quantity" type="number" min="0" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} placeholder="Ex: 50" className="h-10 text-sm w-32" />
                        </div>
                      )}
                  </div>

                  {/* Fulfillment mode selector — only when preorder is enabled */}
                  {store?.preorder_enabled && (
                    <div className="space-y-2">
                      <Label className="text-sm">Modo de Atendimento</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "instant", label: "⚡ Pronta entrega", desc: "Pedido imediato" },
                          { value: "preorder", label: "📦 Encomenda", desc: "Apenas agendado" },
                          { value: "both", label: "🔄 Ambos", desc: "Cliente escolhe" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, fulfillment_mode: opt.value })}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                              formData.fulfillment_mode === opt.value
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <span className="text-sm font-bold">{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Define se este produto aceita pronta entrega, encomenda agendada, ou ambos.
                      </p>
                    </div>
                  )}
                </div>
                </div>

                {/* ── 💰 Custo de Produção (moved here, right after price) ── */}
                <Separator />
                {!editingProduct ? (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-primary" />
                      💰 Custo de Produção
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      💡 Salve o produto primeiro para vincular insumos e calcular o custo de produção.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Wheat className="w-4 h-4 text-primary" />
                        💰 Custo de Produção
                      </Label>
                      {productCost > 0 && (
                        <Badge
                          variant={productMargin >= 50 ? "default" : productMargin >= 25 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          Margem: {productMargin}%
                        </Badge>
                      )}
                    </div>
                    {/* Visual margin bar */}
                    {productCost > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${Math.max(0, Math.min(100, productMargin))}%`,
                              backgroundColor: productMargin >= 50 ? 'hsl(var(--primary))' : productMargin >= 25 ? 'hsl(45 93% 47%)' : 'hsl(var(--destructive))',
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {productMargin >= 50 ? "✅ Margem saudável" : productMargin >= 25 ? "⚠️ Margem moderada" : "🔴 Margem baixa — considere ajustar o preço"}
                        </p>
                        {productMargin < 30 && productCost > 0 && (() => {
                          const suggested = Math.ceil((productCost / 0.6) * 100) / 100;
                          return (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, price: suggested.toFixed(2) })}
                              className="mt-1 w-full text-left px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all group"
                            >
                              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                💡 Sugestão: R$ {suggested.toFixed(2).replace(".", ",")} para 40% de margem
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">— clique para aplicar</span>
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    )}

                    {/* Stock vs Ingredients note */}
                    {formData.stock_enabled && (productIngredients ?? []).length > 0 && (
                      <div className="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <p className="text-[10px] text-blue-700">
                          ℹ️ <strong>Estoque do produto</strong> = itens prontos para venda. <strong>Insumos</strong> = matéria-prima (descontados automaticamente ao confirmar pedido).
                        </p>
                      </div>
                    )}

                    {/* Linked ingredients */}
                    {(productIngredients ?? []).length > 0 && (
                      <div className="space-y-1.5">
                        {productIngredients!.map((pi) => (
                          <div key={pi.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-sm flex-1 truncate">{pi.ingredient?.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {pi.quantity_used} {pi.ingredient?.unit}
                            </span>
                            <span className="text-xs font-semibold text-primary shrink-0">
                              R$ {((pi.quantity_used * (pi.ingredient?.cost_per_unit ?? 0))).toFixed(2).replace(".", ",")}
                            </span>
                            <button
                              type="button"
                              onClick={() => unlinkIngredient.mutate({ id: pi.id, productId: editingProduct.id })}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10"
                            >
                              <X className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                          <span className="text-xs font-semibold">Custo Total</span>
                          <span className="text-sm font-bold text-primary">
                            R$ {productCost.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Add ingredient */}
                    {allIngredients && allIngredients.length > 0 && (
                      <div className="flex gap-2">
                        <Select
                          value={ingredientForm.ingredientId}
                          onValueChange={(v) => setIngredientForm({ ...ingredientForm, ingredientId: v })}
                        >
                          <SelectTrigger className="flex-1 h-9 text-xs">
                            <SelectValue placeholder="Selecionar insumo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allIngredients
                              .filter((ing) => !(productIngredients ?? []).some((pi) => pi.ingredient_id === ing.id))
                              .map((ing) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} (R$ {ing.cost_per_unit.toFixed(2)}/{ing.unit})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {(() => {
                          const selectedIng = (allIngredients ?? []).find((i) => i.id === ingredientForm.ingredientId);
                          const baseUnit = selectedIng?.unit ?? "un";
                          return (
                            <QuantityWithUnit
                              valueInBaseUnit={ingredientForm.qty}
                              baseUnit={baseUnit}
                              onChange={(v) => setIngredientForm({ ...ingredientForm, qty: v })}
                              placeholder="Qtd"
                              className="w-44"
                              resetKey={`${ingredientForm.ingredientId}-${ingredientResetKey}`}
                            />
                          );
                        })()}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 px-3"
                          disabled={!ingredientForm.ingredientId || ingredientForm.qty <= 0}
                          onClick={() => {
                            linkIngredient.mutate({
                              product_id: editingProduct.id,
                              ingredient_id: ingredientForm.ingredientId,
                              quantity_used: ingredientForm.qty,
                            });
                            setIngredientForm({ ingredientId: "", qty: 0 });
                            setIngredientResetKey((k) => k + 1);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {(!allIngredients || allIngredients.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        Cadastre insumos em <a href="/admin/ingredients" className="text-primary underline">Custos & Lucro</a> para vincular aqui.
                      </p>
                    )}
                  </div>
                )}

                <Separator />
                <ProductOptionsEditor
                  options={formData.options}
                  onChange={(options) => setFormData({ ...formData, options })}
                  hasOptions={formData.has_options}
                  onHasOptionsChange={(hasOptions) =>
                    setFormData({
                      ...formData,
                      has_options: hasOptions,
                      options: hasOptions && formData.options.length === 0
                        ? [{ name: "", required: false, max_select: 1, min_select: 0, choices: [{ name: "", price_modifier: 0 }] }]
                        : formData.options,
                    })
                  }
                />



                <DialogFooter className="pt-4 flex-col gap-2 sm:flex-row">
                  <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="w-full sm:w-auto">
                    {editingProduct ? "Salvar" : "Criar Produto"}
                  </Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setFilterCategory("all")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
          }`}
        >
          Todos ({products?.length ?? 0})
        </button>
        {categories?.map(cat => {
          const count = products?.filter(p => p.category_id === cat.id).length ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setFilterCategory("")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterCategory === "" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
          }`}
        >
          Sem categoria
        </button>
      </div>

      {/* Search + sort row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-10 h-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-auto h-10 gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Ordenar</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mais recente</SelectItem>
            <SelectItem value="name">Nome A-Z</SelectItem>
            <SelectItem value="price-asc">Menor preço</SelectItem>
            <SelectItem value="price-desc">Maior preço</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="py-8 sm:py-12">
          <CardContent className="text-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">
              {searchQuery ? "Nenhum produto encontrado" : "Nenhum produto"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? `Nenhum resultado para "${searchQuery}"` : "Adicione seu primeiro produto"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile: compact list layout */
        <div className="space-y-1.5">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50 shadow-xs"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">{product.name}</span>
                  {product.featured && <Star className="w-3 h-3 text-accent shrink-0 fill-accent" />}
                  {product.has_options && <Settings2 className="w-3 h-3 text-muted-foreground shrink-0" />}
                  {store?.preorder_enabled && (product as any).fulfillment_mode && (product as any).fulfillment_mode !== "instant" && (
                    <span className="text-[10px] shrink-0">
                      {(product as any).fulfillment_mode === "preorder" ? "📦" : "🔄"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-bold text-primary">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                  {product.original_price && (
                    <span className="text-[10px] text-muted-foreground line-through">
                      R$ {product.original_price.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                  {profitByProductId[product.id] && (
                    <Badge
                      variant={profitByProductId[product.id].margin >= 50 ? "default" : profitByProductId[product.id].margin >= 25 ? "secondary" : "destructive"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {profitByProductId[product.id].margin}%
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {getCategoryName(product.category_id)}
                  </span>
                </div>
              </div>

              {/* Availability toggle */}
              <Switch
                checked={product.available ?? true}
                onCheckedChange={() => handleToggleAvailability(product)}
                disabled={product.stock_enabled ?? false}
                className="shrink-0"
              />

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditDialog(product)}
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
                  <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">
                        O produto "{product.name}" será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(product)} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Stock badge */}
              {product.stock_enabled && (
                <Badge variant="outline" className={`text-[10px] shrink-0 ${
                  (product.stock_quantity ?? 0) === 0 ? "border-destructive/30 text-destructive" :
                  (product.stock_quantity ?? 0) <= 5 ? "border-warning/30 text-warning" :
                  "border-border"
                }`}>
                  {product.stock_quantity ?? 0}
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: card grid */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-muted relative">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                )}
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  {product.featured && (
                    <Badge className="bg-accent text-accent-foreground text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Destaque
                    </Badge>
                  )}
                  {product.has_options && (
                    <Badge variant="outline" className="bg-background/80 text-xs">
                      <Settings2 className="w-3 h-3 mr-1" />
                      Opções
                    </Badge>
                  )}
                  {store?.preorder_enabled && (product as any).fulfillment_mode && (product as any).fulfillment_mode !== "instant" && (
                    <Badge variant="outline" className="bg-background/80 text-xs">
                      {(product as any).fulfillment_mode === "preorder" ? "📦 Encomenda" : "🔄 Ambos"}
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleAvailability(product); }}
                  className="absolute top-2 right-2"
                  title={product.stock_enabled ? "Controlado por estoque" : (product.available ? "Desativar" : "Ativar")}
                >
                  <Badge 
                    variant={product.available ? "default" : "secondary"} 
                    className={`text-xs cursor-pointer transition-opacity hover:opacity-80 ${product.available ? "bg-success hover:bg-success/90" : ""}`}
                  >
                    {product.available ? "Disponível" : "Indisponível"}
                  </Badge>
                </button>
                {product.stock_enabled && (
                  <Badge variant="outline" className="absolute bottom-2 right-2 text-xs bg-background/80">
                    Estoque: {product.stock_quantity ?? 0}
                  </Badge>
                )}
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base line-clamp-1">{product.name}</CardTitle>
                    <CardDescription className="text-xs">{getCategoryName(product.category_id)}</CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-primary text-base">R$ {product.price.toFixed(2).replace(".", ",")}</div>
                    {product.original_price && (
                      <div className="text-xs text-muted-foreground line-through">
                        R$ {product.original_price.toFixed(2).replace(".", ",")}
                      </div>
                    )}
                    {profitByProductId[product.id] && (
                      <Badge
                        variant={profitByProductId[product.id].margin >= 50 ? "default" : profitByProductId[product.id].margin >= 25 ? "secondary" : "destructive"}
                        className="text-[10px] mt-0.5"
                      >
                        {profitByProductId[product.id].margin}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {product.description || "Sem descrição"}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={() => openEditDialog(product)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 h-9 w-9 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          O produto "{product.name}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
