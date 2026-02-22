import type { SafetyBlockReason } from "../../api/analytics";

export interface SafetyBlocksChartProps {
  data: SafetyBlockReason[];
}

const blockColors: Record<string, string> = {
  ALLERGY: "bg-accent-red",
  INTERACTION: "bg-accent-amber",
  DOSE_RANGE: "bg-accent-purple",
  DUPLICATE_THERAPY: "bg-accent-blue",
  OTHER: "bg-text-secondary",
};

const blockLabels: Record<string, string> = {
  ALLERGY: "Allergy",
  INTERACTION: "Interaction",
  DOSE_RANGE: "Dose Range",
  DUPLICATE_THERAPY: "Duplicate Therapy",
  OTHER: "Other",
};

export function SafetyBlocksChart({ data }: SafetyBlocksChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Safety Block Reasons
        </h3>
        <p className="text-sm text-text-secondary">No blocks recorded</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Safety Block Reasons
      </h3>
      <div className="space-y-3" role="list" aria-label="Safety block reasons chart">
        {data.map((item) => {
          const pct = Math.round((item.count / maxCount) * 100);
          const color = blockColors[item.block_type] || blockColors.OTHER;
          const label = blockLabels[item.block_type] || item.block_type;
          return (
            <div key={item.block_type} role="listitem">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-primary">{label}</span>
                <span className="text-xs text-text-secondary">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-bg-primary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${item.count} blocks`}>
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
