import { useTranslation } from "../../i18n/useTranslation";

interface AvoidListProps {
  items: string[];
}

export function AvoidList({ items }: AvoidListProps) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <section aria-label={t.patientPackWhatToAvoid}>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">
        {t.patientPackWhatToAvoid}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg border-l-4 border-accent-red/40 bg-accent-red/5 p-3"
          >
            <span className="text-body">
              <span aria-hidden="true">🚫 </span>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
