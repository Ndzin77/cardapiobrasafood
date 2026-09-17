import { useCallback, useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface ScrollRevealCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ScrollRevealCard({ children, delay = 0, className = "" }: ScrollRevealCardProps) {
  const { ref, revealed } = useScrollReveal(0.1);
  const cardRef = useRef<HTMLDivElement>(null);

  // Remove will-change after animation completes to free GPU memory
  const handleAnimationEnd = useCallback(() => {
    cardRef.current?.classList.add("anim-done");
  }, []);

  return (
    <div
      ref={(el) => {
        // Merge refs
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={`scroll-reveal-card ${revealed ? "revealed" : ""} ${className}`}
      style={{ 
        animationDelay: `${delay}ms`,
        "--reveal-delay": `${delay}ms`,
      } as React.CSSProperties}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}
