import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { convert, getCompatibleUnits, isCompatible } from "@/lib/unitConversion";

interface CostCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The unit the ingredient is stored in (e.g. "kg") */
  targetUnit: string;
  /** Called with the calculated cost-per-target-unit */
  onApply: (costPerUnit: number) => void;
}

export function CostCalculatorModal({ open, onOpenChange, targetUnit, onApply }: CostCalculatorModalProps) {
  const compatibleUnits = getCompatibleUnits(targetUnit);
  const [purchasedQty, setPurchasedQty] = useState("");
  const [purchasedUnit, setPurchasedUnit] = useState(targetUnit);
  const [paidAmount, setPaidAmount] = useState("");

  useEffect(() => {
    if (open) {
      setPurchasedQty("");
      setPurchasedUnit(targetUnit);
      setPaidAmount("");
    }
  }, [open, targetUnit]);

  const qty = parseFloat(purchasedQty.replace(",", ".")) || 0;
  const paid = parseFloat(paidAmount.replace(",", ".")) || 0;

  const compatible = isCompatible(purchasedUnit, targetUnit);
  const qtyInTargetUnit = compatible ? convert(qty, purchasedUnit, targetUnit) : NaN;
  const costPerTargetUnit =
    qtyInTargetUnit > 0 && paid > 0 ? Math.round((paid / qtyInTargetUnit) * 10000) / 10000 : 0;

  const canApply = qty > 0 && paid > 0 && compatible && costPerTargetUnit > 0;

  const handleApply = () => {
    if (!canApply) return;
    onApply(costPerTargetUnit);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Calcular custo automaticamente
          </DialogTitle>
          <DialogDescription>
            Informe quanto comprou e quanto pagou — o sistema calcula o custo por <strong>{targetUnit}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">Quantidade comprada</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={purchasedQty}
                onChange={(e) => setPurchasedQty(e.target.value)}
                placeholder="Ex: 575"
                className="flex-1"
                autoFocus
              />
              <Select value={purchasedUnit} onValueChange={setPurchasedUnit}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {compatibleUnits.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Valor pago (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Ex: 20,00"
            />
          </div>

          {qty > 0 && paid > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Equivalente em {targetUnit}:</span>
                <span className="font-mono">
                  {isFinite(qtyInTargetUnit) ? qtyInTargetUnit.toString().replace(".", ",") : "—"} {targetUnit}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-primary">
                <span>Custo por {targetUnit}:</span>
                <span className="font-mono">
                  {costPerTargetUnit > 0 ? `R$ ${costPerTargetUnit.toFixed(4).replace(".", ",")}` : "—"}
                </span>
              </div>
            </div>
          )}

          {qty > 0 && !compatible && (
            <p className="text-xs text-destructive">
              Unidade incompatível com <strong>{targetUnit}</strong>.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!canApply} className="w-full sm:w-auto">
            Aplicar R$ {costPerTargetUnit.toFixed(4).replace(".", ",")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
