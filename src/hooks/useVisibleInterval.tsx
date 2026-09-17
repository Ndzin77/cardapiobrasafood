import { useEffect, useRef } from "react";

/**
 * setInterval that only runs while the tab/document is visible.
 * Prevents dozens of 1s timers from burning battery/CPU on weaker devices
 * when the storefront is in the background.
 *
 * Pass `active = false` to disable it entirely.
 */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number,
  active: boolean = true,
  runImmediately: boolean = true
) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!active || delayMs <= 0) return;

    let id: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const start = () => {
      if (id !== null) return;
      if (runImmediately) savedCallback.current();
      id = setInterval(() => savedCallback.current(), delayMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [delayMs, active, runImmediately]);
}
