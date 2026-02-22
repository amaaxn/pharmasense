import { useTranslation } from "../../i18n/useTranslation";
import type { ReceiptAlternative } from "../../types/models";
import { formatCurrency } from "../../utils/formatters";

interface SavingsCardProps {
  currentCopay: number;
  alternatives: ReceiptAlternative[];
  priorAuthRequired: boolean;
  priorAuthReason?: string;
}

export function SavingsCard({
  currentCopay,
  alternatives,
  priorAuthRequired,
  priorAuthReason,
}: SavingsCardProps) {
  const { t } = useTranslation();

  const cheapest = alternatives.reduce<number | null>((min, alt) => {
    if (alt.copay == null) return min;
    return min == null ? alt.copay : Math.min(min, alt.copay);
  }, null);

  const showSavings =
    currentCopay > 0 &&
    cheapest != null &&
    cheapest < currentCopay &&
    currentCopay - cheapest >= 5;

  const monthlySavings = showSavings ? currentCopay - cheapest! : 0;
  const annualSavings = monthlySavings * 12;

  return (
    <div className="space-y-3">
      {showSavings && (
        <div className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-4">
          <p className="text-sm font-medium text-accent-green">
            💰 {t.coverageSavings}{" "}
            <span className="text-lg font-bold">
              {formatCurrency(monthlySavings)}
            </span>{" "}
            {t.coveragePerMonth}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            ≈ {formatCurrency(annualSavings)} {t.coveragePerYear}
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 text-sm">
        {priorAuthRequired ? (
          <>
            <span className="text-accent-amber">⚠</span>
            <div>
              <span className="font-medium text-accent-amber">
                {t.priorAuthRequired}
              </span>
              {priorAuthReason && (
                <p className="mt-0.5 text-xs text-text-secondary">
                  {priorAuthReason}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="text-accent-green">✓</span>
            <span className="font-medium text-accent-green">
              {t.priorAuthNotRequired}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
