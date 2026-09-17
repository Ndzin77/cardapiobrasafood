import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Settings2, ImageIcon, Copy, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "./ImageUpload";

export interface ProductOptionChoice {
  name: string;
  price_modifier: number;
  image_url?: string;
  enabled?: boolean;
  /** Customer can pick this choice more than once (e.g. 2x Nutella) */
  allow_multiple?: boolean;
  /** Max repetitions when allow_multiple is on */
  max_qty?: number;
  /** Min repetitions when allow_multiple is on and the choice is picked */
  min_qty?: number;
}

export interface ProductOption {
  name: string;
  required: boolean;
  enabled?: boolean;
  max_select: number;
  min_select: number;
  choices: ProductOptionChoice[];
}

export interface ExistingGroup {
  productName: string;
  option: ProductOption;
}

interface ProductOptionsEditorProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
  hasOptions: boolean;
  onHasOptionsChange: (hasOptions: boolean) => void;
  /** Option groups already configured in other products, for one-tap reuse */
  existingGroups?: ExistingGroup[];
}

export function ProductOptionsEditor({
  options,
  onChange,
  hasOptions,
  onHasOptionsChange,
  existingGroups = [],
}: ProductOptionsEditorProps) {
  const [expandedOption, setExpandedOption] = useState<number | null>(0);
  const [showImageUpload, setShowImageUpload] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);

  // De-duplicate library groups by name + choice signature
  const groupLibrary = useMemo(() => {
    const seen = new Set<string>();
    return existingGroups.filter(({ option }) => {
      if (!option?.name) return false;
      const key = `${option.name}::${(option.choices || []).map((c) => c.name).join("|")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [existingGroups]);

  const importGroup = (group: ProductOption) => {
    const baseName = group.name;
    let name = baseName;
    let i = 2;
    while (options.some((o) => o.name === name)) {
      name = `${baseName} (${i++})`;
    }
    onChange([...options, { ...group, name, choices: group.choices.map((c) => ({ ...c })) }]);
    setExpandedOption(options.length);
    setImportOpen(false);
  };


  const addOption = () => {
    onChange([
      ...options,
      {
        name: "",
        required: false,
        enabled: true,
        max_select: 1,
        min_select: 0,
        choices: [{ name: "", price_modifier: 0, enabled: true }],
      },
    ]);
    setExpandedOption(options.length);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: keyof ProductOption, value: any) => {
    onChange(
      options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  const addChoice = (optionIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].choices.push({ name: "", price_modifier: 0, enabled: true });
    onChange(newOptions);
  };

  const removeChoice = (optionIndex: number, choiceIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].choices = newOptions[optionIndex].choices.filter(
      (_, i) => i !== choiceIndex
    );
    onChange(newOptions);
  };

  const updateChoice = (
    optionIndex: number,
    choiceIndex: number,
    field: keyof ProductOptionChoice,
    value: any
  ) => {
    const newOptions = [...options];
    newOptions[optionIndex].choices[choiceIndex] = {
      ...newOptions[optionIndex].choices[choiceIndex],
      [field]: value,
    };
    onChange(newOptions);
  };

  const toggleImageUpload = (key: string) => {
    setShowImageUpload(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label htmlFor="has-options" className="text-base font-medium">
              Produto Personalizável
            </Label>
            <p className="text-sm text-muted-foreground">
              Ative para adicionar opções como sabores, tamanhos, adicionais
            </p>
          </div>
        </div>
        <Switch
          id="has-options"
          checked={hasOptions}
          onCheckedChange={onHasOptionsChange}
        />
      </div>

      {hasOptions && (
        <div className="space-y-3">
          {options.map((option, optionIndex) => (
            <Collapsible
              key={optionIndex}
              open={expandedOption === optionIndex}
              onOpenChange={() =>
                setExpandedOption(expandedOption === optionIndex ? null : optionIndex)
              }
            >
              <Card className={`border-dashed ${option.enabled === false ? "opacity-60" : ""}`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {option.name || "Nova Opção"}
                        </CardTitle>
                        {option.enabled === false && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Desativado
                          </Badge>
                        )}
                        {option.required && option.enabled !== false && (
                          <Badge variant="secondary" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {option.choices.length} escolha(s)
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOption(optionIndex);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Group Settings */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome do Grupo</Label>
                        <Input
                          value={option.name}
                          onChange={(e) =>
                            updateOption(optionIndex, "name", e.target.value)
                          }
                          placeholder="Ex: Sabor, Tamanho, Adicionais..."
                        />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`enabled-${optionIndex}`}
                            checked={option.enabled !== false}
                            onCheckedChange={(checked) =>
                              updateOption(optionIndex, "enabled", checked)
                            }
                          />
                          <Label htmlFor={`enabled-${optionIndex}`}>Ativo</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`required-${optionIndex}`}
                            checked={option.required}
                            onCheckedChange={(checked) => {
                              updateOption(optionIndex, "required", checked);
                              // Auto-set min_select to 1 when marking as required
                              if (checked && option.min_select < 1) {
                                updateOption(optionIndex, "min_select", 1);
                              }
                            }}
                          />
                          <Label htmlFor={`required-${optionIndex}`}>Obrigatório</Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mínimo de escolhas diferentes</Label>
                        <Input
                          type="number"
                          min="0"
                          value={option.min_select}
                          onChange={(e) =>
                            updateOption(optionIndex, "min_select", parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Máximo de escolhas diferentes</Label>
                        <Input
                          type="number"
                          min="1"
                          value={option.max_select}
                          onChange={(e) =>
                            updateOption(optionIndex, "max_select", parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Estes limites contam quantas escolhas diferentes o cliente marca. As repetições
                      (2x, 3x...) têm mínimo e máximo próprios em cada escolha.
                    </p>

                    {option.min_select > option.max_select && (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        O mínimo não pode ser maior que o máximo — o cliente nunca conseguirá concluir.
                      </div>
                    )}


                    {/* Choices */}
                    <div className="space-y-2">
                      <Label>Escolhas Disponíveis</Label>
                      <div className="space-y-2">
                        {option.choices.map((choice, choiceIndex) => {
                          const imageKey = `${optionIndex}-${choiceIndex}`;
                          return (
                            <div
                              key={choiceIndex}
                              className={`p-3 rounded-lg bg-muted/50 space-y-2 ${choice.enabled === false ? "opacity-60" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                {/* Enable/Disable Choice */}
                                <Switch
                                  checked={choice.enabled !== false}
                                  onCheckedChange={(checked) =>
                                    updateChoice(optionIndex, choiceIndex, "enabled", checked)
                                  }
                                  className="shrink-0"
                                />
                                
                                {/* Choice Image Preview */}
                                {choice.image_url && (
                                  <img
                                    src={choice.image_url}
                                    alt={choice.name}
                                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                                  />
                                )}
                                
                                <Input
                                  value={choice.name}
                                  onChange={(e) =>
                                    updateChoice(optionIndex, choiceIndex, "name", e.target.value)
                                  }
                                  placeholder="Nome da escolha"
                                  className="flex-1"
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-muted-foreground">+ R$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={choice.price_modifier}
                                    onChange={(e) =>
                                      updateChoice(
                                        optionIndex,
                                        choiceIndex,
                                        "price_modifier",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-20"
                                  />
                                </div>
                                
                                {/* Toggle Image Button */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleImageUpload(imageKey)}
                                >
                                  <ImageIcon className={`w-4 h-4 ${choice.image_url ? "text-primary" : ""}`} />
                                </Button>
                                
                                {option.choices.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => removeChoice(optionIndex, choiceIndex)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Repeat settings */}
                              <div className="flex flex-wrap items-center gap-4 pl-1">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`repeat-${imageKey}`}
                                    checked={choice.allow_multiple === true}
                                    onCheckedChange={(checked) => {
                                      updateChoice(optionIndex, choiceIndex, "allow_multiple", checked);
                                      if (checked && !choice.max_qty) {
                                        updateChoice(optionIndex, choiceIndex, "max_qty", Math.max(option.max_select, 2));
                                      }
                                    }}
                                    className="shrink-0"
                                  />
                                  <Label htmlFor={`repeat-${imageKey}`} className="text-xs text-muted-foreground">
                                    Cliente pode repetir (2x, 3x...)
                                  </Label>
                                </div>
                                {choice.allow_multiple && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-muted-foreground">Mín. por escolha</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={choice.min_qty ?? ""}
                                        placeholder="1"
                                        onChange={(e) =>
                                          updateChoice(
                                            optionIndex,
                                            choiceIndex,
                                            "min_qty",
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                        className="w-20 h-8"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-muted-foreground">Máx. por escolha</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={choice.max_qty ?? ""}
                                        onChange={(e) =>
                                          updateChoice(
                                            optionIndex,
                                            choiceIndex,
                                            "max_qty",
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                        className="w-20 h-8"
                                      />
                                    </div>
                                    {(choice.min_qty ?? 1) > (choice.max_qty ?? 1) && (
                                      <span className="flex items-center gap-1 text-xs text-destructive">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Mín. maior que o máx. desta escolha.
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>


                              
                              {/* Image Upload (Collapsible) */}
                              {showImageUpload[imageKey] && (
                                <div className="pt-2 animate-slide-up">
                                  <ImageUpload
                                    value={choice.image_url || ""}
                                    onChange={(url) =>
                                      updateChoice(optionIndex, choiceIndex, "image_url", url)
                                    }
                                    label="Imagem da Escolha"
                                    folder="choices"
                                    aspectRatio="square"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addChoice(optionIndex)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Escolha
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={addOption}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Grupo de Opções
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImportOpen(true)}
              disabled={groupLibrary.length === 0}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              {groupLibrary.length > 0
                ? `Importar grupo existente (${groupLibrary.length})`
                : "Nenhum grupo para importar"}
            </Button>
          </div>

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Importar grupo de adicionais</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Copie um grupo já usado em outro produto. Depois da cópia, você pode editar à vontade
                sem alterar o produto original.
              </p>
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {groupLibrary.map(({ productName, option }, i) => (
                  <button
                    key={`${option.name}-${i}`}
                    type="button"
                    onClick={() => importGroup(option)}
                    className="w-full text-left p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{option.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {option.choices?.length || 0} escolha(s)
                      </Badge>
                      {option.required && (
                        <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Usado em: {productName} — {(option.choices || []).map((c) => c.name).join(", ")}
                    </p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

      )}
    </div>
  );
}
