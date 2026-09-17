import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Sparkles, Loader2, Trash2, Check, Plus, Camera, Type, AlertTriangle, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIngredients, useCreateIngredient, type Ingredient } from "@/hooks/useIngredients";
import { useRegisterPurchase } from "@/hooks/useIngredientPurchases";
import { convert, isCompatible } from "@/lib/unitConversion";
import { findDuplicateGroups, type DuplicateGroup } from "@/lib/duplicateDetection";
import { MergeDuplicatesModal } from "./MergeDuplicatesModal";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  total_paid: number;
  match_ingredient_id: string | "__new__";
}

interface Props {
  storeId: string;
}

const UNIT_OPTIONS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "mg", label: "mg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
  { value: "un", label: "un" },
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

function fuzzyMatch(name: string, ingredients: Ingredient[]): string | "__new__" {
  const n = name.toLowerCase().trim();
  const exact = ingredients.find((i) => i.name.toLowerCase().trim() === n);
  if (exact) return exact.id;
  if (n.length >= 3) {
    const contains = ingredients.find(
      (i) => i.name.toLowerCase().includes(n) || n.includes(i.name.toLowerCase())
    );
    if (contains) return contains.id;
  }
  return "__new__";
}

// Compresses image client-side to reduce upload size & AI cost
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const maxSide = Math.max(width, height);
      if (maxSide > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / maxSide;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context não disponível"));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem"));
    };
    img.src = url;
  });
}

