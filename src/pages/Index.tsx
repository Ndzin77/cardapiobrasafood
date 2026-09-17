import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Store, Check, X, ShieldCheck, Star, ArrowRight, Sparkle,
  Utensils, ShoppingBag, Smartphone, TrendingUp, Users, Heart, Scissors, Clock,
} from "lucide-react";
import { FooterDeveloperBadge } from "@/components/DeveloperWatermark";
import {
  WA_LINK, Reveal, Counter, CtaButton, GhostCta, Guarantee, Eyebrow, SectionTitle,
} from "@/components/landing/LandingKit";
import { faqs, FaqItem } from "@/components/landing/LandingFaq";

// ── Dores de identificação ──
const forYouItems = [
  { icon: Utensils, title: "Escrava do WhatsApp", text: "Passa o dia respondendo as mesmas perguntas, calculando frete e conferindo se o comprovante de pix não é fake." },
  { icon: ShoppingBag, title: "Venda que escorre", text: "Estava na produção, o cliente desistiu. Se foca na cozinha, o WhatsApp fica abandonado e o cliente vai pro concorrente." },
  { icon: Smartphone, title: "Cara de amadora", text: "Sonha com uma loja online de verdade, mas os sistemas que vê são caros demais ou complicados demais." },
  { icon: TrendingUp, title: "Faturamento travado", text: "Quer vender mais sem aumentar custo nem carga de trabalho. Recorrência de bolo de pote seria o sonho — mas como controlar no papel?" },
  { icon: Users, title: "Caderninho e papel de pão", text: "Sem histórico de pedidos, esquece o leite condensado da marca certa e corre no mercado de última hora." },
  { icon: Heart, title: "Secretária, estoquista, entregadora", text: "Produto incrível, paixão que transborda — e, por último, confeiteira. A cozinha em caos, o estresse lá em cima." },
  { icon: Scissors, title: "Refém das taxas", text: "O iFood entrega o cliente mas leva toda a sua margem. É humilhante trabalhar para sustentar plataforma." },
  { icon: Clock, title: "Loja que dorme com você", text: "Quer um sistema que anote pedidos sozinho e te deixe dormir 6 horas por noite sem pirar." },
];

// ── Custo da inação ──
const painItems = [
  { emoji: "😤", tag: "A venda perdida silenciosa", text: "Cliente manda mensagem → você está batendo massa → ele compra do concorrente. Você nem fica sabendo do dinheiro que perdeu." },
  { emoji: "⏰", tag: "O faturamento invisível", text: "Pedido chega fora do horário comercial → cliente cancela porque você não respondeu → você perde a chance de faturar enquanto dorme." },
  { emoji: "🤷‍♀️", tag: "Controle zero, caos total", text: "Você não sabe quantos pedidos perdeu essa semana, nem quanto realmente faturou. Sua gestão é um mistério anotado em papéis rasgados." },
  { emoji: "📱", tag: "Tempo desperdiçado, vida roubada", text: "Presa ao celular respondendo \"qual o valor?\" 50 vezes por dia. Seu tempo de criação e de família está sendo roubado por notificações." },
  { emoji: "😰", tag: "Gestão às cegas", text: "Seu faturamento é uma incógnita. Você nunca sabe quanto realmente entrou. O estresse de \"pagar para trabalhar\" é insuportável." },
  { emoji: "😓", tag: "Pedidos errados", text: "Cardápio desatualizado no grupo do zap confunde o cliente. Você entrega o sabor errado, a data errada, e sua reputação sofre." },
];

const transformationCards = [
  { icon: "⚡", title: "Seu WhatsApp vira uma máquina de vendas 24h", text: "Seus clientes entram, escolhem os produtos e pagam sozinhos via PIX ou cartão. Você recebe a notificação do pedido pronto para produzir e entregar. Sem conversa fiada. Sem demora. Sem perda." },
  { icon: "🤖", title: "Você entra no modo automático", text: "Enquanto você produz, o sistema vende. Enquanto você dorme, o sistema recebe pedidos. Enquanto você entrega, o sistema cobra. É o seu braço direito invisível." },
  { icon: "🏆", title: "Seu negócio grita profissionalismo", text: "Seus clientes veem uma loja bonita, organizada, com pagamento seguro. Você deixa de parecer \"vendedora de WhatsApp\" e passa a ser um negócio real, sólido e confiável." },
];

