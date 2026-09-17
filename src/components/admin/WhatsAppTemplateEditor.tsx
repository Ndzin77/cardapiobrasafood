import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyWhatsAppTemplate, clampText } from "@/lib/whatsappTemplates";

type TemplateItem = {
  id: string;
  name: string;
  template: string;
};

type VariableItem = {
  key: string;
  label: string;
  description: string;
};

interface WhatsAppTemplateEditorProps {
  title: string;
  description?: string;
  fieldId: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  templates: TemplateItem[];
  variables: VariableItem[];
  quickInsertKeys?: string[];
  previewFallbackTemplate: string;
  previewVars: Record<string, string>;
  maxLen: number;
}

export function WhatsAppTemplateEditor({
  title,
  description,
  fieldId,
  value,
  onChange,
  placeholder,
  templates,
  variables,
  quickInsertKeys = [],
  previewFallbackTemplate,
  previewVars,
  maxLen,
}: WhatsAppTemplateEditorProps) {
  const insertAtEnd = (snippet: string) => {
    onChange((value ? value + " " : "") + snippet);
  };

  const renderedPreview = clampText(
    applyWhatsAppTemplate(value || previewFallbackTemplate, previewVars),
    maxLen,
  );

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
        {/* Galeria */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Modelos prontos</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange("")}
            >
              Voltar ao modelo do site
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {templates.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => onChange(t.template)}
              >
                {t.name}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onChange("")}
            >
              Limpar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Se o campo estiver vazio, a vitrine usa o modelo padrão automaticamente.
          </p>
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <Label htmlFor={fieldId} className="text-sm">
            Mensagem
          </Label>
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="text-sm"
          />
        </div>

        {/* Botões de variável */}
        {quickInsertKeys.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Inserir variáveis</p>
            <div className="flex flex-wrap gap-2">
              {quickInsertKeys.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => insertAtEnd(`{${key}}`)}
                >
                  + {key.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Variáveis (detalhes) */}
        <details className="rounded-xl border border-border bg-secondary/40 p-3">
          <summary className="text-xs font-medium cursor-pointer select-none">
            Ver lista de variáveis
          </summary>
          <div className="mt-3 space-y-2">
            <ul className="text-xs text-muted-foreground space-y-1">
              {variables.map((v) => (
                <li key={v.key}>
                  <code className="bg-muted px-1 rounded text-xs">{`{${v.key}}`}</code> {v.description}
                </li>
              ))}
            </ul>
          </div>
        </details>

        {/* Preview */}
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-medium">Prévia (estilo WhatsApp)</p>
              <p className="text-[11px] text-muted-foreground">
                Dados de exemplo — o conteúdo real muda conforme o pedido.
              </p>
            </div>
          </div>

          {/* Phone-ish frame */}
          <div className="rounded-2xl border border-border bg-background overflow-hidden">
            {/* Top bar */}
            <div className="px-3 py-2 border-b border-border bg-secondary/30">
              <p className="text-xs font-medium leading-none">WhatsApp</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">Prévia da mensagem</p>
            </div>

            {/* Chat area */}
            <div className="p-3 bg-secondary/20">
              <div className="flex justify-end">
                <div
                  className="max-w-[90%] rounded-2xl rounded-tr-sm border border-border bg-background px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed shadow-sm"
                  aria-label="Prévia da mensagem no WhatsApp"
                >
                  {renderedPreview}
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <span className="text-[11px] text-muted-foreground">agora</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
