import { useTranslation } from "../i18n";

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a href="#main-content" className="skip-link">
      {t.skipLink}
    </a>
  );
}
