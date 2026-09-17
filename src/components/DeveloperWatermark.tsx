import { Instagram, ArrowRight, Code2, Sparkles, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";

const INSTAGRAM_PROFILE = "https://instagram.com/n4ndx.77";

// Footer watermark - integrated at bottom of page
export function FooterDeveloperBadge() {
  return (
    <div className="w-full bg-gradient-to-r from-secondary/50 via-secondary/30 to-secondary/50 border-t border-border/30 py-4 px-4">
      <div className="container flex items-center justify-center">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Code2 className="w-4 h-4 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              criado por
            </span>
            <a
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              <Instagram className="w-4 h-4" />
              @n4ndx.77
            </a>
          </div>

          <div className="hidden sm:block w-px h-4 bg-border/60" />

          <a
            href={INSTAGRAM_PROFILE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-all duration-300 group"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
            <span>quer um site assim?</span>
            <span className="font-semibold text-primary underline underline-offset-2 decoration-primary/50 hover:decoration-primary flex items-center gap-0.5">
              clique aqui!
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Floating watermark - draggable, dismiss after 60s, sessionStorage
export function FloatingDeveloperBadge() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("dev_badge_dismissed") === "1";
  });
  const [showClose, setShowClose] = useState(false);
  const [pos, setPos] = useState({ x: 12, y: -1 }); // y=-1 means use default bottom
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0, moved: false });
  const badgeRef = useRef<HTMLDivElement>(null);

  // Show X after 60 seconds
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setShowClose(true), 60000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  // Initialize default Y position
  useEffect(() => {
    if (pos.y === -1) {
      setPos(p => ({ ...p, y: window.innerHeight - 140 }));
    }
  }, [pos.y]);

  const getSnappedX = useCallback((currentX: number) => {
    const midpoint = window.innerWidth / 2;
    const badgeWidth = badgeRef.current?.offsetWidth || 140;
    if (currentX + badgeWidth / 2 < midpoint) {
      return 12; // snap left
    }
    return window.innerWidth - badgeWidth - 12; // snap right
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragStartRef.current.moved = true;
    }
    const badgeW = badgeRef.current?.offsetWidth || 140;
    const badgeH = badgeRef.current?.offsetHeight || 48;
    const newX = Math.max(0, Math.min(window.innerWidth - badgeW, dragStartRef.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - badgeH, dragStartRef.current.posY + dy));
    setPos({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to nearest edge
    const snappedX = getSnappedX(pos.x);
    setPos(p => ({ ...p, x: snappedX }));
    // If it was a tap (not drag), open link
    if (!dragStartRef.current.moved) {
      window.open(INSTAGRAM_PROFILE, "_blank", "noopener,noreferrer");
    }
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, [isDragging, pos.x, getSnappedX]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(true);
    sessionStorage.setItem("dev_badge_dismissed", "1");
  }, []);

  if (dismissed || pos.y === -1) return null;

  return (
    <div
      ref={badgeRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        "fixed z-50 select-none touch-none",
        "flex items-center gap-2",
        "py-2 pl-2 pr-3.5 rounded-full",
        "bg-foreground text-background",
        "shadow-xl",
        "group animate-fade-in",
        isDragging ? "scale-110 shadow-2xl cursor-grabbing" : "cursor-grab hover:scale-105 hover:shadow-2xl"
      )}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transition: isDragging ? "none" : "left 0.4s cubic-bezier(.34,1.56,.64,1), top 0.1s ease, transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Close button */}
      {showClose && (
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] shadow-md hover:scale-110 transition-transform z-10 animate-fade-in"
        >
          <XIcon className="w-3 h-3" />
        </button>
      )}

      {/* Instagram gradient icon */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[hsl(37,97%,50%)] via-[hsl(330,70%,50%)] to-[hsl(270,70%,55%)] flex items-center justify-center shrink-0 shadow-md pointer-events-none">
        <Instagram className="w-4.5 h-4.5 text-white" />
      </div>

      {/* Text */}
      <div className="flex flex-col leading-tight pointer-events-none">
        <span className="text-[11px] font-bold tracking-tight">
          @n4ndx.77
        </span>
        <span className="text-[9px] opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          Quero um site! <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}

// Combined component
export function DeveloperWatermarks() {
  return <FloatingDeveloperBadge />;
}
