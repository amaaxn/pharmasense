import { useTranslation } from "../../i18n/useTranslation";

interface MedicationScheduleProps {
  schedule: string;
}

const timeIcons: [RegExp, string][] = [
  [/morning/i, "☀️"],
  [/afternoon/i, "🌤️"],
  [/evening|night|dinner/i, "🌙"],
  [/bedtime/i, "🛏️"],
];

function getTimeIcon(text: string): string | null {
  for (const [pattern, icon] of timeIcons) {
    if (pattern.test(text)) return icon;
  }
  return null;
}

export function MedicationSchedule({ schedule }: MedicationScheduleProps) {
  const { t } = useTranslation();
  const icon = getTimeIcon(schedule);

  return (
    <section aria-label={t.patientPackSchedule}>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">
        {t.patientPackSchedule}
      </h3>
      <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-4">
        <p className="text-body-lg text-text-primary">
          {icon && <span aria-hidden="true">{icon} </span>}
          {schedule}
        </p>
      </div>
    </section>
  );
}
