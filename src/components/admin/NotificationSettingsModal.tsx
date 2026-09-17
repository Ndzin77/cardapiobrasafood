import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, CheckCircle2, Shield, Smartphone, Volume2, Zap, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface NotificationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pushSupported: boolean;
  pushPermission: NotificationPermission | "unsupported";
  onEnablePush: () => Promise<void>;
  soundEnabled: boolean;
  onSoundToggle: (enabled: boolean) => void;
  realtimeEnabled: boolean;
  onRealtimeToggle: (enabled: boolean) => void;
}

export function NotificationSettingsModal({
  open,
  onOpenChange,
  pushSupported,
  pushPermission,
  onEnablePush,
  soundEnabled,
  onSoundToggle,
  realtimeEnabled,
  onRealtimeToggle,
}: NotificationSettingsModalProps) {
  const [step, setStep] = useState<"overview" | "push-guide">("overview");
  const [enabling, setEnabling] = useState(false);

  const isPushGranted = pushPermission === "granted";
  const isPushDenied = pushPermission === "denied";

  // Reset step when modal opens
  useEffect(() => {
    if (open) setStep("overview");
  }, [open]);

  const handleEnablePush = async () => {
    setEnabling(true);
    try {
      await onEnablePush();
    } finally {
      setEnabling(false);
    }
  };

  // Calculate notification "health score" — anchoring technique
  const score = [isPushGranted, soundEnabled, realtimeEnabled].filter(Boolean).length;
  const maxScore = 3;
  const scorePercent = Math.round((score / maxScore) * 100);
  const scoreColor = scorePercent === 100 ? "text-green-500" : scorePercent >= 66 ? "text-yellow-500" : "text-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Hero header with gradient — visual anchoring */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Central de Notificações</DialogTitle>
                <DialogDescription className="text-xs">
                  Nunca perca um pedido — configure seus alertas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Score indicator — social proof / progress anchoring */}
          <div className="mt-4 flex items-center gap-3 bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border/50">
            <div className="relative w-12 h-12 shrink-0">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${scorePercent}, 100`}
                  className={`${scoreColor} transition-all duration-700`}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}>
                {scorePercent}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {scorePercent === 100
                  ? "🎯 Proteção máxima!"
                  : scorePercent >= 66
                  ? "⚡ Quase lá!"
                  : "⚠️ Você pode perder pedidos"}
              </p>
              <p className="text-xs text-muted-foreground">
                {score} de {maxScore} alertas ativos
              </p>
            </div>
          </div>
        </div>

        {step === "overview" && (
          <div className="p-4 space-y-3">
            {/* Push notifications */}
            <div className={`rounded-xl border p-4 transition-all ${isPushGranted ? "border-green-500/20 bg-green-500/5" : isPushDenied ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPushGranted ? "bg-green-500/15" : "bg-primary/15"}`}>
                  <Smartphone className={`w-4 h-4 ${isPushGranted ? "text-green-500" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Notificações Push</span>
                    {isPushGranted && <Badge variant="secondary" className="text-[10px] bg-green-500/15 text-green-600 border-0">Ativo</Badge>}
                    {isPushDenied && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPushGranted
                      ? "Você receberá alertas mesmo com o navegador fechado"
                      : isPushDenied
                      ? "As notificações estão bloqueadas pelo navegador"
                      : "Receba alertas mesmo com o navegador fechado"}
                  </p>
                  {!isPushGranted && !isPushDenied && pushSupported && (
                    <Button
                      size="sm"
                      className="mt-2 h-8 text-xs gap-1.5"
                      onClick={handleEnablePush}
                      disabled={enabling}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {enabling ? "Ativando..." : "Ativar Agora"}
                    </Button>
                  )}
                  {isPushDenied && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-8 text-xs gap-1.5"
                      onClick={() => setStep("push-guide")}
                    >
                      Como desbloquear
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                  {!pushSupported && (
                    <p className="text-xs text-destructive mt-1">
                      Seu navegador não suporta notificações push
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sound notifications */}
            <div className={`rounded-xl border p-4 transition-all ${soundEnabled ? "border-green-500/20 bg-green-500/5" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${soundEnabled ? "bg-green-500/15" : "bg-muted"}`}>
                  <Volume2 className={`w-4 h-4 ${soundEnabled ? "text-green-500" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">Som de Alerta</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toque sonoro quando um pedido chegar (com aba aberta)
                  </p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={onSoundToggle} />
              </div>
            </div>

            {/* Real-time notifications */}
            <div className={`rounded-xl border p-4 transition-all ${realtimeEnabled ? "border-green-500/20 bg-green-500/5" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${realtimeEnabled ? "bg-green-500/15" : "bg-muted"}`}>
                  <Zap className={`w-4 h-4 ${realtimeEnabled ? "text-green-500" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">Alertas Visuais</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Banners e badges em tempo real dentro do painel
                  </p>
                </div>
                <Switch checked={realtimeEnabled} onCheckedChange={onRealtimeToggle} />
              </div>
            </div>

            {/* Urgency / FOMO callout */}
            {score < maxScore && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Importante:</strong> com alertas desativados, você pode perder pedidos e deixar clientes esperando.
                  Ative tudo para máxima produtividade!
                </p>
              </div>
            )}

            {score === maxScore && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-400">
                  <strong>Perfeito!</strong> Todos os alertas estão ativos. Nenhum pedido será perdido! 🎉
                </p>
              </div>
            )}
          </div>
        )}

        {step === "push-guide" && (
          <div className="p-4 space-y-4">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 -ml-2" onClick={() => setStep("overview")}>
              ← Voltar
            </Button>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Como desbloquear notificações:</h3>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-muted-foreground">
                    Clique no <strong>ícone de cadeado 🔒</strong> (ou ícone de ajuste) na barra de endereço do navegador
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-muted-foreground">
                    Procure por <strong>"Notificações"</strong> nas permissões do site
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-muted-foreground">
                    Altere de <strong>"Bloquear"</strong> para <strong>"Permitir"</strong>
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">4</span>
                  <p className="text-xs text-muted-foreground">
                    <strong>Recarregue a página</strong> e volte aqui para ativar
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground">
                  📱 <strong>No celular (PWA):</strong> Vá em Configurações do aparelho → Notificações → encontre o app e ative.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
