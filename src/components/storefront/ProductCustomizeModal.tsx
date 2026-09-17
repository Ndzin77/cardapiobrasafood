import { useState, useMemo, useRef, useEffect } from "react";
import { Product, ProductOption } from "@/types/store";
import { useCart } from "@/hooks/useCart";
import { sanitizeProductOptions } from "@/lib/sanitizeProductOptions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ShoppingBag, Check, AlertCircle, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCustomizeModalProps {
  product: Product | null;
  options: ProductOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minQuantity?: number;
}

type Selections = Record<string, Record<string, number>>;

export function ProductCustomizeModal({
  product,
  options,
  open,
  onOpenChange,
  minQuantity = 1,
}: ProductCustomizeModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(minQuantity);
  const [selections, setSelections] = useState<Selections>({});
  const [notes, setNotes] = useState("");
  const [limitHit, setLimitHit] = useState<string | null>(null);
  const [compactHeader, setCompactHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeOptions = useMemo(() => sanitizeProductOptions(options), [options]);

  // Shrink the image header while scrolling instead of letting the sheet resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        setCompactHeader(el.scrollTop > 40);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!limitHit) return;
    const t = setTimeout(() => setLimitHit(null), 2200);
    return () => clearTimeout(t);
  }, [limitHit]);

  /** Group limits count DISTINCT choices, never repetitions */
  const groupCount = (groupName: string) =>
    Object.keys(selections[groupName] || {}).length;

  const effectiveMinOf = (opt: ProductOption) =>
    opt.required ? Math.max(opt.min_select || 0, 1) : opt.min_select || 0;

  const additionalPrice = useMemo(() => {
    let total = 0;
    activeOptions.forEach((opt) => {
      const picked = selections[opt.name] || {};
      Object.entries(picked).forEach(([choiceName, qty]) => {
        const choice = opt.choices.find((c) => c.name === choiceName);
        if (choice) total += (choice.price_modifier || 0) * qty;
      });
    });
    return total;
  }, [selections, activeOptions]);

  const unitPrice = (product?.price || 0) + additionalPrice;
  const totalPrice = unitPrice * quantity;

  /** Groups that still block the add-to-cart button, in page order */
  const pendingGroups = useMemo(
    () =>
      activeOptions.filter((opt) => {
        const min = effectiveMinOf(opt);
        return min > 0 && Object.keys(selections[opt.name] || {}).length < min;
      }),
    [selections, activeOptions]
  );

  const isValid = pendingGroups.length === 0;
  const nextPending = pendingGroups[0];
  const requiredGroups = activeOptions.filter((opt) => effectiveMinOf(opt) > 0);
  const doneRequired = requiredGroups.length - pendingGroups.length;

  const scrollToGroup = (groupName: string) => {
    const el = groupRefs.current[groupName];
    const container = scrollRef.current;
    if (!el || !container) return;
    container.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
  };

  const choiceMin = (opt: ProductOption, choiceName: string) => {
    const choice = opt.choices.find((c) => c.name === choiceName);
    if (!choice?.allow_multiple) return 1;
    return choice.min_qty && choice.min_qty > 0 ? choice.min_qty : 1;
  };

  const choiceMax = (opt: ProductOption, choiceName: string) => {
    const choice = opt.choices.find((c) => c.name === choiceName);
    if (!choice?.allow_multiple) return 1;
    return choice.max_qty && choice.max_qty > 0 ? choice.max_qty : 99;
  };

  const changeQty = (opt: ProductOption, choiceName: string, delta: number) => {
    setSelections((prev) => {
      const group = { ...(prev[opt.name] || {}) };
      const current = group[choiceName] || 0;
      const min = choiceMin(opt, choiceName);
      const max = choiceMax(opt, choiceName);
      const groupMax = Math.max(opt.max_select || 1, 1);

      if (delta > 0) {
        // First tap jumps straight to the minimum required repetitions
        const next = current === 0 ? min : current + delta;
        if (next > max) {
          setLimitHit(`${opt.name}:${choiceName}`);
          return prev;
        }
        if (current === 0 && Object.keys(group).length + 1 > groupMax) {
          setLimitHit(opt.name);
          return prev;
        }
        group[choiceName] = next;
        return { ...prev, [opt.name]: group };
      }

      const next = current + delta;
      // Dropping below the per-choice minimum removes it entirely
      if (next < min) delete group[choiceName];
      else group[choiceName] = next;
      return { ...prev, [opt.name]: group };
    });
  };

  const selectSingle = (opt: ProductOption, choiceName: string) => {
    setSelections((prev) => {
      const group = prev[opt.name] || {};
      const isOptional = !opt.required && (opt.min_select || 0) === 0;
      if (isOptional && group[choiceName]) return { ...prev, [opt.name]: {} };
      return { ...prev, [opt.name]: { [choiceName]: 1 } };
    });
  };

  const reset = () => {
    setQuantity(minQuantity);
    setSelections({});
    setNotes("");
    setCompactHeader(false);
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!isValid) {
      if (nextPending) scrollToGroup(nextPending.name);
      return;
    }

    const structuredOptions = activeOptions
      .map((opt) => {
        const picked = Object.entries(selections[opt.name] || {});
        if (picked.length === 0) return null;
        return {
          group: opt.name,
          choices: picked.map(([choiceName, qty]) => {
            const choice = opt.choices.find((c) => c.name === choiceName);
            return { name: choiceName, price: choice?.price_modifier || 0, qty };
          }),
        };
      })
      .filter(Boolean) as { group: string; choices: { name: string; price: number; qty: number }[] }[];

    const selectionNotes = structuredOptions
      .map((g) => `${g.group}: ${g.choices.map((c) => (c.qty > 1 ? `${c.qty}x ${c.name}` : c.name)).join(", ")}`)
      .join(" | ");

    const fullNotes = [selectionNotes, notes].filter(Boolean).join(" - ");

    addItem(
      { ...product, price: unitPrice },
      quantity,
      fullNotes || undefined,
      structuredOptions.length > 0 ? structuredOptions : undefined
    );

    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[88vh] rounded-t-3xl p-0 flex flex-col overflow-hidden"
      >
        {/* Product Header — shrinks on scroll, sheet height stays fixed */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-full overflow-hidden transition-[height] duration-300 ease-out",
              compactHeader ? "h-20 sm:h-24" : "h-36 sm:h-52"
            )}
          >
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 backdrop-blur-sm bg-background/40">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {product.name}
              </SheetTitle>
            </SheetHeader>
            {!compactHeader && (
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-lg font-bold text-primary">
                R$ {product.price.toFixed(2).replace(".", ",")}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through opacity-70">
                  R$ {product.originalPrice.toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Guided progress bar for required groups */}
        {requiredGroups.length > 0 && (
          <div className="shrink-0 px-4 py-2.5 border-b border-border/40 bg-secondary/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Etapa {Math.min(doneRequired + 1, requiredGroups.length)} de {requiredGroups.length}
                  {isValid ? " • tudo pronto!" : ""}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isValid ? "Você já pode adicionar ao carrinho" : `Falta escolher: ${nextPending?.name}`}
                </p>
              </div>
              {!isValid && (
                <button
                  type="button"
                  onClick={() => nextPending && scrollToGroup(nextPending.name)}
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
                >
                  Ir agora <ArrowDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex gap-1">
              {requiredGroups.map((g) => {
                const done = !pendingGroups.includes(g);
                return (
                  <span
                    key={g.name}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-300",
                      done ? "bg-accent" : "bg-border"
                    )}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Options — scrollable, anchor disabled so the list never jumps */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6 overscroll-contain [overflow-anchor:none]"
        >
          {activeOptions.map((option) => {
            const groupMax = Math.max(option.max_select || 1, 1);
            const isMultiple = groupMax > 1 || option.choices.some((c) => c.allow_multiple);
            const picked = selections[option.name] || {};
            const distinct = groupCount(option.name);
            const effectiveMin = effectiveMinOf(option);
            const minMet = distinct >= effectiveMin;
            const progress = Math.min(100, (distinct / groupMax) * 100);
            const groupLimitHit = limitHit === option.name;
            const isNext = nextPending?.name === option.name;

            return (
              <div
                key={option.name}
                ref={(el) => { groupRefs.current[option.name] = el; }}
                className={cn(
                  "space-y-3 scroll-mt-4 rounded-2xl transition-all duration-300",
                  isNext && "ring-2 ring-primary/40 bg-primary/[0.03] p-3 -mx-1"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {option.name}
                      {effectiveMin > 0 && minMet && (
                        <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <Check className="w-3 h-3 text-accent-foreground" />
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isMultiple ? `Escolha até ${groupMax} opções` : "Escolha 1 opção"}
                      {effectiveMin > 0 && ` • mínimo ${effectiveMin}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {option.required && (
                      <Badge
                        variant={minMet ? "outline" : "default"}
                        className={cn("text-xs", !minMet && "bg-primary text-primary-foreground")}
                      >
                        {minMet ? "Pronto" : "Obrigatório"}
                      </Badge>
                    )}
                    {isMultiple && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs transition-colors",
                          minMet && distinct > 0 ? "border-accent text-accent" : "text-muted-foreground"
                        )}
                      >
                        {distinct} de {groupMax}
                      </Badge>
                    )}
                  </div>
                </div>

                {isMultiple && (
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        minMet && distinct > 0 ? "bg-accent" : "bg-primary"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {groupLimitHit && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Você já escolheu o máximo de {groupMax} opções diferentes neste grupo.
                  </div>
                )}

                <div className="space-y-2">
                  {option.choices.map((choice) => {
                    const qty = picked[choice.name] || 0;
                    const selected = qty > 0;
                    const canRepeat = isMultiple && choice.allow_multiple;
                    const maxForChoice = choiceMax(option, choice.name);
                    const minForChoice = choiceMin(option, choice.name);
                    const plusDisabled =
                      qty >= maxForChoice || (qty === 0 && distinct >= groupMax);
                    const choiceLimitHit = limitHit === `${option.name}:${choice.name}`;

                    return (
                      <div
                        key={choice.name}
                        onClick={() => {
                          if (canRepeat) return;
                          if (isMultiple) changeQty(option, choice.name, selected ? -qty : 1);
                          else selectSingle(option, choice.name);
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200",
                          canRepeat ? "cursor-default" : "cursor-pointer active:scale-[0.99]",
                          selected
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border hover:border-primary/50",
                          choiceLimitHit && "border-destructive"
                        )}
                      >
                        {choice.image_url && (
                          <img
                            src={choice.image_url}
                            alt={choice.name}
                            loading="lazy"
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground text-sm block truncate">
                            {choice.name}
                          </span>
                          {canRepeat && (
                            <span className="text-[11px] text-muted-foreground">
                              {minForChoice > 1
                                ? `De ${minForChoice}x até ${maxForChoice}x`
                                : `Pode repetir até ${maxForChoice}x`}
                            </span>
                          )}
                        </div>
                        {choice.price_modifier > 0 && (
                          <span className="text-sm text-primary font-medium shrink-0">
                            +R$ {choice.price_modifier.toFixed(2).replace(".", ",")}
                          </span>
                        )}

                        {canRepeat ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label={`Remover ${choice.name}`}
                              onClick={(e) => { e.stopPropagation(); changeQty(option, choice.name, -1); }}
                              disabled={qty === 0}
                              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className={cn(
                              "w-6 text-center text-sm font-bold tabular-nums",
                              selected ? "text-primary" : "text-muted-foreground"
                            )}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Adicionar ${choice.name}`}
                              onClick={(e) => { e.stopPropagation(); changeQty(option, choice.name, 1); }}
                              disabled={plusDisabled}
                              className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          selected && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 animate-in zoom-in-50 duration-200">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <div className="space-y-2 pb-2">
            <Label className="text-sm font-medium">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma observação sobre este item?"
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Footer */}
        <div className="p-4 space-y-3 bg-card safe-area-bottom border-t border-border/30 shrink-0">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(minQuantity, quantity - minQuantity))}
              className="w-10 h-10 flex items-center justify-center bg-secondary/80 rounded-xl border border-border/50 hover:bg-secondary active:scale-95 transition-all"
              disabled={quantity <= minQuantity}
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="number"
              min={minQuantity}
              step={minQuantity}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return;
                const next = parseInt(raw, 10);
                if (Number.isNaN(next)) return;
                setQuantity(Math.max(minQuantity, next));
              }}
              onBlur={() => {
                const rounded = Math.max(minQuantity, Math.round(quantity / minQuantity) * minQuantity);
                setQuantity(rounded);
              }}
              className="w-16 text-center font-bold text-lg bg-background/80 rounded-xl border-2 border-primary/20 py-1.5 px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Quantidade"
            />

            <button
              onClick={() => setQuantity(quantity + minQuantity)}
              className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/30 hover:bg-primary/20 active:scale-95 transition-all text-primary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={handleAddToCart}
            size="lg"
            className={cn(
              "w-full h-12 text-base font-bold gap-2 rounded-xl active:scale-[0.98] transition-all",
              isValid
                ? "gradient-primary shadow-glow hover:shadow-strong"
                : "bg-secondary text-foreground hover:bg-secondary"
            )}
          >
            {isValid ? <ShoppingBag className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
            <span className="truncate">
              {isValid ? "Adicionar" : `Escolha: ${nextPending?.name}`}
            </span>
            {isValid && (
              <span key={totalPrice} className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-sm animate-in zoom-in-95 duration-200">
                R$ {totalPrice.toFixed(2).replace(".", ",")}
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
