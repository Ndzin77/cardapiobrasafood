import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Settings2, ImageIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ImageUpload } from "./ImageUpload";

export interface ProductOptionChoice {
  name: string;
  price_modifier: number;
  image_url?: string;
  enabled?: boolean;
}

export interface ProductOption {
  name: string;
  required: boolean;
  enabled?: boolean;
  max_select: number;
  min_select: number;
  choices: ProductOptionChoice[];
}

interface ProductOptionsEditorProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
  hasOptions: boolean;
  onHasOptionsChange: (hasOptions: boolean) => void;
}

export function ProductOptionsEditor({
  options,
  onChange,
  hasOptions,
  onHasOptionsChange,
}: ProductOptionsEditorProps) {
  const [expandedOption, setExpandedOption] = useState<number | null>(0);
  const [showImageUpload, setShowImageUpload] = useState<Record<string, boolean>>({});

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
                        <Label>Mínimo de Seleções</Label>
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
                        <Label>Máximo de Seleções</Label>
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

          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Grupo de Opções
          </Button>
        </div>
      )}
    </div>
  );
}
