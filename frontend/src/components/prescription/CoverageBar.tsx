import { formatCurrency } from "../../utils/formatters";
import type { CoverageStatus } from "../../stores/prescriptionStore";

export interface CoverageBarProps {
  coverageStatus: CoverageStatus;
  tier: number | null;
  copay: number | null;
  requiresPriorAuth: boolean | null;
}

const statusConfig: Record<
  CoverageStatus,
  { icon: string; label: string; color: string; bg: string }
> = {
  COVERED: {
    icon: "●",
    label: "Covered",
    color: "text-coverage-covered",
    bg: "bg-accent-green/10",
  },
  NOT_COVERED: {
    icon: "✕",
    label: "Not Covered",
    color: "text-coverage-not-covered",
    bg: "bg-accent-red/10",
  },
  PRIOR_AUTH_REQUIRED: {
    icon: "◷",
    label: "Prior Auth Required",
    color: "text-coverage-prior-auth",
    bg: "bg-accent-amber/10",
  },
  UNKNOWN: {
    icon: "?",
    label: "Unknown",
    color: "text-text-secondary",
    bg: "bg-text-secondary/10",
  },
};

export function CoverageBar({
  coverageStatus,
  tier,
  copay,
  requiresPriorAuth,
}: CoverageBarProps) {
  const config = statusConfig[coverageStatus] ?? statusConfig.UNKNOWN;

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-sm",
        config.bg,
      ].join(" ")}
    >
      {/* Coverage status */}
      <span className={`flex items-center gap-1.5 font-medium ${config.color}`}>
        <span aria-hidden>{config.icon}</span>
        {config.label}
      </span>

      {/* Tier badge */}
      {tier != null && (
        <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-medium text-text-primary">
          Tier {tier}
        </span>
      )}

      {/* Copay */}
      {copay != null && (
        <span className="text-xs font-mono text-text-primary">
          Copay: {formatCurrency(copay)}
        </span>
      )}

      {/* Prior auth */}
      {requiresPriorAuth && (
        <span className="text-xs font-medium text-accent-amber">
          PA Required
        </span>
      )}
    </div>
  );
}
