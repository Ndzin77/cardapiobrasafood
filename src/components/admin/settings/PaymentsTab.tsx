import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Link, CreditCard, Globe, ShieldCheck, ExternalLink, CheckCircle2, Copy, Check, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { quickPaymentOptions, type SettingsFormData, type CustomPayment } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentsTabProps {
  formData: SettingsFormData;
  setFormData: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  storeId?: string;
}

const checkoutModes = [
  { id: "whatsapp", name: "Só WhatsApp", description: "Pedidos via mensagem", icon: "💬" },
  { id: "online", name: "Só Checkout Online", description: "Pagamento direto no site", icon: "💳" },
  { id: "both", name: "Ambos", description: "Cliente escolhe na hora", icon: "🔄" },
];

const checkoutProviders = [
  { id: "none", name: "Nenhum", description: "Apenas WhatsApp", icon: "💬", comingSoon: false },
  { id: "mercadopago", name: "Mercado Pago", description: "Checkout Pro", icon: "💙", comingSoon: true },
  { id: "infinitypay", name: "InfinityPay", description: "Link de pagamento", icon: "♾️", comingSoon: false },
  { id: "custom_link", name: "Link Personalizado", description: "Qualquer plataforma", icon: "🔗", comingSoon: true },
];

const statusConfig = {
  pending: { label: "Aguardando", variant: "secondary" as const, color: "text-warning" },
  paid: { label: "Pago ✓", variant: "default" as const, color: "text-accent" },
  expired: { label: "Expirado", variant: "outline" as const, color: "text-muted-foreground" },
  failed: { label: "Falhou", variant: "destructive" as const, color: "text-destructive" },
};

