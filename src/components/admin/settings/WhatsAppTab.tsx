import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, MessageCircleQuestion } from "lucide-react";
import { WhatsAppTemplateEditor } from "@/components/admin/WhatsAppTemplateEditor";
import type { SettingsFormData } from "./types";

interface WhatsAppTabProps {
  formData: SettingsFormData;
  setFormData: React.Dispatch<React.SetStateAction<SettingsFormData>>;
}

const ORDER_TEMPLATES = [
  {
    id: "curto",
    name: "Curto (rápido)",
    template: "*Novo Pedido*\n\nCliente: {cliente_nome}\nEndereço: {endereco} {complemento}\n\nItens:\n{produtos}\n\nTotal: {total}",
  },
  {
    id: "detalhado",
    name: "Detalhado (profissional)",
    template: "*Novo Pedido* — *{loja_nome}*\n\n*Cliente:* {cliente_nome}\n*WhatsApp:* {cliente_whatsapp}\n*Entrega:* {endereco} {complemento}\n{link_maps}\n\n*Itens:*\n{produtos}\n\n*Subtotal:* {subtotal}\n*Entrega:* {taxa_entrega}\n*Total:* {total}\n\nSe precisar alterar algo, me avise por aqui.",
  },
  {
    id: "pagamento",
    name: "Com pagamento",
    template: "*Novo Pedido* — *{loja_nome}*\n\n{cliente_nome}\n{endereco} {complemento}\n{link_maps}\n\n*Itens:*\n{produtos}\n\n*Total:* {total}\n\n*Link de pagamento:* {link_pagamento}\n(Se o link estiver vazio, me avise que eu envio outra forma.)",
  },
] as const;

const HELP_TEMPLATES = [
  { id: "padrao", name: "Dúvida (simples)", template: "Olá! Tenho uma dúvida. Pode me ajudar?" },
  { id: "cardapio", name: "Sobre o cardápio", template: "Olá! Vim pela vitrine da {loja_nome} ({loja_link}). Tenho uma dúvida sobre o cardápio." },
  { id: "prazo", name: "Entrega/prazo", template: "Olá! Vim pela vitrine da {loja_nome}. Qual o prazo de entrega hoje?" },
] as const;

