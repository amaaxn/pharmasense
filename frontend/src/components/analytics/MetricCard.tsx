import { motion } from "framer-motion";
import { useReducedMotion } from "../../utils/useReducedMotion";
import { ANIMATION_DURATION } from "../../utils/animations";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "positive" | "negative" | "neutral";
  icon?: string;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const trendColors: Record<string, string> = {
  positive: "text-accent-green",
  negative: "text-accent-red",
  neutral: "text-text-secondary",
};

export function MetricCard({ label, value, subtitle, trend = "neutral", icon }: MetricCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? undefined : fadeInUp}
      initial="hidden"
      animate="visible"
      transition={reduced ? { duration: 0 } : { duration: ANIMATION_DURATION.pageEntrance, ease: "easeOut" }}
      className="bg-bg-elevated border border-border-default rounded-2xl p-6"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-text-secondary uppercase tracking-wider">{label}</p>
        {icon && <span className="text-2xl" aria-hidden>{icon}</span>}
      </div>
      <p className="mt-2 text-4xl font-bold text-text-heading">{value}</p>
      {subtitle && (
        <p className={["mt-1 text-sm", trendColors[trend]].join(" ")}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
