import { useState } from "react";
import { Badge } from "../../shared";
import { CoverageBar } from "./CoverageBar";
import { ApprovalCheckbox, type CardActionState } from "./ApprovalCheckbox";
import type {
  RecommendationOption,
  RecommendationLabel,
  CoverageStatus,
  SafetyCheck,
} from "../../stores/prescriptionStore";

export interface PrescriptionCardProps {
  option: RecommendationOption;
  index: number;
  laneLabel: RecommendationLabel;
  onApprove: (comment: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isSelected?: boolean;
  onSelect?: () => void;
}

const laneConfig: Record<
  RecommendationLabel,
  { label: string; color: string; icon: string }
> = {
  BEST_COVERED: {
    label: "Best Covered",
    color: "text-accent-green",
    icon: "🛡",
  },
  CHEAPEST: {
    label: "Cheapest",
    color: "text-accent-cyan",
    icon: "💲",
  },
  CLINICAL_BACKUP: {
    label: "Clinical Backup",
    color: "text-accent-amber",
    icon: "📋",
  },
};

function deriveCoverageStatus(drug: {
  isCovered: boolean | null;
  requiresPriorAuth: boolean | null;
}): CoverageStatus {
  if (drug.requiresPriorAuth) return "PRIOR_AUTH_REQUIRED";
  if (drug.isCovered === true) return "COVERED";
  if (drug.isCovered === false) return "NOT_COVERED";
  return "UNKNOWN";
}

export function PrescriptionCard({
  option,
  index,
  laneLabel,
  onApprove,
  onReject,
  isSelected = false,
  onSelect,
}: PrescriptionCardProps) {
  const [cardState, setCardState] = useState<CardActionState>("pending");
  const config = laneConfig[laneLabel];
  const isBlocked = option.blocked === true;
  const hasWarnings =
    option.warnings.length > 0 &&
    !isBlocked;

  const handleApprove = async (comment: string) => {
    await onApprove(comment);
    setCardState("approved");
  };

  const handleReject = async (reason: string) => {
    await onReject(reason);
    setCardState("rejected");
  };

  // Card border / bg based on state
  const stateStyles = getStateStyles(cardState, isBlocked, hasWarnings);

  const selectable = !!onSelect && cardState === "pending" && !isBlocked;

  return (
    <div
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? isSelected : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={[
        "rounded-xl border p-6 shadow-card transition-all",
        selectable && "cursor-pointer",
        isSelected && cardState === "pending"
          ? "ring-2 ring-accent-purple border-accent-purple/50"
          : "",
        stateStyles.border,
        stateStyles.bg,
        stateStyles.extra,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Lane header */}
      <div className={`mb-3 flex items-center gap-2 ${config.color}`}>
        <span aria-hidden className="text-lg">
          {config.icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider">
          {config.label}
        </span>
        <span className="text-xs text-text-secondary">#{index + 1}</span>

        {/* State badge */}
        <div className="ml-auto">
          <StateBadge state={cardState} blocked={isBlocked} hasWarnings={hasWarnings} />
        </div>
      </div>

      {/* Header row */}
      <h3
        className={[
          "text-h3 font-mono font-semibold text-text-heading",
          cardState === "rejected" && "line-through opacity-60",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {option.primary.drugName}
      </h3>
      <p className="text-sm text-text-secondary">
        {option.primary.genericName}
      </p>

      {/* Dosage row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-bg-elevated px-2.5 py-0.5 font-mono text-sm text-text-primary">
          {option.primary.dosage}
        </span>
        <span className="rounded-full bg-bg-elevated px-2.5 py-0.5 font-mono text-sm text-text-primary">
          {option.primary.frequency}
        </span>
        <span className="rounded-full bg-bg-elevated px-2.5 py-0.5 font-mono text-sm text-text-primary">
          {option.primary.duration || "ongoing"}
        </span>
      </div>

      {/* Coverage section */}
      <div className="mt-4">
        <CoverageBar
          coverageStatus={deriveCoverageStatus(option.primary)}
          tier={option.primary.tier}
          copay={option.primary.estimatedCopay}
          requiresPriorAuth={option.primary.requiresPriorAuth}
        />
      </div>

      {/* Safety section */}
      {option.safetyChecks && option.safetyChecks.length > 0 && (
        <SafetySection
          checks={option.safetyChecks}
          blocked={isBlocked}
          blockReason={option.blockReason}
          hasWarnings={hasWarnings}
        />
      )}

      {/* Warnings (if no explicit safetyChecks) */}
      {(!option.safetyChecks || option.safetyChecks.length === 0) &&
        hasWarnings && (
          <div className="mt-4">
            <Badge variant="safety-warn">Warning ⚠</Badge>
            <ul className="mt-2 space-y-1 text-xs text-accent-amber">
              {option.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

      {/* Blocked reason */}
      {isBlocked && option.blockReason && (
        <div className="mt-4 rounded-lg border border-accent-red/30 bg-accent-red/5 px-3 py-2">
          <p className="text-sm font-medium text-accent-red">
            ⛔ {option.blockReason}
          </p>
        </div>
      )}

      {/* Rationale */}
      {(option.rationale || option.primary.rationale) && (
        <div className="mt-4">
          <Badge variant="ai">AI Rationale</Badge>
          <p className="mt-1.5 text-sm text-text-secondary">
            {option.rationale || option.primary.rationale}
          </p>
        </div>
      )}

      {/* Approval flow */}
      <ApprovalCheckbox
        blocked={isBlocked}
        hasWarnings={hasWarnings}
        onApprove={handleApprove}
        onReject={handleReject}
        cardState={cardState}
        medicationName={option.primary.drugName}
      />

      {/* Approved / Rejected read-only feedback */}
      {cardState === "approved" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-accent-green">
          <span>✓</span>
          <span className="font-medium">Prescription approved</span>
        </div>
      )}
      {cardState === "rejected" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
          <span>✕</span>
          <span className="font-medium">Prescription rejected</span>
        </div>
      )}
    </div>
  );
}

// ── State badge ──────────────────────────────────────────────────────

function StateBadge({
  state,
  blocked,
  hasWarnings,
}: {
  state: CardActionState;
  blocked: boolean;
  hasWarnings: boolean;
}) {
  if (state === "approved") {
    return <Badge variant="status-approved">✓ Approved</Badge>;
  }
  if (state === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-text-secondary/15 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
        ✕ Rejected
      </span>
    );
  }
  if (blocked) {
    return <Badge variant="status-blocked">⛔ BLOCKED</Badge>;
  }
  if (hasWarnings) {
    return <Badge variant="safety-warn">⚠ Warning</Badge>;
  }
  return null;
}

// ── State-based styles ───────────────────────────────────────────────

function getStateStyles(
  state: CardActionState,
  blocked: boolean,
  hasWarnings: boolean,
): { border: string; bg: string; extra: string } {
  if (state === "approved") {
    return {
      border: "border-l-4 border-accent-green",
      bg: "bg-accent-green/5",
      extra: "",
    };
  }
  if (state === "rejected") {
    return {
      border: "border-l-4 border-text-secondary",
      bg: "bg-bg-card opacity-60",
      extra: "",
    };
  }
  if (blocked) {
    return {
      border: "border-l-4 border-accent-red border-accent-red/50",
      bg: "bg-accent-red/5",
      extra: "opacity-80",
    };
  }
  if (hasWarnings) {
    return {
      border: "border-l-4 border-accent-amber",
      bg: "bg-bg-card",
      extra: "",
    };
  }
  return {
    border: "border-border-default",
    bg: "bg-bg-card",
    extra: "",
  };
}

// ── Safety expandable checklist ──────────────────────────────────────

function SafetySection({
  checks,
  blocked,
  blockReason,
  hasWarnings,
}: {
  checks: SafetyCheck[];
  blocked: boolean;
  blockReason?: string;
  hasWarnings: boolean;
}) {
  const badgeVariant = blocked
    ? "safety-fail"
    : hasWarnings
      ? "safety-warn"
      : "safety-pass";

  const badgeLabel = blocked
    ? "BLOCKED ✕"
    : hasWarnings
      ? "Warning ⚠"
      : "Safety Passed ✓";

  const glowClass = blocked
    ? "hover:shadow-glow-red"
    : hasWarnings
      ? "hover:shadow-glow-amber"
      : "hover:shadow-glow-green";

  return (
    <div className="mt-4">
      <details className="group">
        <summary
          className={`cursor-pointer list-none ${glowClass} inline-block rounded-full transition-shadow`}
        >
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </summary>
        <div className="mt-2 space-y-1.5 rounded-lg border border-border-default bg-bg-elevated p-3">
          {checks.map((check, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <span
                    className={
                      check.passed
                        ? "text-accent-green"
                        : check.severity === "WARNING"
                          ? "text-accent-amber"
                          : "text-accent-red"
                    }
                    aria-hidden
                  >
                    {check.passed
                      ? "✓"
                      : check.severity === "WARNING"
                        ? "⚠"
                        : "✕"}
                  </span>
                  <span className="text-text-primary">
                    <strong>{check.checkType}:</strong> {check.message}
                  </span>
                </div>
                <Badge
                  variant={
                    check.passed
                      ? "safety-pass"
                      : check.severity === "WARNING"
                        ? "safety-warn"
                        : "safety-fail"
                  }
                >
                  {check.passed
                    ? "PASS"
                    : check.severity === "WARNING"
                      ? "WARNING"
                      : "FAIL"}
                </Badge>
              </div>
              {/* Failed check suggestion */}
              {!check.passed && check.message && (
                <p className="ml-5 mt-1 text-xs text-accent-amber">
                  {check.message}
                </p>
              )}
            </div>
          ))}
          {blocked && blockReason && (
            <p className="mt-2 pl-5 text-xs text-accent-amber">
              Suggestion: {blockReason}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