export function ShoppingListChat({ storeId }: Props) {
  const { data: ingredients = [] } = useIngredients(storeId);
  const createIngredient = useCreateIngredient();
  const registerPurchase = useRegisterPurchase();

  const [mode, setMode] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup<ParsedItem>[]>([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande. Máx 8MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    // Reset input so the same file can be picked again later
    e.target.value = "";
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleProcess = async () => {
    setLoading(true);
    try {
      let invokeBody: any;

      if (mode === "text") {
        if (!text.trim() || text.trim().length < 3) {
          toast.error("Digite a lista de compras");
          return;
        }
        invokeBody = {
          text: text.trim(),
          existing_ingredients: ingredients.map((i) => ({ name: i.name, unit: i.unit })),
        };
      } else {
        if (!photoFile) {
          toast.error("Selecione uma foto da nota fiscal");
          return;
        }
        let compressed: { base64: string; mimeType: string };
        try {
          compressed = await compressImage(photoFile);
        } catch (err: any) {
          toast.error("Não foi possível processar a imagem. Tente outra foto.");
          console.error(err);
          return;
        }
        invokeBody = {
          image_base64: compressed.base64,
          mime_type: compressed.mimeType,
          existing_ingredients: ingredients.map((i) => ({ name: i.name, unit: i.unit })),
        };
      }

      const { data, error } = await supabase.functions.invoke("parse-shopping-list", {
        body: invokeBody,
      });

      if (error) {
        let friendly = "Erro ao processar com IA";
        let status: number | undefined;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) friendly = body.error;
            status = ctx.status;
          } else if (ctx?.status) {
            status = ctx.status;
          }
        } catch {
          // body não é JSON, mantém mensagem padrão
        }

        if (status === 429) {
          toast.error("Muitas requisições. Aguarde alguns segundos.");
        } else if (status === 402) {
          toast.error("Créditos de IA esgotados.");
        } else if ((status === 422 || status === 400) && mode === "photo") {
          toast.error(friendly, {
            description: "Tente uma foto mais nítida ou use o modo Digitar lista.",
          });
        } else {
          toast.error(friendly);
        }
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      if (rawItems.length === 0) {
        toast.error("IA não encontrou itens válidos");
        return;
      }

      const parsed: ParsedItem[] = rawItems.map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        total_paid: it.total_paid,
        match_ingredient_id: fuzzyMatch(it.name, ingredients),
      }));
      setItems(parsed);

      if (data?.discarded > 0) {
        toast.warning(`${data.discarded} item(ns) descartado(s) por dados inválidos`);
      } else {
        toast.success(`${parsed.length} item(ns) detectado(s) — revise antes de confirmar`);
      }

      // Detect duplicates and open merge modal if any
      try {
        const groups = findDuplicateGroups(parsed);
        if (groups.length > 0) {
          setDuplicateGroups(groups);
          setMergeModalOpen(true);
        } else {
          setDuplicateGroups([]);
        }
      } catch (err) {
        console.error("Erro na detecção de duplicatas", err);
        // Não bloqueia o fluxo: segue pra revisão manual
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const doConfirm = async () => {
    setConfirmDialogOpen(false);
    if (items.length === 0) return;
    setConfirming(true);
    let okCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        if (item.quantity <= 0 || item.total_paid <= 0 || !item.name.trim()) {
          failCount++;
          continue;
        }

        let ingredientId = item.match_ingredient_id;
        let targetUnit = item.unit;

        if (ingredientId === "__new__") {
          await createIngredient.mutateAsync({
            store_id: storeId,
            name: item.name.trim(),
            unit: item.unit,
            cost_per_unit: 0,
            stock_quantity: 0,
            min_stock_alert: 0,
          });

          const { data: newIng } = await supabase
            .from("ingredients")
            .select("id, unit")
            .eq("store_id", storeId)
            .eq("name", item.name.trim())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!newIng) {
            failCount++;
            continue;
          }
          ingredientId = newIng.id;
          targetUnit = newIng.unit;
        } else {
          const existing = ingredients.find((i) => i.id === ingredientId);
          if (existing) targetUnit = existing.unit;
        }

        let qtyConverted = item.quantity;
        if (item.unit !== targetUnit) {
          if (!isCompatible(item.unit, targetUnit)) {
            toast.error(`"${item.name}": unidade "${item.unit}" incompatível com "${targetUnit}"`);
            failCount++;
            continue;
          }
          qtyConverted = convert(item.quantity, item.unit, targetUnit);
          if (!isFinite(qtyConverted) || qtyConverted <= 0) {
            failCount++;
            continue;
          }
        }

        await registerPurchase.mutateAsync({
          ingredient_id: ingredientId,
          store_id: storeId,
          quantity: qtyConverted,
          total_paid: item.total_paid,
          notes: `Importado via IA: ${item.quantity} ${item.unit} por R$ ${item.total_paid.toFixed(2)}`,
        });
        okCount++;
      } catch (e) {
        console.error("Erro ao processar item", item, e);
        failCount++;
      }
    }

    setConfirming(false);
    if (okCount > 0) {
      toast.success(`${okCount} compra(s) registrada(s) com sucesso!`);
      setItems([]);
      setText("");
      clearPhoto();
    }
    if (failCount > 0) {
      toast.error(`${failCount} item(ns) falharam`);
    }
  };

  const canProcess =
    !loading && !confirming && (mode === "text" ? text.trim().length > 0 : !!photoFile);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Importar lista de compras com IA</h3>
            <p className="text-xs text-muted-foreground">
              Digite a lista, cole sua nota fiscal — ou tire uma foto que a IA lê para você.
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg">
          <Button
            type="button"
            variant={mode === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("text")}
            disabled={loading || confirming}
            className="h-9"
          >
            <Type className="w-4 h-4 mr-1.5" />
            Digitar lista
          </Button>
          <Button
            type="button"
            variant={mode === "photo" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("photo")}
            disabled={loading || confirming}
            className="h-9"
          >
            <Camera className="w-4 h-4 mr-1.5" />
            Foto da nota
          </Button>
        </div>

        {mode === "text" ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Exemplos:\nfarinha 5kg 25 reais, ovo 30un 18\naçúcar 2 quilos por 12,50\nleite 1L 6,00`}
            rows={5}
            disabled={loading || confirming}
            className="resize-none text-sm"
          />
        ) : (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePickPhoto}
              disabled={loading || confirming}
              className="hidden"
            />
            {!photoPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || confirming}
                className="w-full min-h-[160px] border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Tirar foto ou enviar imagem</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP ou HEIC — máx 8MB</p>
              </button>
            ) : (
              <div className="relative rounded-lg overflow-hidden border bg-muted/20">
                <img
                  src={photoPreview}
                  alt="Pré-visualização da nota"
                  className="w-full max-h-[280px] object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={clearPhoto}
                  disabled={loading || confirming}
                  className="absolute top-2 right-2 h-8 w-8 shadow-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-2 left-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || confirming}
                    className="h-8 shadow-lg"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Trocar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Button onClick={handleProcess} disabled={!canProcess} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {mode === "photo" ? "Lendo a nota..." : "Processando com IA..."}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Processar com IA
            </>
          )}
        </Button>
      </Card>

      {items.length > 0 && (
        <>
          <Alert className="border-warning/40 bg-warning/5 text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">
              Revise os dados antes de confirmar
            </AlertTitle>
            <AlertDescription className="text-xs">
              A IA pode errar nomes, quantidades ou valores. Confira cada linha. Após confirmar, os
              lotes serão criados e o estoque atualizado.
            </AlertDescription>
          </Alert>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Itens detectados ({items.length})</h3>
              <Badge variant="secondary">Nada foi salvo ainda</Badge>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {items.map((it, idx) => {
                const matched = ingredients.find((ing) => ing.id === it.match_ingredient_id);
                const targetUnit = matched?.unit ?? it.unit;
                const incompat = matched && it.unit !== targetUnit && !isCompatible(it.unit, targetUnit);
                return (
                  <div key={idx} className="p-2.5 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={it.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        className="h-8 text-sm flex-1"
                        placeholder="Nome"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="h-8 w-8 text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <Input
                        type="number"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm col-span-3"
                        placeholder="Qtd"
                      />
                      <Select value={it.unit} onValueChange={(v) => updateItem(idx, { unit: v })}>
                        <SelectTrigger className="h-8 text-xs col-span-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u.value} value={u.value} className="text-xs">
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="col-span-7 flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="any"
                          value={it.total_paid}
                          onChange={(e) => updateItem(idx, { total_paid: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-sm flex-1"
                          placeholder="Valor"
                        />
                      </div>
                    </div>

                    <Select
                      value={it.match_ingredient_id}
                      onValueChange={(v) => updateItem(idx, { match_ingredient_id: v as any })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__">
                          <span className="flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Criar novo insumo "{it.name}"
                          </span>
                        </SelectItem>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {incompat && (
                      <p className="text-[11px] text-destructive">
                        Unidade "{it.unit}" incompatível com "{targetUnit}" do insumo selecionado
                      </p>
                    )}
                    {it.quantity > 0 && it.total_paid > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Custo: R$ {(it.total_paid / it.quantity).toFixed(4)}/{it.unit}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setItems([])}
                disabled={confirming}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirmDialogOpen(true)}
                disabled={confirming || items.length === 0}
                className="flex-1"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar {items.length} compra(s)
                  </>
                )}
              </Button>
            </div>
          </Card>
        </>
      )}

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar registro de compras?</AlertDialogTitle>
            <AlertDialogDescription>
              Vão ser criados <strong>{items.length} lote(s)</strong> e o estoque dos insumos será
              atualizado automaticamente. Essa ação não pode ser desfeita facilmente — confira se
              tudo está certo antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction onClick={doConfirm}>Sim, confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MergeDuplicatesModal
        open={mergeModalOpen}
        onOpenChange={setMergeModalOpen}
        groups={duplicateGroups}
        allItems={items}
        onApply={(merged) => {
          // Re-run fuzzy match on any merged items whose names changed
          const remapped = merged.map((it) =>
            it.match_ingredient_id === "__new__"
              ? { ...it, match_ingredient_id: fuzzyMatch(it.name, ingredients) }
              : it,
          );
          setItems(remapped);
          setMergeModalOpen(false);
          setDuplicateGroups([]);
          toast.success("Itens mesclados — revise antes de confirmar");
        }}
        onSkip={() => {
          setMergeModalOpen(false);
          setDuplicateGroups([]);
        }}
      />
    </div>
  );
}
