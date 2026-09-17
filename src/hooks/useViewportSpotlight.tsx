import { useEffect, useRef, useState } from "react";

/**
 * Detects when an element enters the "spotlight zone" — the vertical center
 * of the viewport. Uses IntersectionObserver with rootMargin to create a
 * narrow detection band (~30% of viewport height centered).
 */
export function useViewportSpotlight(threshold = 0.6) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isSpotlit, setIsSpotlit] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // rootMargin shrinks the observation box to the middle ~30% of viewport
    // Top: -35% cuts the top 35%, Bottom: -35% cuts the bottom 35%
    // This leaves only the center 30% as the "spotlight zone"
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSpotlit(entry.isIntersecting);
      },
      {
        rootMargin: "-35% 0px -35% 0px",
        threshold,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isSpotlit };
}
