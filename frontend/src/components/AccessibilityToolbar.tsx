import { useState } from "react";
import { useUiStore } from "../stores/uiStore";
import { useTranslation } from "../i18n";

export function AccessibilityToolbar() {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const largeType = useUiStore((s) => s.largeType);
  const dyslexiaFont = useUiStore((s) => s.dyslexiaFont);
  const highContrast = useUiStore((s) => s.highContrast);
  const language = useUiStore((s) => s.language);

  const toggleLargeType = useUiStore((s) => s.toggleLargeType);
  const toggleDyslexiaFont = useUiStore((s) => s.toggleDyslexiaFont);
  const toggleHighContrast = useUiStore((s) => s.toggleHighContrast);
  const toggleLanguage = useUiStore((s) => s.toggleLanguage);

  const buttonBase =
    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors";
  const activeStyle =
    "bg-accent-purple text-white shadow-glow-purple";
  const inactiveStyle =
    "bg-bg-elevated text-text-secondary hover:bg-bg-card border border-border-default";

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end gap-2"
      role="toolbar"
      aria-label={t.accessibilitySettings}
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple text-white shadow-glow-purple text-lg ${
          expanded ? "ring-2 ring-border-focus ring-offset-2 ring-offset-bg-primary" : ""
        }`}
        aria-label={t.accessibilitySettings}
        aria-expanded={expanded}
      >
        ⚙
      </button>

      {expanded && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={toggleLargeType}
            className={`${buttonBase} ${largeType ? activeStyle : inactiveStyle}`}
            aria-label={t.toggleFontSize}
            aria-pressed={largeType}
          >
            Aa+
          </button>

          <button
            type="button"
            onClick={toggleDyslexiaFont}
            className={`${buttonBase} ${dyslexiaFont ? activeStyle : inactiveStyle}`}
            aria-label={t.toggleDyslexiaFont}
            aria-pressed={dyslexiaFont}
          >
            Dy
          </button>

          <button
            type="button"
            onClick={toggleHighContrast}
            className={`${buttonBase} ${highContrast ? activeStyle : inactiveStyle}`}
            aria-label={t.toggleHighContrast}
            aria-pressed={highContrast}
          >
            ◐
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className={`${buttonBase} ${inactiveStyle}`}
            aria-label={t.toggleLanguage}
          >
            {language.toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
}
