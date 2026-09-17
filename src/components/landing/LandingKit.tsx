import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export const WA_LINK =
  "https://wa.me/5500000000000?text=Quero%20testar%20por%207%20dias%20gr%C3%A1tis";

/** Revela o bloco quando ele entra na viewport (uma única vez). */
export function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(28px)",
        transition: `opacity .65s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .65s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function Counter({
  target,
  prefix = "",
  suffix = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
}) {
  const { ref, inView } = useInView(0.35);
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const duration = 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

/** CTA primário — único botão verde da página, sempre a ação mais pesada. */
export function CtaButton({
  children,
  className = "",
  size = "lg",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex ${className}`}
    >
      <Button
        className={`w-full gap-2.5 rounded-2xl bg-accent font-bold uppercase tracking-wide text-accent-foreground shadow-[0_10px_30px_-8px_hsl(var(--accent)/0.55)] transition-transform duration-200 hover:bg-accent hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 ${
          size === "lg"
            ? "h-auto min-h-[60px] px-7 py-4 text-sm sm:text-base"
            : "h-11 px-5 text-xs"
        }`}
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className="text-balance leading-tight">{children}</span>
      </Button>
    </a>
  );
}

/** CTA secundário, peso visual baixo — não compete com o verde. */
export function GhostCta({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}

export function Guarantee({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      7 dias grátis · Sem cartão · Sem compromisso · Cancele quando quiser
    </p>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-balance text-3xl font-bold leading-[1.15] md:text-4xl lg:text-[2.75rem] ${className}`}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </h2>
  );
}