export function PaymentsTab({ formData, setFormData, storeId }: PaymentsTabProps) {
  const [newPaymentName, setNewPaymentName] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Fetch recent pending_checkouts for this store
  const { data: recentCheckouts } = useQuery({
    queryKey: ["recent-checkouts", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("pending_checkouts")
        .select("id, created_at, customer_name, total, status, provider")
        .eq("store_id", storeId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) { console.error("Checkouts fetch error:", error); return []; }
      return data || [];
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });

  // Conversion metrics
  const totalCheckouts = recentCheckouts?.length ?? 0;
  const paidCheckouts = recentCheckouts?.filter(c => c.status === "paid").length ?? 0;
  const conversionRate = totalCheckouts > 0 ? Math.round((paidCheckouts / totalCheckouts) * 100) : 0;

  const togglePayment = (payment: string) => {
    setFormData((prev) => ({
      ...prev,
      accepted_payments: prev.accepted_payments.includes(payment)
        ? prev.accepted_payments.filter((p) => p !== payment)
        : [...prev.accepted_payments, payment],
    }));
  };

  const addCustomPayment = () => {
    if (!newPaymentName.trim()) return;
    const newPayment: CustomPayment = { id: Date.now().toString(), name: newPaymentName.trim() };
    setFormData((prev) => ({
      ...prev,
      custom_payments: [...prev.custom_payments, newPayment],
      accepted_payments: [...prev.accepted_payments, newPaymentName.trim()],
    }));
    setNewPaymentName("");
  };

  const removeCustomPayment = (id: string) => {
    const payment = formData.custom_payments.find((p) => p.id === id);
    if (payment) {
      setFormData((prev) => ({
        ...prev,
        custom_payments: prev.custom_payments.filter((p) => p.id !== id),
        accepted_payments: prev.accepted_payments.filter((p) => p !== payment.name),
      }));
    }
  };

  const updateCheckoutConfig = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      checkout_config: { ...prev.checkout_config, [key]: value },
    }));
  };

  const isProviderConfigured = () => {
    const p = formData.checkout_provider;
    const c = formData.checkout_config;
    if (p === "none") return false;
    if (p === "mercadopago") return !!c.access_token;
    if (p === "infinitypay") return !!c.handle;
    if (p === "kiwify" || p === "custom_link") return !!c.url_template;
    return false;
  };

  const expiresMinutes = Number(formData.checkout_config.expires_minutes) || 30;

  return (
    <div className="space-y-4">
      {/* Checkout Mode */}
      <Card className="border-primary/20 shadow-soft">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Modo de Checkout
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Como seus clientes vão finalizar os pedidos?
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
            {checkoutModes.map((mode) => (
              <div
                key={mode.id}
                onClick={() => setFormData((prev) => ({ ...prev, checkout_mode: mode.id }))}
                className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.checkout_mode === mode.id
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-lg">{mode.icon}</span>
                  <span className="font-medium text-xs sm:text-sm">{mode.name}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{mode.description}</span>
                </div>
              </div>
            ))}
          </div>
          {formData.checkout_mode !== "whatsapp" && formData.checkout_provider === "none" && (
            <p className="text-xs text-destructive mt-3 flex items-center gap-1">
              ⚠️ Configure um provedor de checkout abaixo para ativar pagamentos online.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checkout Online */}
      <Card className="border-primary/20 shadow-soft">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Checkout Online
            {isProviderConfigured() && (
              <Badge variant="default" className="ml-2 bg-accent/10 text-accent border-accent/20 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Receba pagamentos online diretamente na sua vitrine
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
          {/* Provider selector */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
            {checkoutProviders.map((provider) => (
              provider.comingSoon ? (
                <div
                  key={provider.id}
                  className="relative p-3 sm:p-4 rounded-xl border-2 border-border bg-muted/40 opacity-70 cursor-not-allowed select-none"
                >
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-warning/15 text-warning border-warning/30">Em breve</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-lg">{provider.icon}</span>
                    <span className="font-medium text-xs sm:text-sm text-muted-foreground">{provider.name}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground/70">{provider.description}</span>
                  </div>
                </div>
              ) : (
                <div
                  key={provider.id}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      checkout_provider: provider.id,
                      checkout_config: prev.checkout_provider !== provider.id ? {} : prev.checkout_config,
                    }));
                  }}
                  className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.checkout_provider === provider.id
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-lg">{provider.icon}</span>
                    <span className="font-medium text-xs sm:text-sm">{provider.name}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{provider.description}</span>
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Dynamic config fields */}
          {formData.checkout_provider === "mercadopago" && (
            <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border/50 animate-slide-up">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Access Token</Label>
                <Input
                  type="password"
                  value={formData.checkout_config.access_token || ""}
                  onChange={(e) => updateCheckoutConfig("access_token", e.target.value)}
                  placeholder="APP_USR-..."
                  className="h-10 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                    Encontre em Mercado Pago Developers → Credenciais
                  </a>
                </p>
              </div>
            </div>
          )}

          {formData.checkout_provider === "infinitypay" && (
            <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border/50 animate-slide-up">
              <div className="space-y-2">
                <Label className="text-sm font-medium">InfiniteTag (Handle)</Label>
                <Input
                  value={formData.checkout_config.handle || ""}
                  onChange={(e) => updateCheckoutConfig("handle", e.target.value)}
                  placeholder="seu-nome-de-usuario"
                  className="h-10 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Seu nome de usuário no App InfinitePay, <strong>sem o símbolo $</strong> do início.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">URL de Redirecionamento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={formData.checkout_config.redirect_url || ""}
                  onChange={(e) => updateCheckoutConfig("redirect_url", e.target.value)}
                  placeholder="https://seusite.com/pagamento-concluido"
                  className="h-10 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Página para onde o cliente será redirecionado após o pagamento.
                </p>
              </div>
            </div>
          )}

          {formData.checkout_provider === "custom_link" && (
            <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border/50 animate-slide-up">
              <div className="space-y-2">
                <Label className="text-sm font-medium">URL Template</Label>
                <Input
                  value={formData.checkout_config.url_template || ""}
                  onChange={(e) => updateCheckoutConfig("url_template", e.target.value)}
                  placeholder="https://seusite.com/pagar?valor={{total}}&pedido={{order_id}}"
                  className="h-10 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders disponíveis: <code className="bg-muted px-1 rounded">{"{{total}}"}</code> <code className="bg-muted px-1 rounded">{"{{order_id}}"}</code> <code className="bg-muted px-1 rounded">{"{{store_name}}"}</code>
                </p>
              </div>
            </div>
          )}

          {/* Link expiration config — always visible when provider is not "none" */}
          {formData.checkout_provider !== "none" && (
            <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Tempo de expiração do link</Label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={expiresMinutes}
                  onChange={(e) => {
                    const v = Math.min(120, Math.max(5, Number(e.target.value) || 30));
                    updateCheckoutConfig("expires_minutes", String(v));
                  }}
                  className="h-10 text-sm w-28"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">(5 – 120)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Após esse tempo sem pagamento, o link expira e o estoque reservado é devolvido automaticamente.
              </p>
            </div>
          )}

          {/* Security note */}
          {formData.checkout_provider !== "none" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Suas credenciais são armazenadas de forma segura e <strong>nunca são expostas</strong> ao público. Apenas o servidor processa os pagamentos.</span>
            </div>
          )}

          {/* InfinityPay auto-webhook note */}
          {formData.checkout_provider === "infinitypay" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                <span className="text-base shrink-0">⚡</span>
                <span>O webhook de confirmação de pagamento é configurado <strong>automaticamente</strong> em cada checkout. Nenhuma configuração manual necessária.</span>
              </div>
              
              <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🧪</span>
                  <p className="text-sm font-bold text-warning">Recomendações antes de ativar</p>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Faça um <strong>pagamento teste de R$1,00</strong> antes de ativar para clientes reais.</li>
                  <li>Confirme que seu <strong>InfiniteTag ($handle)</strong> está correto — sem o símbolo <code className="bg-muted px-1 rounded">$</code>.</li>
                  <li>Após o pagamento, o pedido pode levar <strong>alguns segundos</strong> para aparecer — isso é normal.</li>
                  <li>O cliente será <strong>redirecionado automaticamente</strong> de volta à vitrine após pagar.</li>
                  <li>Caso o cliente feche a aba antes do redirecionamento, o pedido ainda será criado automaticamente.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Mercado Pago webhook manual */}
          {formData.checkout_provider === "mercadopago" && (
            <div className="space-y-3 p-4 rounded-xl border-2 border-warning/30 bg-warning/5 animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <Label className="text-sm font-bold text-warning">Configure o Webhook no Mercado Pago</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole esta URL no painel do Mercado Pago para receber pedidos automaticamente após o pagamento.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?provider=mercadopago`}
                  className="h-9 text-xs font-mono bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-9 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?provider=mercadopago`
                    );
                    setCopiedWebhook(true);
                    toast.success("URL copiada!");
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <div className="rounded-lg bg-background border border-border/50 p-3 text-xs space-y-2">
                <p className="font-semibold text-foreground">💙 Como configurar no Mercado Pago:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Acesse <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noopener noreferrer" className="underline text-primary">Mercado Pago Developers</a></li>
                  <li>Vá em <strong>Suas Integrações → Webhooks</strong></li>
                  <li>Clique em <strong>"Configurar notificações"</strong></li>
                  <li>Cole a URL acima em "URL de produção"</li>
                  <li>Marque o evento <strong>"Pagamentos"</strong> e salve</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkouts Recentes — Analytics de conversão */}
      {storeId && formData.checkout_provider !== "none" && (
        <Card className="border-primary/20 shadow-soft">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Checkouts (últimos 7 dias)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Acompanhe conversão e checkouts abandonados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/60 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{totalCheckouts}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Iniciados</p>
              </div>
              <div className="bg-accent/10 rounded-xl p-3 text-center border border-accent/20">
                <p className="text-2xl font-bold text-accent">{paidCheckouts}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Confirmados</p>
              </div>
              <div className={`rounded-xl p-3 text-center border ${
                conversionRate >= 60 ? "bg-accent/10 border-accent/20" : 
                conversionRate >= 30 ? "bg-warning/10 border-warning/20" : 
                "bg-destructive/5 border-destructive/20"
              }`}>
                <p className={`text-2xl font-bold ${
                  conversionRate >= 60 ? "text-accent" : 
                  conversionRate >= 30 ? "text-warning" : 
                  "text-destructive"
                }`}>{conversionRate}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Conversão</p>
              </div>
            </div>

            {/* Checkouts list */}
            {recentCheckouts && recentCheckouts.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {recentCheckouts.map((checkout) => {
                  const cfg = statusConfig[checkout.status as keyof typeof statusConfig] || statusConfig.pending;
                  return (
                    <div
                      key={checkout.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40 hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {checkout.customer_name || "Cliente anônimo"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(checkout.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          R$ {Number(checkout.total).toFixed(2).replace(".", ",")}
                        </p>
                        <Badge
                          variant={cfg.variant}
                          className={`text-[10px] px-1.5 py-0 h-4 ${cfg.color}`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum checkout nos últimos 7 dias</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Os checkouts aparecerão aqui assim que clientes iniciarem um pagamento</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Payments */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Pagamentos Rápidos</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Selecione as formas de pagamento aceitas</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
            {quickPaymentOptions.map((payment) => (
              <div
                key={payment.id}
                onClick={() => togglePayment(payment.name)}
                className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.accepted_payments.includes(payment.name)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-lg sm:text-2xl">{payment.icon}</span>
                  <span className="font-medium text-xs sm:text-sm flex-1 line-clamp-1">{payment.name}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Payments */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Personalizadas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Adicione formas de pagamento customizadas</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
          <div className="flex gap-2">
            <Input value={newPaymentName} onChange={(e) => setNewPaymentName(e.target.value)} placeholder="Ex: Boleto, PicPay..." onKeyDown={(e) => e.key === "Enter" && addCustomPayment()} className="h-10 text-sm" />
            <Button onClick={addCustomPayment} size="icon" className="shrink-0 h-10 w-10"><Plus className="w-4 h-4" /></Button>
          </div>

          {formData.custom_payments.length > 0 && (
            <div className="space-y-2">
              {formData.custom_payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="font-medium text-sm">{payment.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeCustomPayment(payment.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Ativas:</h4>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {formData.accepted_payments.map((payment) => (
                <Badge key={payment} variant="secondary" className="text-xs">{payment}</Badge>
              ))}
              {formData.accepted_payments.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhuma selecionada</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// Force clean rebuild

