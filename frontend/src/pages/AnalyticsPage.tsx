import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { MetricCard } from "../components/analytics/MetricCard";
import { CopaySavingsChart } from "../components/analytics/CopaySavingsChart";
import { SafetyBlocksChart } from "../components/analytics/SafetyBlocksChart";
import { AdherenceRiskTable } from "../components/analytics/AdherenceRiskTable";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorBanner } from "../shared/ErrorBanner";
import { Button } from "../shared/Button";
import { useReducedMotion } from "../utils/useReducedMotion";
import { staggerContainer, staggerSlideUp, ANIMATION_DURATION } from "../utils/animations";
import type { AnalyticsDashboardResponse, SyncResult } from "../api/analytics";
import { getSummary, syncToSnowflake } from "../api/analytics";

export function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const reduced = useReducedMotion();

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getSummary();
      setDashboard(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load analytics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const result = await syncToSnowflake();
      setSyncResult(result);
      await fetchDashboard();
    } catch {
      setSyncResult({ synced_count: 0, failed_count: 0, message: "Sync failed — see logs" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-primary pt-14">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-bg-primary px-4 pt-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ErrorBanner
            message={error}
            onDismiss={() => setError(null)}
          />
          <Button variant="secondary" className="mt-4" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  const { copay_savings, copay_by_status, safety_blocks, visit_efficiency, adherence_risks, data_source } = dashboard;

  const totalBlocks = safety_blocks.reduce((s, b) => s + b.count, 0);

  return (
    <PageTransition>
      <main className="min-h-screen bg-bg-primary px-4 pt-20 pb-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-h1 font-bold text-text-heading">Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Clinical impact metrics — copay savings, safety blocks, visit efficiency
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DataSourceBadge source={data_source} />
              <Button
                variant="secondary"
                size="sm"
                loading={syncing}
                onClick={handleSync}
                aria-label="Sync analytics to Snowflake"
              >
                {syncing ? "Syncing…" : "Sync Now"}
              </Button>
            </div>
          </div>

          {/* Sync result toast */}
          {syncResult && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-border-default bg-bg-elevated px-4 py-3 text-sm">
              <span className="text-accent-green" aria-hidden>✓</span>
              <span className="text-text-primary">{syncResult.message}</span>
              <button
                type="button"
                onClick={() => setSyncResult(null)}
                className="ml-auto text-text-secondary hover:text-text-primary"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Metric cards — 4-up grid */}
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
            variants={reduced ? undefined : staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={reduced ? undefined : staggerSlideUp}>
              <MetricCard
                label="Total Visits"
                value={visit_efficiency.total_visits}
                subtitle={`${visit_efficiency.total_prescriptions} prescriptions`}
                trend="neutral"
                icon="📋"
              />
            </motion.div>
            <motion.div variants={reduced ? undefined : staggerSlideUp}>
              <MetricCard
                label="Copay Saved"
                value={`$${copay_savings.total_copay_saved.toFixed(0)}`}
                subtitle={`Avg $${copay_savings.average_copay.toFixed(0)} per Rx`}
                trend="positive"
                icon="💰"
              />
            </motion.div>
            <motion.div variants={reduced ? undefined : staggerSlideUp}>
              <MetricCard
                label="Safety Blocks"
                value={totalBlocks}
                subtitle="Dangerous Rx prevented"
                trend={totalBlocks > 0 ? "positive" : "neutral"}
                icon="🛡️"
              />
            </motion.div>
            <motion.div variants={reduced ? undefined : staggerSlideUp}>
              <MetricCard
                label="Avg Time / Visit"
                value={`${visit_efficiency.avg_duration_minutes} min`}
                subtitle="Clinical decision time"
                trend="neutral"
                icon="⏱️"
              />
            </motion.div>
          </motion.div>

          {/* Charts — 2 col */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            <CopaySavingsChart data={copay_by_status} />
            <SafetyBlocksChart data={safety_blocks} />
          </div>

          {/* Adherence risk table */}
          <AdherenceRiskTable data={adherence_risks} />
        </div>
      </main>
    </PageTransition>
  );
}

// ---------------------------------------------------------------------------
// Data source indicator + "Powered by Snowflake" badge (§4.9)
// ---------------------------------------------------------------------------

function DataSourceBadge({ source }: { source: string }) {
  const isSnowflake = source === "snowflake";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        isSnowflake
          ? "bg-accent-blue/15 text-accent-blue"
          : "bg-bg-elevated text-text-secondary border border-border-default",
      ].join(" ")}
    >
      {isSnowflake ? (
        <>
          <SnowflakeIcon />
          Powered by Snowflake
        </>
      ) : (
        <>
          <span aria-hidden>⬡</span>
          Local PostgreSQL
        </>
      )}
    </span>
  );
}

function SnowflakeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}
