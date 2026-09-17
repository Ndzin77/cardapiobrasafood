import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "./LandingKit";

export const faqs = [
  {
    q: "Preciso de conhecimento técnico?",
    a: "Não! Nossa equipe faz tudo para você: configuramos a loja, o cardápio e o pagamento. Sua única tarefa é vender.",
  },
  {
    q: "Quanto tempo leva para ficar pronto?",
    a: "Sua loja pode estar no ar ainda hoje, em questão de horas, dependendo da demanda do dia.",
  },
  {
    q: "Como funcionam os 7 dias grátis?",
    a: "Você usa a plataforma completa por 7 dias, sem compromisso e sem precisar de cartão. Se amar, continua. Se não, cancela sem perguntas.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim, a liberdade é sua. Cancele quando quiser, sem multa e sem burocracia.",
  },
  {
    q: "Meu negócio é pequeno, vale a pena?",
    a: "Especialmente para você! A Vitrine foi feita para pequenos negócios que querem crescer sem dores de cabeça — quanto menor o negócio, maior o impacto de parar de perder pedidos.",
  },
  {
    q: "Qual é a taxa que cobram por pedido?",
    a: "Nenhuma! Seu lucro é 100% seu. As únicas taxas são as da maquininha de pagamento, que são mínimas (em torno de 3%).",
  },
  {
    q: "Funciona para qualquer tipo de negócio alimentício?",
    a: "Sim! Confeitaria, salgados, marmitex, hamburgueria, açaí, pizzaria. Se você vende comida, a Vitrine é para você.",
  },
  {
    q: "Meus clientes precisam baixar algum aplicativo?",
    a: "Não! Tudo funciona direto no navegador do celular, de forma simples e intuitiva para eles.",
  },
  {
    q: "E se eu tiver dúvidas depois que a loja estiver pronta?",
    a: "Nosso suporte humano via WhatsApp está sempre pronto para te ajudar. Não é robô, não é FAQ automático.",
  },
];

export function FaqItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={idx * 40}>
      <div
        className={`overflow-hidden rounded-2xl border bg-card transition-colors duration-300 ${
          open ? "border-primary/40" : "border-border hover:border-primary/25"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
        >
          <span className="text-sm font-semibold leading-snug text-foreground md:text-base">
            {q}
          </span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
              open
                ? "rotate-180 bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        <div
          className={`grid transition-all duration-300 ease-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="border-t border-border/60 px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">
              {a}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}