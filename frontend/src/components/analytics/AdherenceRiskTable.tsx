import type { AdherenceRisk } from "../../api/analytics";

export interface AdherenceRiskTableProps {
  data: AdherenceRisk[];
}

const riskConfig: Record<string, { dot: string; color: string; label: string }> = {
  HIGH_RISK: { dot: "bg-accent-red", color: "text-accent-red", label: "High" },
  MODERATE_RISK: { dot: "bg-accent-amber", color: "text-accent-amber", label: "Moderate" },
  LOW_RISK: { dot: "bg-accent-green", color: "text-accent-green", label: "Low" },
};

const coverageColors: Record<string, string> = {
  COVERED: "bg-coverage-covered/15 text-coverage-covered",
  PRIOR_AUTH_REQUIRED: "bg-coverage-prior-auth/15 text-coverage-prior-auth",
  NOT_COVERED: "bg-coverage-not-covered/15 text-coverage-not-covered",
  UNKNOWN: "bg-coverage-unknown/15 text-coverage-unknown",
};

const tierColors: Record<number, string> = {
  1: "bg-tier-1/15 text-tier-1",
  2: "bg-tier-2/15 text-tier-2",
  3: "bg-tier-3/15 text-tier-3",
  4: "bg-tier-4/15 text-tier-4",
};

export function AdherenceRiskTable({ data }: AdherenceRiskTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Adherence Risk
        </h3>
        <p className="text-sm text-text-secondary">No adherence risk data</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Adherence Risk
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-text-secondary uppercase tracking-wider">
              <th className="pb-3 pr-4 font-medium">Risk</th>
              <th className="pb-3 pr-4 font-medium">Medication</th>
              <th className="pb-3 pr-4 text-right font-medium">Copay</th>
              <th className="pb-3 pr-4 font-medium">Tier</th>
              <th className="pb-3 font-medium">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {data.map((item) => {
              const risk = (riskConfig[item.risk_level] ?? riskConfig.LOW_RISK)!;
              const covClass = coverageColors[item.coverage_status] || coverageColors.UNKNOWN;
              const tClass = item.tier ? tierColors[item.tier] || "" : "";
              return (
                <tr key={item.medication} className="hover:bg-bg-primary/50">
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      <span className={["inline-block h-2.5 w-2.5 rounded-full", risk.dot].join(" ")} aria-hidden />
                      <span className={["font-semibold", risk.color].join(" ")}>{risk.label}</span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-text-primary">{item.medication}</td>
                  <td className="py-3 pr-4 text-right text-text-primary font-mono">${item.copay.toFixed(0)}</td>
                  <td className="py-3 pr-4">
                    {item.tier != null && (
                      <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tClass].join(" ")}>
                        Tier {item.tier}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", covClass].join(" ")}>
                      {item.coverage_status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
