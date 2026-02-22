import { useState } from "react";
import { Button } from "./Button";

export interface ReminderModalProps {
  open: boolean;
  title?: string;
  medicationName?: string;
  onSave: (time: string) => void;
  onCancel: () => void;
}

export function ReminderModal({
  open,
  title = "Set reminder",
  medicationName,
  onSave,
  onCancel,
}: ReminderModalProps) {
  const [time, setTime] = useState("09:00");

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
        className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-card p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reminder-modal-title" className="text-h3 text-text-heading">
          {title}
        </h2>
        {medicationName && (
          <p className="mt-1 text-sm text-text-secondary">{medicationName}</p>
        )}
        <div className="mt-4">
          <label
            htmlFor="reminder-time"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            Reminder time
          </label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave(time)}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
