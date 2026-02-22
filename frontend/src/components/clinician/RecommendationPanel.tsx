import { useEffect, useRef, forwardRef } from "react";
import { Button, ErrorBanner, EmptyState } from "../../shared";
import { useTranslation } from "../../i18n";
import { ThreeLaneReview } from "../prescription/ThreeLaneReview";
import type { RecommendationOption } from "../../stores/prescriptionStore";

export interface RecommendationPanelProps {
  recommendations: RecommendationOption[];
  isLoading: boolean;
  error: string | null;
  approvalError?: string | null;
  onGenerate: () => void;
  onRetry: () => void;
  onApprove: (index: number, comment: string) => Promise<void>;
  onReject: (index: number, reason: string) => Promise<void>;
  onSelectOption?: (index: number) => void;
  selectedIndex?: number | null;
  hasPatient: boolean;
  hasNotes: boolean;
  isDemoMode?: boolean;
}

export function RecommendationPanel({
  recommendations,
  isLoading,
  error,
  approvalError,
  onGenerate,
  onRetry,
  onApprove,
  onReject,
  onSelectOption,
  selectedIndex,
  hasPatient,
  hasNotes,
  isDemoMode = false,
}: RecommendationPanelProps) {
  const { t } = useTranslation();
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading && announcerRef.current) {
      announcerRef.current.textContent =
        "Generating prescription recommendations.";
    }
  }, [isLoading]);

  useEffect(() => {
    if (recommendations.length > 0 && announcerRef.current) {
      announcerRef.current.textContent = t.recommendationsLoaded;
    }
  }, [recommendations.length, t.recommendationsLoaded]);

  useEffect(() => {
    if (error && announcerRef.current) {
      announcerRef.current.textContent = t.recommendationsFailed;
    }
  }, [error, t.recommendationsFailed]);

  if (error) {
    return (
      <>
        <Announcer ref={announcerRef} />
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <Button variant="secondary" onClick={onRetry}>
            {t.retry}
          </Button>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Announcer ref={announcerRef} />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-border-default bg-bg-elevated"
            />
          ))}
          <p className="text-center text-sm text-text-secondary">
            Generating recommendations with AI...
          </p>
        </div>
      </>
    );
  }

  if (recommendations.length === 0) {
    return (
      <>
        <Announcer ref={announcerRef} />
        <EmptyState
          title={t.emptyRecommendations}
          description={t.recommendationsEmpty}
          icon="💊"
          action={
            <Button
              onClick={onGenerate}
              disabled={!hasPatient || !hasNotes}
            >
              {t.generateRecommendations}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <Announcer ref={announcerRef} />
      {isDemoMode && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent-amber/40 bg-accent-amber/10 px-3 py-2">
          <span className="inline-flex items-center rounded-full bg-accent-amber/20 px-2 py-0.5 text-xs font-semibold text-accent-amber">
            Demo mode
          </span>
          <span className="text-xs text-text-secondary">
            Showing cached recommendations — AI service unavailable
          </span>
        </div>
      )}
      {approvalError && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
          <span className="text-sm text-destructive">{approvalError}</span>
        </div>
      )}
      <ThreeLaneReview
        options={recommendations}
        onApprove={onApprove}
        onReject={onReject}
        onSelectOption={onSelectOption}
        selectedIndex={selectedIndex}
      />
    </>
  );
}

const Announcer = forwardRef<HTMLDivElement>(function Announcer(_, ref) {
  return (
    <div ref={ref} role="status" aria-live="polite" className="sr-only" />
  );
});
