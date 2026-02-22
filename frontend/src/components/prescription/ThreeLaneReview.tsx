import { motion } from "framer-motion";
import {
  staggerContainerRecommendation,
  staggerSlideUp,
} from "../../utils/animations";
import { useReducedMotion } from "../../utils/useReducedMotion";
import { PrescriptionCard } from "./PrescriptionCard";
import type {
  RecommendationOption,
  RecommendationLabel,
} from "../../stores/prescriptionStore";

export interface ThreeLaneReviewProps {
  options: RecommendationOption[];
  onApprove: (index: number, comment: string) => Promise<void>;
  onReject: (index: number, reason: string) => Promise<void>;
  onSelectOption?: (index: number) => void;
  selectedIndex?: number | null;
}

const LANE_LABELS: RecommendationLabel[] = [
  "BEST_COVERED",
  "CHEAPEST",
  "CLINICAL_BACKUP",
];

export function ThreeLaneReview({
  options,
  onApprove,
  onReject,
  onSelectOption,
  selectedIndex,
}: ThreeLaneReviewProps) {
  const reduced = useReducedMotion();

  const containerVariants = reduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : staggerContainerRecommendation;

  const itemVariants = reduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : staggerSlideUp;

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {options.map((option, idx) => {
        const lane = option.label ?? LANE_LABELS[idx] ?? "CLINICAL_BACKUP";

        return (
          <motion.div key={idx} variants={itemVariants}>
            <PrescriptionCard
              option={option}
              index={idx}
              laneLabel={lane}
              onApprove={(comment) => onApprove(idx, comment)}
              onReject={(reason) => onReject(idx, reason)}
              isSelected={selectedIndex === idx}
              onSelect={onSelectOption ? () => onSelectOption(idx) : undefined}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
