import type { CopayByStatus } from "../../api/analytics";

export interface CopaySavingsChartProps {
  data: CopayByStatus[];
}

const statusColors: Record<string, string> = {
  COVERED: "bg-accent-green",
  PRIOR_AUTH_REQUIRED: "bg-accent-amber",
  NOT_COVERED: "bg-accent-red",
  UNKNOWN: "bg-text-secondary",
};

const statusLabels: Record<string, string> = {
  COVERED: "Covered",
  PRIOR_AUTH_REQUIRED: "Prior Auth",
  NOT_COVERED: "Not Covered",
  UNKNOWN: "Unknown",
};

export function CopaySavingsChart({ data }: CopaySavingsChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Coverage Distribution
        </h3>
        <p className="text-sm text-text-secondary">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Coverage Distribution
      </h3>
      <div className="space-y-3" role="list" aria-label="Coverage distribution chart">
        {data.map((item) => {
          const pct = Math.round((item.count / maxCount) * 100);
          const color = statusColors[item.coverage_status] || statusColors.UNKNOWN;
          const label = statusLabels[item.coverage_status] || item.coverage_status;
          return (
            <div key={item.coverage_status} role="listitem">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-primary">{label}</span>
                <span className="text-xs text-text-secondary">
                  {item.count} · ${item.total_copay.toFixed(0)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-bg-primary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${item.count} prescriptions`}>
                <div
                  className={["h-full rounded-full transition-all duration-500", color].join(" ")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
