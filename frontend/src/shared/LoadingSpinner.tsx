import type { HTMLAttributes } from "react";

export interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  fullPage?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-2",
};

export function LoadingSpinner({
  fullPage = false,
  size = "md",
  className = "",
  ...rest
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={[
        "animate-spin rounded-full border-current border-t-transparent",
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label="Loading"
      {...rest}
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80">
        {spinner}
      </div>
    );
  }

  return spinner;
}
