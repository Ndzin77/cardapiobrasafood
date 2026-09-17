import { MessageCircleQuestion, HelpCircle } from "lucide-react";
import { StoreInfo } from "@/types/store";
import { applyWhatsAppTemplate, clampText, encodeWhatsAppText, sanitizeWhatsAppNumber } from "@/lib/whatsappTemplates";

interface FloatingHelpButtonProps {
  store: StoreInfo;
}

export function FloatingHelpButton({ store }: FloatingHelpButtonProps) {
  if (!store.helpButtonEnabled || !store.whatsapp) return null;

  const template = (store.helpButtonMessage || "").trim();
  const rendered = template
    ? applyWhatsAppTemplate(template, {
        loja_nome: store.name,
        loja_link: `${window.location.origin}/loja/${store.slug}`,
      })
    : "Olá! Tenho uma dúvida.";

  const message = encodeWhatsAppText(clampText(rendered, 1000));
  const whatsappNumber = sanitizeWhatsAppNumber(store.whatsapp);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-28 right-4 sm:right-6 z-40 group"
      aria-label="Tirar dúvidas pelo WhatsApp"
    >
      <div className="relative flex items-center gap-2 bg-card text-foreground pl-4 pr-5 py-3 rounded-full shadow-medium border border-border/50 transition-all duration-300 hover:shadow-strong hover:-translate-y-0.5 hover:border-primary/30 active:scale-95">
        {/* Icon container */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <MessageCircleQuestion className="w-4 h-4 text-primary" />
        </div>
        
        <span className="text-sm font-semibold hidden sm:inline">Precisa de ajuda?</span>
        <span className="text-sm font-semibold sm:hidden">Ajuda</span>
      </div>
    </a>
  );
}
