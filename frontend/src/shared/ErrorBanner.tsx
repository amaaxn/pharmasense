import type { ReactNode } from "react";

export interface ErrorBannerProps {
  message: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  message,
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={[
        "flex items-center justify-between gap-4 rounded-lg border border-accent-red/50 bg-accent-red/10 px-4 py-3 text-accent-red",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 hover:bg-accent-red/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          ✕
        </button>
      )}
    </div>
  );
}
