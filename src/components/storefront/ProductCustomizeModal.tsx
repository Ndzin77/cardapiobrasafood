import { useState, useMemo } from "react";
import { Product, ProductOption } from "@/types/store";
import { useCart } from "@/hooks/useCart";
import { sanitizeProductOptions } from "@/lib/sanitizeProductOptions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";

interface ProductCustomizeModalProps {
  product: Product | null;
  options: ProductOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minQuantity?: number;
}

export function ProductCustomizeModal({
  product,
  options,
  open,
  onOpenChange,
  minQuantity = 1,
}: ProductCustomizeModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(minQuantity);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");

  // Filter only enabled options and choices
  const activeOptions = useMemo(() => {
    return sanitizeProductOptions(options);
  }, [options]);

  // Calculate additional price from selections
  const additionalPrice = useMemo(() => {
    let total = 0;
    activeOptions.forEach((opt) => {
      const selected = selections[opt.name] || [];
      selected.forEach((choiceName) => {
        const choice = opt.choices.find((c) => c.name === choiceName);
        if (choice) {
          total += choice.price_modifier;
        }
      });
    });
    return total;
  }, [selections, activeOptions]);

  const unitPrice = (product?.price || 0) + additionalPrice;
  const totalPrice = unitPrice * quantity;

  // Check if all required options or options with min_select > 0 are satisfied
  const isValid = useMemo(() => {
    return activeOptions.every((opt) => {
      const selected = selections[opt.name] || [];
      // If option is required OR has min_select > 0, enforce minimum selection
      const effectiveMin = opt.required ? Math.max(opt.min_select, 1) : opt.min_select;
      if (effectiveMin > 0) {
        return selected.length >= effectiveMin;
      }
      return true;
    });
  }, [selections, activeOptions]);

  const handleSelectionChange = (optionName: string, choiceName: string, isMultiple: boolean) => {
    setSelections((prev) => {
      const current = prev[optionName] || [];
      const option = activeOptions.find((o) => o.name === optionName);
      
      if (isMultiple) {
        // Multiple selection (checkbox)
        if (current.includes(choiceName)) {
          return { ...prev, [optionName]: current.filter((c) => c !== choiceName) };
        } else {
          // Check max_select limit
          if (option && current.length >= option.max_select) {
            return prev;
          }
          return { ...prev, [optionName]: [...current, choiceName] };
        }
      } else {
        // Single selection (radio) - allow deselect if not required
        const isOptional = option && !option.required && option.min_select === 0;
        if (isOptional && current[0] === choiceName) {
          return { ...prev, [optionName]: [] };
        }
        return { ...prev, [optionName]: [choiceName] };
      }
    });
  };

  const handleAddToCart = () => {
    if (!product || !isValid) return;

    // Build structured selectedOptions
    const structuredOptions = activeOptions
      .map((opt) => {
        const selected = selections[opt.name] || [];
        if (selected.length === 0) return null;
        return {
          group: opt.name,
          choices: selected.map((choiceName) => {
            const choice = opt.choices.find((c) => c.name === choiceName);
            return { name: choiceName, price: choice?.price_modifier || 0 };
          }),
        };
      })
      .filter(Boolean) as { group: string; choices: { name: string; price: number }[] }[];

    // Format selections into notes (for display/WhatsApp)
    const selectionNotes = activeOptions
      .map((opt) => {
        const selected = selections[opt.name] || [];
        if (selected.length === 0) return null;
        return `${opt.name}: ${selected.join(", ")}`;
      })
      .filter(Boolean)
      .join(" | ");

    const fullNotes = [selectionNotes, notes].filter(Boolean).join(" - ");

    // Create product with modified price
    const customizedProduct = {
      ...product,
      price: unitPrice,
    };

    addItem(customizedProduct, quantity, fullNotes || undefined, structuredOptions.length > 0 ? structuredOptions : undefined);
    
    // Reset and close
    setQuantity(minQuantity);
    setSelections({});
    setNotes("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setQuantity(minQuantity);
    setSelections({});
    setNotes("");
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-0 flex flex-col overflow-hidden">
        {/* Product Header - Compact on mobile */}
        <div className="relative shrink-0">
          <div className="h-36 sm:h-52 w-full overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
            />
            {/* Premium gradient overlay with depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          </div>
          
          {/* Product info with glassmorphism effect */}
          <div className="absolute bottom-0 left-0 right-0 p-5 backdrop-blur-sm bg-background/30">
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl font-display font-bold text-foreground drop-shadow-sm">
                {product.name}
              </SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-xl font-bold text-primary animate-pulse-attention">
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

        {/* Options - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 overscroll-contain">
          {activeOptions.map((option) => {
            const isMultiple = option.max_select > 1;
            const selected = selections[option.name] || [];
            
            return (
              <div key={option.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{option.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {isMultiple
                        ? `Escolha até ${option.max_select} opções`
                        : "Escolha 1 opção"}
                      {option.min_select > 0 && ` (mín. ${option.min_select})`}
                    </p>
                  </div>
                  {option.required && (
                    <Badge variant="outline" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                </div>

                {isMultiple ? (
                  // Multiple selection - Checkbox style
                  <div className="space-y-2">
                    {option.choices.map((choice) => (
                      <label
                        key={choice.name}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selected.includes(choice.name)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {choice.image_url && (
                          <img
                            src={choice.image_url}
                            alt={choice.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <Checkbox
                          checked={selected.includes(choice.name)}
                          onCheckedChange={() =>
                            handleSelectionChange(option.name, choice.name, true)
                          }
                          disabled={
                            !selected.includes(choice.name) &&
                            selected.length >= option.max_select
                          }
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-foreground text-sm">
                            {choice.name}
                          </span>
                        </div>
                        {choice.price_modifier > 0 && (
                          <span className="text-sm text-primary font-medium">
                            +R$ {choice.price_modifier.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                        {selected.includes(choice.name) && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  // Single selection - clickable cards (allows deselect for optional)
                  <div className="space-y-2">
                    {option.choices.map((choice) => (
                      <label
                        key={choice.name}
                        onClick={() => handleSelectionChange(option.name, choice.name, false)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selected[0] === choice.name
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {choice.image_url && (
                          <img
                            src={choice.image_url}
                            alt={choice.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <span className="font-medium text-foreground text-sm">
                            {choice.name}
                          </span>
                        </div>
                        {choice.price_modifier > 0 && (
                          <span className="text-sm text-primary font-medium">
                            +R$ {choice.price_modifier.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                        {selected[0] === choice.name && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes */}
          <div className="space-y-2">
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

        {/* Footer - Fixed with premium styling */}
        <div className="p-4 space-y-3 bg-card safe-area-bottom border-t border-border/30 shrink-0">
          {/* Quantity Selector - Premium design */}
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

          {/* Add Button - Premium CTA with glow effect */}
          <Button
            onClick={handleAddToCart}
            disabled={!isValid}
            size="lg"
            className="w-full h-12 text-base font-bold gap-2 rounded-xl gradient-primary shadow-glow hover:shadow-strong active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Adicionar</span>
            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-sm">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