export function WhatsAppTab({ formData, setFormData }: WhatsAppTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
        <span className="text-2xl shrink-0">✅</span>
        <div>
          <p className="text-sm font-semibold text-foreground">Tudo já está configurado!</p>
          <p className="text-xs text-muted-foreground mt-1">
            As mensagens de pedido e dúvidas já funcionam automaticamente. Você <strong>não precisa editar nada</strong> — mas se quiser personalizar, é só alterar abaixo.
          </p>
        </div>
      </div>

      <Tabs defaultValue="order" className="space-y-4">
        <TabsList className="w-full h-auto p-1 flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="order" className="flex-1 min-w-fit gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden xs:inline">Pedido</span>
          </TabsTrigger>
          <TabsTrigger value="help" className="flex-1 min-w-fit gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm">
            <MessageCircleQuestion className="w-4 h-4" />
            <span className="hidden xs:inline">Dúvidas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order">
          <WhatsAppTemplateEditor
            title="Mensagem de Pedido"
            description="O cliente envia essa mensagem para o WhatsApp da loja ao finalizar o pedido."
            fieldId="whatsapp_message"
            value={formData.whatsapp_message}
            onChange={(next) => setFormData((prev) => ({ ...prev, whatsapp_message: next }))}
            placeholder="Ex: Olá! Gostaria de fazer um pedido."
            templates={[...ORDER_TEMPLATES]}
            variables={[
              { key: "loja_nome", label: "Nome da loja", description: "Nome da loja" },
              { key: "cliente_nome", label: "Cliente", description: "Nome do cliente" },
              { key: "cliente_whatsapp", label: "WhatsApp", description: "WhatsApp do cliente" },
              { key: "endereco", label: "Endereço", description: "Endereço" },
              { key: "complemento", label: "Complemento", description: "Complemento" },
              { key: "produtos", label: "Produtos", description: "Lista de produtos" },
              { key: "subtotal", label: "Subtotal", description: "Subtotal" },
              { key: "taxa_entrega", label: "Entrega", description: "Taxa de entrega" },
              { key: "total", label: "Total", description: "Total" },
              { key: "forma_pagamento", label: "Pagamento", description: "Forma de pagamento escolhida" },
              { key: "tipo_entrega", label: "Tipo entrega", description: "Entrega ou Retirada" },
              { key: "observacoes", label: "Obs", description: "Observações do cliente" },
              { key: "link_pagamento", label: "Link", description: "Link de pagamento" },
              { key: "troco_para", label: "Troco para", description: "Valor que o cliente vai pagar (somente Dinheiro)" },
              { key: "troco_levar", label: "Levar troco", description: "Quanto levar de troco (somente Dinheiro)" },
              { key: "link_maps", label: "Maps", description: "Link do Google Maps do cliente" },
            ]}
            quickInsertKeys={["produtos", "total", "cliente_nome", "endereco", "forma_pagamento", "tipo_entrega", "link_pagamento", "link_maps", "troco_para", "troco_levar"]}
            previewFallbackTemplate={[
              "Novo Pedido", "", "{loja_nome}", "", "Cliente: {cliente_nome}", "Telefone: {cliente_whatsapp}",
              "Endereço: {endereco} ({complemento})", "", "Itens do Pedido:", "", "{produtos}", "",
              "Subtotal: {subtotal}", "Taxa de Entrega: {taxa_entrega}", "Total: {total}", "",
              "Forma de Pagamento: Dinheiro (Troco para R$ 50)", "Observações: (exemplo)",
              "Link de Pagamento: {link_pagamento}", "",
              "Por favor, efetue o pagamento e nos envie o comprovante.",
            ].join("\n")}
            previewVars={{
              loja_nome: formData.name || "Minha Loja",
              cliente_nome: "c44c44c",
              cliente_whatsapp: "555555555",
              endereco: "Rua Exemplo, 123",
              complemento: "Apto 45",
              produtos: "* 1x Pizza - R$ 39,90\n* 2x Refrigerante - R$ 14,00",
              subtotal: "R$ 53,90",
              taxa_entrega: "R$ 5,00",
              total: "R$ 58,90",
              link_pagamento: formData.checkout_link || "",
              troco_para: "R$ 100,00",
              troco_levar: "R$ 42,10",
            }}
            maxLen={3500}
          />
        </TabsContent>

        <TabsContent value="help">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <label htmlFor="help_button_enabled" className="text-sm font-medium">Ativar botão de dúvidas</label>
                <p className="text-xs text-muted-foreground">Mostra botão "Dúvidas?" flutuante na vitrine</p>
              </div>
              <Switch
                id="help_button_enabled"
                checked={formData.help_button_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, help_button_enabled: checked })}
              />
            </div>

            {formData.help_button_enabled && (
              <WhatsAppTemplateEditor
                title="Botão de Dúvidas"
                description={'Mensagem pré-preenchida quando o cliente clica em "Dúvidas?"'}
                fieldId="help_button_message"
                value={formData.help_button_message}
                onChange={(next) => setFormData((prev) => ({ ...prev, help_button_message: next }))}
                placeholder="Ex: Olá! Tenho uma dúvida."
                templates={[...HELP_TEMPLATES]}
                variables={[
                  { key: "loja_nome", label: "Nome da loja", description: "Nome da loja" },
                  { key: "loja_link", label: "Link", description: "Link da vitrine" },
                ]}
                quickInsertKeys={["loja_nome", "loja_link"]}
                previewFallbackTemplate="Olá! Tenho uma dúvida sobre a {loja_nome}."
                previewVars={{
                  loja_nome: formData.name || "Minha Loja",
                  loja_link: `${window.location.origin}/loja/${formData.slug || "minha-loja"}`,
                }}
                maxLen={1000}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
