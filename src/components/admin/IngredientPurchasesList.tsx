import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Trash2, Package, Calendar, TrendingDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useIngredientPurchases,
  useDeletePurchase,
  useRegisterPurchase,
  calculateWeightedAvgCost,
  getNextOutCost,
} from "@/hooks/useIngredientPurchases";
import { CostCalculatorModal } from "./CostCalculatorModal";
import type { Ingredient } from "@/hooks/useIngredients";
import { getUnitLabel } from "@/lib/unitConversion";

interface Props {
  ingredient: Ingredient;
}

export function IngredientPurchasesList({ ingredient }: Props) {
  const { data: purchases = [], isLoading } = useIngredientPurchases(ingredient.id);
  const deletePurchase = useDeletePurchase();
  const registerPurchase = useRegisterPurchase();

  const [showAdd, setShowAdd] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [qty, setQty] = useState("");
  const [paid, setPaid] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const avg = calculateWeightedAvgCost(purchases);
  const next = getNextOutCost(purchases);
  const unitLabel = getUnitLabel(ingredient.unit);

  const handleAdd = async () => {
    const q = parseFloat(qty.replace(",", "."));
    const p = parseFloat(paid.replace(",", "."));
    if (!isFinite(q) || q <= 0 || !isFinite(p) || p <= 0) return;
    await registerPurchase.mutateAsync({
      ingredient_id: ingredient.id,
      store_id: ingredient.store_id,
      quantity: q,
      total_paid: p,
    });
    setQty("");
    setPaid("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Histórico de compras (lotes)</h4>
          <p className="text-xs text-muted-foreground">FIFO: o lote mais antigo sai primeiro</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)} variant={showAdd ? "outline" : "default"}>
          <Plus className="w-4 h-4 mr-1" />
          {showAdd ? "Cancelar" : "Nova compra"}
        </Button>
      </div>

      {showAdd && (
        <Card className="p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Quantidade ({unitLabel})</label>
              <Input
                type="number"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Ex: 5"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Valor pago (R$)</label>
              <Input
                type="number"
                step="any"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="Ex: 25,00"
                className="h-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setShowCalc(true)}
              className="flex-1"
            >
              Calculadora
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={registerPurchase.isPending || !qty || !paid}
              className="flex-1"
            >
              Registrar lote
            </Button>
          </div>
        </Card>
      )}

      {(avg > 0 || next !== null) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Card className="p-2">
            <p className="text-muted-foreground">Próximo a sair (FIFO)</p>
            <p className="font-semibold text-primary">
              {next !== null ? `R$ ${next.toFixed(4)}/${ingredient.unit}` : "—"}
            </p>
          </Card>
          <Card className="p-2">
            <p className="text-muted-foreground">Custo médio ponderado</p>
            <p className="font-semibold">
              {avg > 0 ? `R$ ${avg.toFixed(4)}/${ingredient.unit}` : "—"}
            </p>
          </Card>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : purchases.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <Package className="w-6 h-6 mx-auto mb-1 opacity-50" />
          Nenhum lote registrado ainda
        </Card>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => {
            const isActive = p.quantity_remaining > 0;
            const isIntact = p.quantity_remaining === p.quantity_purchased;
            return (
              <Card key={p.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Em uso" : "Esgotado"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(p.purchased_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm">
                      <span className="font-medium">
                        {p.quantity_remaining.toLocaleString("pt-BR")} / {p.quantity_purchased.toLocaleString("pt-BR")} {ingredient.unit}
                      </span>
                      <span className="text-muted-foreground"> restantes</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <TrendingDown className="w-3 h-3" />
                      Pagou R$ {p.total_paid.toFixed(2)} → R$ {p.cost_per_unit.toFixed(4)}/{ingredient.unit}
                    </div>
                    {p.notes && <p className="text-xs italic text-muted-foreground mt-1">{p.notes}</p>}
                  </div>
                  {isIntact && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete(p.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CostCalculatorModal
        open={showCalc}
        onOpenChange={setShowCalc}
        targetUnit={ingredient.unit}
        onApply={(costPerUnit) => {
          // Pre-fill: assume user buys 1 base unit at this cost
          const q = parseFloat(qty.replace(",", ".")) || 1;
          setQty(String(q));
          setPaid((q * costPerUnit).toFixed(2));
          setShowCalc(false);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse lote ainda está intacto. A exclusão é permanente e ajustará o estoque do insumo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deletePurchase.mutate({ id: confirmDelete, ingredientId: ingredient.id });
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
