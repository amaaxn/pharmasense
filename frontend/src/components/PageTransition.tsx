import { motion } from "framer-motion";
import { useReducedMotion } from "../utils/useReducedMotion";
import { slideUp, ANIMATION_DURATION } from "../utils/animations";
import type { ReactNode } from "react";

export interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps page content for consistent entrance animation (§9.3).
 * Uses slideUp; respects reduced motion (instant when enabled).
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={
        reduced
          ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
          : slideUp
      }
      transition={
        reduced ? { duration: 0 } : { duration: ANIMATION_DURATION.pageEntrance }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
