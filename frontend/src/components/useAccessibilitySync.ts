import { useEffect } from "react";
import { useUiStore } from "../stores/uiStore";

/**
 * Syncs uiStore accessibility preferences to <html> classList and lang attr.
 * Also detects OS-level prefers-reduced-motion and applies it.
 */
export function useAccessibilitySync() {
  const highContrast = useUiStore((s) => s.highContrast);
  const dyslexiaFont = useUiStore((s) => s.dyslexiaFont);
  const largeType = useUiStore((s) => s.largeType);
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const language = useUiStore((s) => s.language);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("high-contrast", highContrast);
    el.classList.toggle("dyslexia-font", dyslexiaFont);
    el.classList.toggle("large-type", largeType);
    el.classList.toggle("reduce-motion", reduceMotion);
  }, [highContrast, dyslexiaFont, largeType, reduceMotion]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add("reduce-motion");
      }
    };
    if (mq.matches) {
      document.documentElement.classList.add("reduce-motion");
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
}
