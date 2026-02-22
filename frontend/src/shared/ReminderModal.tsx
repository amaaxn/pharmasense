import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { Button } from "./Button";

export interface ReminderModalProps {
  open: boolean;
  medicationName?: string;
  frequency?: string;
  onSave: (times: string[]) => void;
  onCancel: () => void;
}

function getSmartDefaults(frequency: string | undefined): string[] {
  const f = (frequency ?? "").toLowerCase();
  if (/twice\s*daily/i.test(f)) return ["08:00", "18:00"];
  if (/three\s*times?\s*daily/i.test(f)) return ["08:00", "13:00", "18:00"];
  if (/bedtime/i.test(f)) return ["21:00"];
  if (/as\s*needed/i.test(f)) return [];
  if (/daily|once/i.test(f)) return ["08:00"];
  return ["08:00"];
}

export function ReminderModal({
  open,
  medicationName,
  frequency,
  onSave,
  onCancel,
}: ReminderModalProps) {
  const { t } = useTranslation();
  const [times, setTimes] = useState<string[]>(() => getSmartDefaults(frequency));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setTimes(getSmartDefaults(frequency));
      setSaved(false);
    }
  }, [open, frequency]);

  const handleTimeChange = useCallback((idx: number, value: string) => {
    setTimes((prev) => prev.map((t, i) => (i === idx ? value : t)));
  }, []);

  const handleAddTime = useCallback(() => {
    setTimes((prev) => [...prev, "12:00"]);
  }, []);

  const handleRemoveTime = useCallback((idx: number) => {
    setTimes((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    onSave(times);
    setSaved(true);
    setTimeout(onCancel, 1500);
  }, [times, onSave, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {saved ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="text-4xl">✅</span>
            <p className="text-lg font-semibold text-accent-green">
              {t.reminderSaved}
            </p>
          </div>
        ) : (
          <>
            <h2
              id="reminder-modal-title"
              className="text-lg font-bold text-text-primary"
            >
              {t.reminderTitle}
            </h2>
            {medicationName && (
              <p className="mt-1 text-sm text-text-secondary">
                {medicationName}
              </p>
            )}
            {frequency && (
              <p className="mt-0.5 text-xs text-text-secondary italic">
                {frequency}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {times.map((time, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <label
                    htmlFor={`reminder-time-${idx}`}
                    className="sr-only"
                  >
                    {t.reminderTime} {idx + 1}
                  </label>
                  <input
                    id={`reminder-time-${idx}`}
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="text-text-secondary hover:text-accent-red"
                      aria-label="Remove time"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddTime}
                className="text-sm text-brand-primary hover:underline"
              >
                + Add another time
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onCancel}>
                {t.reminderCancel}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={times.length === 0}
              >
                {t.reminderSave}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
