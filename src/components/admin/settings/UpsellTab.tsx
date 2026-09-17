import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TrendingUp, Zap, Settings2, Plus, Trash2, Package, Layers, Brain, Target, Sparkles } from "lucide-react";
import { useUpsellRules, useCreateUpsellRule, useDeleteUpsellRule, UpsellRule } from "@/hooks/useUpsell";
import { DbProduct, DbCategory } from "@/hooks/useStore";

interface UpsellTabProps {
  storeId: string;
  upsellEnabled: boolean;
  setUpsellEnabled: (v: boolean) => void;
  upsellMode: string;
  setUpsellMode: (v: string) => void;
  products: DbProduct[];
  categories: DbCategory[];
}

export function UpsellTab({
  storeId,
  upsellEnabled,
  setUpsellEnabled,
  upsellMode,
  setUpsellMode,
  products,
  categories,
}: UpsellTabProps) {
  const { data: rules } = useUpsellRules(storeId);
  const createRule = useCreateUpsellRule();
  const deleteRule = useDeleteUpsellRule();

  const [newSourceType, setNewSourceType] = useState<"product" | "category">("product");
  const [newSourceId, setNewSourceId] = useState("");
  const [newSuggestedIds, setNewSuggestedIds] = useState<string[]>([]);

  const handleAddRule = async () => {
    if (!newSourceId || newSuggestedIds.length === 0) return;
    await createRule.mutateAsync({
      store_id: storeId,
      source_type: newSourceType,
      source_id: newSourceId,
      suggested_product_ids: newSuggestedIds,
      priority: (rules?.length || 0) + 1,
    });
    setNewSourceId("");
    setNewSuggestedIds([]);
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || "Produto removido";
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "Categoria removida";

  const toggleSuggested = (productId: string) => {
    setNewSuggestedIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Hero card with neuroscience explanation */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white shadow-medium">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Upsell Inteligente</CardTitle>
              <CardDescription>
                Aumente o ticket médio com sugestões estratégicas no carrinho
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-card border border-border/50">
              <Brain className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Ancoragem</p>
              <p className="text-[10px] text-muted-foreground/70">Efeito preço-âncora</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border/50">
              <Sparkles className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Impulso</p>
              <p className="text-[10px] text-muted-foreground/70">Compra por impulso</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border/50">
              <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Relevância</p>
              <p className="text-[10px] text-muted-foreground/70">Contexto do pedido</p>
            </div>
          </div>

          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${upsellEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="font-semibold text-sm">Ativar Upsell</p>
                <p className="text-xs text-muted-foreground">
                  Sugestões aparecem no carrinho do cliente
                </p>
              </div>
            </div>
            <Switch checked={upsellEnabled} onCheckedChange={setUpsellEnabled} />
          </div>
        </CardContent>
      </Card>

      {upsellEnabled && (
        <>
          {/* Mode selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Modo de Operação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  value: "auto",
                  title: "🤖 Automático",
                  desc: "O sistema sugere produtos da mesma categoria e destaques automaticamente.",
                },
                {
                  value: "custom",
                  title: "🎯 Personalizado",
                  desc: "Você define manualmente quais produtos sugerir para cada produto ou categoria.",
                },
                {
                  value: "both",
                  title: "⚡ Combinado",
                  desc: "Prioridade para suas regras personalizadas, complementado com sugestões automáticas.",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUpsellMode(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    upsellMode === opt.value
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border/50 bg-card hover:border-primary/30"
                  }`}
                >
                  <p className="font-semibold text-sm">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Custom rules */}
          {(upsellMode === "custom" || upsellMode === "both") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Regras Personalizadas
                </CardTitle>
                <CardDescription className="text-xs">
                  Defina quais produtos sugerir quando o cliente tem determinado produto ou categoria no carrinho.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing rules */}
                {rules && rules.length > 0 && (
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {rule.source_type === "product" ? "Produto" : "Categoria"}
                            </Badge>
                            <span className="text-sm font-medium truncate">
                              {rule.source_type === "product"
                                ? getProductName(rule.source_id)
                                : getCategoryName(rule.source_id)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs text-muted-foreground">Sugere →</span>
                            {rule.suggested_product_ids.map((pid) => (
                              <Badge key={pid} className="text-[10px] bg-primary/10 text-primary border-0">
                                {getProductName(pid)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover regra?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRule.mutate({ id: rule.id, storeId })}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Add new rule */}
                <div className="space-y-3 p-4 rounded-xl bg-card border border-dashed border-primary/30">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Nova Regra
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newSourceType} onValueChange={(v) => { setNewSourceType(v as "product" | "category"); setNewSourceId(""); }}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Produto</SelectItem>
                          <SelectItem value="category">Categoria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {newSourceType === "product" ? "Produto Gatilho" : "Categoria Gatilho"}
                      </Label>
                      <Select value={newSourceId} onValueChange={setNewSourceId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {newSourceType === "product"
                            ? products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))
                            : categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Produtos Sugeridos (selecione)</Label>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-lg bg-secondary/30 border border-border/30">
                      {products
                        .filter(p => p.id !== newSourceId)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleSuggested(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              newSuggestedIds.includes(p.id)
                                ? "bg-primary text-primary-foreground shadow-soft"
                                : "bg-card border border-border/50 text-foreground hover:border-primary/30"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                    </div>
                    {newSuggestedIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {newSuggestedIds.length} produto{newSuggestedIds.length > 1 ? "s" : ""} selecionado{newSuggestedIds.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleAddRule}
                    disabled={!newSourceId || newSuggestedIds.length === 0 || createRule.isPending}
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Regra
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto mode info */}
          {upsellMode === "auto" && (
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Modo 100% automático ativo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O sistema analisa os itens do carrinho e sugere automaticamente:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li>• Produtos da mesma categoria (complementares)</li>
                      <li>• Produtos em destaque (mais vendidos)</li>
                      <li>• Prioridade para produtos com melhor margem</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
