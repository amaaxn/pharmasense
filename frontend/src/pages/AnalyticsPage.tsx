import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { CopaySavingsChart } from "../components/analytics/CopaySavingsChart";
import { SafetyBlocksChart } from "../components/analytics/SafetyBlocksChart";
import { AdherenceRiskTable } from "../components/analytics/AdherenceRiskTable";
import { useReducedMotion } from "../utils/useReducedMotion";
import {
  BarChart3,
  TrendingDown,
  Shield,
  Pill,
  Clock,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import type { AnalyticsDashboardResponse, SyncResult } from "../api/analytics";
import { getSummary, syncToSnowflake } from "../api/analytics";

const cardAnim = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  useReducedMotion();

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {error}
        </div>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-xl bg-secondary px-4 py-2 text-sm text-foreground transition hover:bg-secondary/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  const { copay_savings, copay_by_status, safety_blocks, visit_efficiency, adherence_risks, data_source } = dashboard;
  const totalBlocks = safety_blocks.reduce((s, b) => s + b.count, 0);

  const metrics = [
    {
      label: "Total Visits",
      value: String(visit_efficiency.total_visits),
      subtitle: `${visit_efficiency.total_prescriptions} prescriptions`,
      icon: Clock,
      color: "text-ps-blue",
      glow: "shadow-glow-blue",
    },
    {
      label: "Copay Saved",
      value: `$${copay_savings.total_copay_saved.toFixed(0)}`,
      subtitle: `Avg $${copay_savings.average_copay.toFixed(0)} per Rx`,
      icon: TrendingDown,
      color: "text-ps-green",
      glow: "shadow-glow-green",
    },
    {
      label: "Safety Blocks",
      value: String(totalBlocks),
      subtitle: "Dangerous Rx prevented",
      icon: Shield,
      color: "text-ps-red",
      glow: "shadow-glow-red",
    },
    {
      label: "Avg Time / Visit",
      value: `${visit_efficiency.avg_duration_minutes} min`,
      subtitle: "Clinical decision time",
      icon: Pill,
      color: "text-primary",
      glow: "shadow-glow-purple",
    },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-1 rounded-full bg-gradient-to-b from-primary to-ps-plum" />
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataSourceBadge source={data_source} />
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary/80 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Sync result */}
        {syncResult && (
          <div className="mb-6 flex items-center gap-3 rounded-xl glass p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 text-ps-green" />
            <span className="text-foreground">{syncResult.message}</span>
            <button onClick={() => setSyncResult(null)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Metric cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                {...cardAnim}
                transition={{ delay: i * 0.08, type: "spring", bounce: 0.2 }}
                className={`glass-card rounded-2xl p-5 card-hover ${m.glow}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 ${m.color}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                </div>
                <p className="mt-4 font-display text-3xl font-bold text-foreground">{m.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground/60">{m.subtitle}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="mb-5 font-display text-lg font-semibold text-foreground">Copay Savings</h3>
            <CopaySavingsChart data={copay_by_status} />
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="mb-5 font-display text-lg font-semibold text-foreground">Safety Blocks</h3>
            <SafetyBlocksChart data={safety_blocks} />
          </div>
        </div>

        {/* Adherence risk table */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-5 font-display text-lg font-semibold text-foreground">Adherence Risk</h3>
          <AdherenceRiskTable data={adherence_risks} />
        </div>
      </div>
    </PageTransition>
  );
}

function DataSourceBadge({ source }: { source: string }) {
  const isSnowflake = source === "snowflake";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
      isSnowflake
        ? "bg-ps-blue/12 text-ps-blue ring-1 ring-ps-blue/20"
        : "bg-secondary text-muted-foreground ring-1 ring-border/30"
    }`}>
      {isSnowflake ? "Snowflake" : "Local DB"}
    </span>
  );
}