const reasons = [
  { n: "01", title: "Lucro 100% seu", text: "Chega de fatiar seu suor. Cada pedido entra inteiro no seu bolso, sem ninguém levando um pedaço do seu trabalho." },
  { n: "02", title: "Loja pronta ainda hoje", text: "Você não espera, não complica, não aprende código. Nossa equipe cuida de tudo. Sua loja no ar, você vendendo." },
  { n: "03", title: "Pedidos no piloto automático", text: "Cliente escolhe, paga, você recebe a notificação. Simples assim. Sem mais \"qual o valor?\" no WhatsApp." },
  { n: "04", title: "Painel de gestão completo", text: "Saiba exatamente quanto faturou, quantos pedidos e quem comprou. Tudo organizado e na palma da sua mão." },
  { n: "05", title: "Suporte humano de verdade", text: "Gente de carne e osso no WhatsApp. Não é robô, não é FAQ. É quem entende a sua dor e quer ver o seu sucesso." },
  { n: "06", title: "7 dias grátis, sem pegadinha", text: "Experimente sem risco. Use, aprove, sinta a diferença. Só depois você decide. Sem pressão, sem cartão." },
];

const testimonials = [
  { badge: "+37% em 18 dias", quote: "Em 18 dias meus pedidos aumentaram 37%. Não esperava tão rápido. A Vitrine mudou meu jogo!", name: "Márcia S.", role: "Confeiteira · São Paulo" },
  { badge: "R$ 800/mês economizados", quote: "Economizei R$ 800 por mês que pagava ao iFood. Esse dinheiro fica comigo agora. É a melhor decisão que tomei!", name: "João M.", role: "Hamburgueria · Belo Horizonte" },
  { badge: "Vende 24h por dia", quote: "Agora vendo 24h por dia, mesmo quando estou dormindo. Chega pedido pago e tudo. Minha vida mudou!", name: "Ana C.", role: "Marmitex · Curitiba" },
];

const plans = [
  {
    tag: "🛍️", name: "Vitrine Essencial", pitch: "O início da sua liberdade",
    features: ["Vitrine com link próprio", "Cardápio digital interativo com fotos", "Pedidos via WhatsApp", "Painel de gestão completo"],
    featured: false,
  },
  {
    tag: "⚡", name: "Vitrine Automática", pitch: "Sua loja no piloto automático",
    features: ["Tudo do Essencial, mais:", "Controle de estoque inteligente", "Dashboard de faturamento claro", "Suporte prioritário via WhatsApp", "Notificações em tempo real", "Pagamento online (PIX/Cartão)", "Checkout automático"],
    featured: false,
  },
  {
    tag: "⭐", name: "Vitrine Completa", pitch: "A liberdade total",
    features: ["Tudo da Automática, mais:", "Pedidos pagos enquanto você dorme", "O sistema trabalha por você 24h", "Prioridade máxima no suporte"],
    featured: true,
  },
];

