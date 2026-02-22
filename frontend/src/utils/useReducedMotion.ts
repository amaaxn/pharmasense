import { useSyncExternalStore } from "react";
import { useUiStore } from "../stores/uiStore";

/**
 * Returns true when animations should be disabled.
 * Respects: 1) uiStore.reduceMotion, 2) OS prefers-reduced-motion.
 * Use to wrap animation variants so reduced motion disables them (§9.2).
 */
export function useReducedMotion(): boolean {
  const storeReduceMotion = useUiStore((s) => s.reduceMotion);
  const prefersReduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return storeReduceMotion || prefersReduced;
}

/**
 * Returns transition config: instant (0) when reduced motion, else the given duration.
 */
export function useTransitionConfig(duration: number): { duration: number } {
  const reduced = useReducedMotion();
  return { duration: reduced ? 0 : duration };
}
