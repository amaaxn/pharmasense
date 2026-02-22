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
        "flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive",
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
          className="shrink-0 rounded-lg p-1 hover:bg-destructive/20"
        >
          ✕
        </button>
      )}
    </div>
  );
}