export default function Index() {
  return (
    <div className="landing-theme min-h-screen bg-background font-sans text-foreground antialiased">

      {/* ── 1. FAIXA DE ESCASSEZ HONESTA ── */}
      <div className="w-full bg-[hsl(var(--cocoa))] px-4 py-2.5 text-center text-[13px] font-medium tracking-wide text-[hsl(var(--cocoa-foreground))]">
        Atenção: apenas{" "}
        <span className="font-bold text-primary-foreground underline decoration-primary decoration-2 underline-offset-4">
          20 novas vagas
        </span>{" "}
        de lojas este mês, para garantir suporte total a cada confeiteira.
      </div>

      {/* ── 2. NAVBAR ── */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Vitrine
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/explorar" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline">
              Explorar lojas
            </Link>
            <Link to="/auth" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline">
              Entrar
            </Link>
            <CtaButton size="sm">Testar grátis</CtaButton>
          </div>
        </div>
      </nav>

      {/* ── 3. HERO ── */}
      <section className="w-full px-4 pb-20 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              127+ lojas ativas lucrando agora
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1
              className="mb-6 text-balance text-4xl font-bold leading-[1.1] md:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A Confeiteira Exausta vs. A Confeiteira Livre:
              <span className="mt-2 block italic text-primary">Qual você quer ser?</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Chega de ser escrava do WhatsApp e do iFood. A Vitrine devolve o seu lucro{" "}
              <strong className="font-bold text-accent">(0% de taxa por pedido vs 27% do iFood)</strong>{" "}
              e o seu tempo precioso.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col items-center gap-4">
              <CtaButton className="w-full sm:w-auto">
                Quero minha loja grátis por 7 dias
              </CtaButton>
              <Guarantee />
              <Link
                to="/loja/meu-cantinho-doce"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Ver uma loja de exemplo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 4. BARRA DE PROVA ── */}
      <section className="w-full border-y border-border bg-card py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 text-center md:grid-cols-3">
          {[
            { value: <Counter target={127} suffix="+" />, label: "Lojas ativas", accent: false },
            { value: <Counter target={97} suffix="%" />, label: "Satisfação garantida", accent: false },
            { value: <Counter target={800} prefix="R$ " suffix="+" />, label: "Economia média/mês", accent: true },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className={`text-4xl font-bold ${s.accent ? "text-accent" : "text-foreground"}`} style={{ fontFamily: "var(--font-display)" }}>
                {s.value}
              </div>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 5. EXAUSTA VS LIVRE ── */}
      <section className="w-full bg-secondary/60 px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-14 text-center">
            <Eyebrow>A transformação</Eyebrow>
            <SectionTitle className="mt-5">
              Sua rotina hoje <span className="text-muted-foreground">vs.</span> sua rotina com a Vitrine
            </SectionTitle>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-border bg-card p-8">
                <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">😩</span>
                <h3 className="mb-5 text-xl font-bold text-foreground underline decoration-primary/30 decoration-4 underline-offset-4">
                  A Confeiteira Exausta
                </h3>
                <ul className="space-y-4">
                  {[
                    "Responde as mesmas dúvidas no WhatsApp o dia inteiro",
                    "Perde 27% de cada venda em taxas de aplicativo",
                    "Anota pedidos em caderninho e papel de pão",
                    "Descobre tarde demais o pedido que deixou passar",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="h-full rounded-3xl border border-accent/25 bg-accent/5 p-8 ring-1 ring-accent/15">
                <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl">🧁</span>
                <h3 className="mb-5 text-xl font-bold text-foreground underline decoration-accent/40 decoration-4 underline-offset-4">
                  A Confeiteira Livre
                </h3>
                <ul className="space-y-4">
                  {[
                    "Cardápio digital que vende sozinho enquanto você produz",
                    "Taxa zero: todo o lucro da venda fica no seu bolso",
                    "Estoque e histórico de pedidos organizados automaticamente",
                    "Acorda com a caixa de pedidos cheia — e já pagos",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="mt-12 text-center">
            <CtaButton>Quero ser a Confeiteira Livre</CtaButton>
          </Reveal>
        </div>
      </section>

      {/* ── 6. ESTE SISTEMA É PARA VOCÊ QUE SENTE NA PELE ── */}
      <section className="w-full px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <Eyebrow>Identificação</Eyebrow>
            <SectionTitle className="mx-auto mt-5 max-w-3xl">
              Este sistema foi feito para você, que sente na pele:
            </SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
              Se você se identificou com qualquer um desses pontos, a Vitrine é a resposta que você tanto buscou.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {forYouItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 50}>
                <div className="group h-full rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mb-2 text-sm font-bold text-foreground">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={300} className="mt-12 text-center">
            <CtaButton>Sim, isso é pra mim — quero minha loja grátis</CtaButton>
          </Reveal>
        </div>
      </section>

      {/* ── 7. CUSTO DA INAÇÃO ── */}
      <section className="w-full bg-[hsl(var(--cocoa))] px-4 py-20 text-[hsl(var(--cocoa-foreground))] md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <span className="inline-block rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
              O custo de não mudar
            </span>
            <SectionTitle className="mx-auto mt-5 max-w-3xl">
              Você está deixando dinheiro na mesa e saúde mental no lixo. Todos os dias.
            </SectionTitle>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed opacity-70 md:text-base">
              Cada minuto respondendo o WhatsApp, cada porcentagem que o iFood abocanha, é um pedaço do seu sonho que se esvai.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {painItems.map((item, i) => (
              <Reveal key={item.tag} delay={i * 60}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-300 hover:border-primary/40">
                  <div className="mb-3 text-3xl">{item.emoji}</div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{item.tag}</p>
                  <p className="text-sm leading-relaxed opacity-75">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. A REVOLUÇÃO ── */}
      <section className="w-full px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <Eyebrow>A virada</Eyebrow>
            <SectionTitle className="mx-auto mt-5 max-w-3xl">
              Acorde com pedidos pagos, sem fazer <span className="italic text-primary">nada</span>.
            </SectionTitle>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {transformationCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 110}>
                <div className="h-full overflow-hidden rounded-3xl border border-border bg-card p-7 transition-transform duration-300 hover:-translate-y-1.5">
                  <div className="mb-5 text-4xl">{card.icon}</div>
                  <h3 className="mb-3 text-lg font-bold leading-snug text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{card.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. ANCORAGEM: IFOOD VS VITRINE ── */}
      <section className="w-full bg-secondary/60 px-4 py-20 md:py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-12 text-center">
            <Eyebrow>A conta que ninguém te mostra</Eyebrow>
            <SectionTitle className="mt-5">Quanto você pagou ao iFood esse mês?</SectionTitle>
            <p className="mt-4 text-sm text-muted-foreground md:text-base">
              R$ 300? R$ 700? R$ 1.200? Agora imagine ficar com tudo isso.
            </p>
          </Reveal>

          <Reveal>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">No iFood</p>
                <p className="mt-2 text-5xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>27%</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[27%] rounded-full bg-primary" />
                </div>
                <dl className="mt-6 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Faturamento</dt><dd className="font-semibold">R$ 5.000</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Você perde</dt><dd className="font-bold text-primary">− R$ 1.350</dd></div>
                  <div className="flex justify-between border-t border-border pt-2"><dt className="text-muted-foreground">Você fica</dt><dd className="font-bold">R$ 3.650</dd></div>
                </dl>
              </div>

              <div className="rounded-3xl border border-accent/30 bg-accent/5 p-7 ring-1 ring-accent/20">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Na Vitrine</p>
                <p className="mt-2 text-5xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>0%</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-accent/15">
                  <div className="h-full w-[3%] rounded-full bg-accent" />
                </div>
                <dl className="mt-6 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Faturamento</dt><dd className="font-semibold">R$ 5.000</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Taxa da maquininha (~3%)</dt><dd className="font-semibold">− R$ 150</dd></div>
                  <div className="flex justify-between border-t border-accent/20 pt-2"><dt className="text-muted-foreground">Você fica</dt><dd className="font-bold text-accent">R$ 4.850</dd></div>
                </dl>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150} className="mt-10 text-center">
            <p className="text-xl font-bold md:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              A diferença? <span className="text-accent">R$ 1.200 no seu bolso todo mês.</span>
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Essa é a diferença entre trabalhar para sustentar uma plataforma e trabalhar para sustentar o seu sonho.
            </p>
            <div className="mt-7">
              <CtaButton>Quero ficar com 100% do meu lucro</CtaButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 10. 6 RAZÕES ── */}
      <section className="w-full px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <Eyebrow>Por que a Vitrine</Eyebrow>
            <SectionTitle className="mx-auto mt-5 max-w-2xl">
              6 razões inegáveis para começar hoje
            </SectionTitle>
          </Reveal>

          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((r, i) => (
              <Reveal key={r.n} delay={i * 60}>
                <div className="border-t-2 border-primary/25 pt-5">
                  <span className="text-xs font-bold tracking-[0.2em] text-primary">{r.n}</span>
                  <h3 className="mb-2 mt-2 text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{r.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. LOJA DE EXEMPLO ── */}
      <section className="w-full bg-secondary/60 px-4 py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>Veja com seus próprios olhos</Eyebrow>
            <SectionTitle className="mx-auto mt-5 max-w-2xl">
              Sua loja profissional, pronta em minutos
            </SectionTitle>
            <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
              Imagine a sua marca aqui, com seus doces e sua identidade. Seus clientes verão isso. Seus concorrentes, também.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button asChild variant="outline" className="h-14 rounded-2xl border-primary/30 px-7 text-sm font-bold text-primary hover:bg-primary/5 hover:text-primary">
                <Link to="/loja/meu-cantinho-doce">
                  Abrir loja de exemplo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 12. DEPOIMENTOS ── */}
      <section className="w-full px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <Eyebrow>Prova real</Eyebrow>
            <SectionTitle className="mx-auto mt-5 max-w-2xl">
              Quem já está vivendo a liberdade
            </SectionTitle>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className="flex h-full flex-col rounded-3xl border border-border bg-card p-7">
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                    <Check className="h-3.5 w-3.5" /> {t.badge}
                  </span>
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 border-t border-border pt-4">
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13. PLANOS ── */}
      <section className="w-full bg-secondary/60 px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <Eyebrow>Planos</Eyebrow>
            <SectionTitle className="mx-auto mt-5 max-w-2xl">
              Sua liberdade custa menos que um brigadeiro por dia
            </SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
              Os primeiros 7 dias são 100% grátis — sem cartão, sem compromisso. Teste com sua loja real antes de pagar qualquer coisa.
            </p>
          </Reveal>

          <div className="grid items-start gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 90}>
                <div
                  className={`relative flex h-full flex-col rounded-3xl border p-7 ${
                    plan.featured
                      ? "border-accent/40 bg-card shadow-[0_20px_60px_-24px_hsl(var(--accent)/0.5)] ring-1 ring-accent/20"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
                      Mais popular
                    </span>
                  )}
                  <div className="mb-1 text-2xl">{plan.tag}</div>
                  <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{plan.name}</h3>
                  <p className="mb-6 text-sm text-muted-foreground">{plan.pitch}</p>
                  <ul className="mb-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.featured ? (
                    <CtaButton>Começar grátis</CtaButton>
                  ) : (
                    <Button asChild variant="outline" className="h-12 rounded-2xl border-primary/30 text-sm font-bold text-primary hover:bg-primary/5 hover:text-primary">
                      <a href={WA_LINK} target="_blank" rel="noopener noreferrer">Ver preço no WhatsApp</a>
                    </Button>
                  )}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={250} className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Planos semestrais e anuais com desconto especial — pague menos por mês que um único pedido de delivery no iFood.{" "}
              <GhostCta>Perguntar sobre desconto →</GhostCta>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 14. ESCASSEZ + FECHAMENTO ── */}
      <section className="w-full bg-[hsl(var(--cocoa))] px-4 py-20 text-[hsl(var(--cocoa-foreground))] md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
              <Sparkle className="h-3.5 w-3.5" /> 20 vagas este mês
            </span>
            <SectionTitle className="mt-6">
              Sua loja pode estar pronta ainda hoje
            </SectionTitle>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed opacity-75 md:text-base">
              Liberamos apenas 20 novas lojas por mês para garantir que cada confeiteira receba o suporte que merece.
              Configure sua loja antes de dormir e amanhã acorde com um negócio que trabalha para você.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4">
              <CtaButton className="w-full sm:w-auto">
                Quero começar agora — é grátis
              </CtaButton>
              <p className="flex items-center gap-1.5 text-xs opacity-70">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                7 dias grátis · Sem cartão · Cancele quando quiser
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 15. FAQ ── */}
      <section className="w-full px-4 py-20 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-10 text-center">
            <Eyebrow>Dúvidas frequentes</Eyebrow>
            <SectionTitle className="mt-5">Para eliminar qualquer resquício de dúvida</SectionTitle>
          </Reveal>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} idx={i} />
            ))}
          </div>

          <Reveal delay={200} className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda tem dúvidas? <GhostCta>Fale com um especialista no WhatsApp →</GhostCta>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 16. FOOTER ── */}
      <footer className="w-full border-t border-border bg-card px-4 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store className="h-4 w-4" />
            </span>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Vitrine</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Transformando o suor da confeitaria em lucro real.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
            <Link to="/explorar" className="text-muted-foreground hover:text-primary">Explorar lojas</Link>
            <Link to="/auth" className="text-muted-foreground hover:text-primary">Entrar</Link>
            <GhostCta>WhatsApp</GhostCta>
          </div>
          <p className="text-xs text-muted-foreground">Vitrine · © 2026</p>
          <FooterDeveloperBadge />
        </div>
      </footer>
    </div>
  );
}
