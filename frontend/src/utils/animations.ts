import type { Variants } from "framer-motion";

/** Duration values (seconds) per §9.4 Animation Usage Guidelines */
export const ANIMATION_DURATION = {
  pageEntrance: 0.4,
  cardStagger: 0.08,
  modalOpen: 0.3,
  sidebarSlide: 0.3,
  buttonHover: 0.2,
  badgeAppear: 0.3,
  recommendationStagger: 0.1,
  errorBanner: 0.3,
  toast: 0.3,
} as const;

/** Page entrance — slide up from below */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ANIMATION_DURATION.pageEntrance, ease: "easeOut" },
  },
};

/** Modal / badge scale in */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: ANIMATION_DURATION.modalOpen, ease: "easeOut" },
  },
};

/** Sidebar slide in from right (or left for our sidebar) */
export const slideInLeft: Variants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { duration: ANIMATION_DURATION.sidebarSlide, ease: "easeOut" },
  },
};

/** Sidebar slide in from right (for right-side drawers) */
export const slideInRight: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { duration: ANIMATION_DURATION.sidebarSlide, ease: "easeOut" },
  },
};

/** Stagger container for list animations */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_DURATION.cardStagger,
      delayChildren: 0,
    },
  },
};

/** Stagger container with 0.1s stagger (recommendation cards) */
export const staggerContainerRecommendation: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_DURATION.recommendationStagger,
      delayChildren: 0,
    },
  },
};

/** Child variant for stagger — slide up */
export const staggerSlideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ANIMATION_DURATION.cardStagger * 2, ease: "easeOut" },
  },
};

/** Button hover — subtle lift */
export const buttonHover = {
  y: -2,
  transition: { duration: ANIMATION_DURATION.buttonHover },
};

/** Error banner slide up */
export const errorBannerSlide: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ANIMATION_DURATION.errorBanner, ease: "easeOut" },
  },
};

/** Toast slide in from top-right */
export const toastSlide: Variants = {
  hidden: { opacity: 0, x: 100, y: -20 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: ANIMATION_DURATION.toast, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: ANIMATION_DURATION.toast },
  },
};
