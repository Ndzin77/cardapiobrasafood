import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Sparkles, Merge } from "lucide-react";
import {
  type DuplicateGroup,
  type DetectableItem,
  mergeItems,
  pickLargestUnit,
} from "@/lib/duplicateDetection";
import { convert, isCompatible, getCompatibleUnits } from "@/lib/unitConversion";

interface Props<T extends DetectableItem> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: DuplicateGroup<T>[];
  allItems: T[];
  /** Called when user confirms with the new merged list (replacement for allItems). */
  onApply: (merged: T[]) => void;
  /** Called when user skips merging entirely. */
  onSkip: () => void;
}

interface GroupState {
  // Per-index-in-group: whether the row is selected for merging
  selected: boolean[];
  finalName: string;
  targetUnit: string;
  /** "merge" → merge selected rows; "keep" → keep all rows separate */
  decision: "merge" | "keep";
}

export function MergeDuplicatesModal<T extends DetectableItem>({
  open,
  onOpenChange,
  groups,
  allItems,
  onApply,
  onSkip,
}: Props<T>) {
  const [state, setState] = useState<GroupState[]>([]);

  // Initialize state when groups change
  useEffect(() => {
    if (!open) return;
    setState(
      groups.map((g) => ({
        selected: g.items.map(() => true),
        finalName: g.suggestedName,
        targetUnit: pickLargestUnit(g.items.map((it) => it.unit)),
        decision: "merge" as const,
      })),
    );
  }, [groups, open]);

  const updateGroup = (gi: number, patch: Partial<GroupState>) => {
    setState((prev) => prev.map((s, i) => (i === gi ? { ...s, ...patch } : s)));
  };

  const toggleRow = (gi: number, ri: number, checked: boolean) => {
    setState((prev) =>
      prev.map((s, i) => {
        if (i !== gi) return s;
        const selected = s.selected.map((v, j) => (j === ri ? checked : v));
        return { ...s, selected };
      }),
    );
  };

  const handleApply = () => {
    // Build new array: drop items belonging to groups that we're merging,
    // then append a single merged item per such group. Untouched items stay in order.
    const removedIndices = new Set<number>();
    const appended: T[] = [];

    groups.forEach((g, gi) => {
      const s = state[gi];
      if (!s) return;
      if (s.decision !== "merge") return;
      const selectedItems: T[] = [];
      const selectedOriginalIndices: number[] = [];
      g.items.forEach((it, ri) => {
        if (s.selected[ri]) {
          selectedItems.push(it);
          selectedOriginalIndices.push(g.indices[ri]);
        }
      });
      if (selectedItems.length < 2) return; // nothing to merge meaningfully
      const merged = mergeItems(selectedItems, s.finalName, s.targetUnit);
      if (!merged) return;
      selectedOriginalIndices.forEach((idx) => removedIndices.add(idx));
      appended.push(merged);
    });

    const next: T[] = [];
    allItems.forEach((it, i) => {
      if (!removedIndices.has(i)) next.push(it);
    });
    next.push(...appended);
    onApply(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Encontramos itens parecidos
          </DialogTitle>
          <DialogDescription>
            Selecione o que deseja juntar em um único lote, ou deixe separados se forem produtos
            diferentes (marcas/qualidades).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {groups.map((g, gi) => {
            const s = state[gi];
            if (!s) return null;
            const selectedItems = g.items.filter((_, ri) => s.selected[ri]);
            const compatibleSelected = selectedItems.every((it) =>
              isCompatible(it.unit, s.targetUnit),
            );
            const preview =
              s.decision === "merge" && selectedItems.length >= 2 && compatibleSelected
                ? mergeItems(selectedItems, s.finalName, s.targetUnit)
                : null;

            const unitOptions = getCompatibleUnits(g.items[0].unit);

            return (
              <Card key={gi} className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground">
                      Nome do grupo
                    </label>
                    <Input
                      value={s.finalName}
                      onChange={(e) => updateGroup(gi, { finalName: e.target.value })}
                      className="h-8 mt-1"
                      disabled={s.decision !== "merge"}
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-muted-foreground">
                      Unidade final
                    </label>
                    <Select
                      value={s.targetUnit}
                      onValueChange={(v) => updateGroup(gi, { targetUnit: v })}
                      disabled={s.decision !== "merge"}
                    >
                      <SelectTrigger className="h-8 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {g.priceWarning && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                    <span>
                      Preços por unidade muito diferentes — pode ser marca ou qualidade distinta.
                      Confira antes de juntar.
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  {g.items.map((it, ri) => {
                    const compat = isCompatible(it.unit, s.targetUnit);
                    const cpu =
                      it.quantity > 0 && it.total_paid > 0
                        ? it.total_paid / it.quantity
                        : 0;
                    return (
                      <div
                        key={ri}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                      >
                        <Checkbox
                          checked={s.selected[ri] && compat}
                          disabled={!compat || s.decision !== "merge"}
                          onCheckedChange={(c) => toggleRow(gi, ri, !!c)}
                          aria-label={`Selecionar ${it.name}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{it.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.quantity} {it.unit} · R$ {it.total_paid.toFixed(2)}
                            {cpu > 0 && (
                              <span className="ml-1">
                                (R$ {cpu.toFixed(2)}/{it.unit})
                              </span>
                            )}
                            {!compat && (
                              <span className="ml-1 text-destructive">· unidade incompatível</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {preview && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/20">
                    <Merge className="w-4 h-4 text-primary shrink-0" />
                    <div className="text-sm flex-1">
                      <div className="font-semibold">→ {preview.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {preview.quantity} {preview.unit} · R$ {preview.total_paid.toFixed(2)}
                        {preview.quantity > 0 && (
                          <span className="ml-1">
                            (R$ {(preview.total_paid / preview.quantity).toFixed(2)}/
                            {preview.unit})
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{selectedItems.length} itens</Badge>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={s.decision === "merge" ? "default" : "outline"}
                    onClick={() => updateGroup(gi, { decision: "merge" })}
                    className="flex-1"
                  >
                    Juntar marcados
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={s.decision === "keep" ? "default" : "outline"}
                    onClick={() => updateGroup(gi, { decision: "keep" })}
                    className="flex-1"
                  >
                    Deixar separados
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Pular tudo
          </Button>
          <Button type="button" onClick={handleApply}>
            Aplicar e revisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
