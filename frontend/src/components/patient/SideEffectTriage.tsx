import { useTranslation } from "../../i18n/useTranslation";

interface SideEffectTriageProps {
  normal: string[];
  seekHelp: string[];
}

export function SideEffectTriage({ normal, seekHelp }: SideEffectTriageProps) {
  const { t } = useTranslation();

  if (normal.length === 0 && seekHelp.length === 0) return null;

  return (
    <section aria-label={t.patientPackSideEffects}>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">
        {t.patientPackSideEffects}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Normal side effects */}
        <div className="rounded-xl border-l-4 border-accent-green bg-accent-green/5 p-4">
          <h4 className="mb-2 font-medium text-accent-green">
            😌 {t.patientPackSideEffectsNormal}
          </h4>
          <ul className="space-y-1.5">
            {normal.map((item) => (
              <li key={item} className="text-body text-text-primary">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Seek help */}
        <div className="rounded-xl border-l-4 border-accent-red bg-accent-red/5 p-4">
          <h4 className="mb-2 font-medium text-accent-red">
            🚨 {t.patientPackSideEffectsSeekHelp}
          </h4>
          <ul className="space-y-1.5">
            {seekHelp.map((item) => (
              <li key={item} className="text-body text-text-primary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
