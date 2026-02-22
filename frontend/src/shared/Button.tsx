import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
  "aria-label"?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-purple text-white border-0 hover:bg-accent-purple/90 hover:shadow-glow-purple",
  secondary:
    "bg-transparent text-accent-purple border border-accent-purple hover:bg-accent-purple/10",
  ghost:
    "bg-transparent text-text-secondary border-0 hover:bg-bg-elevated",
  danger:
    "bg-transparent text-accent-red border border-accent-red hover:bg-accent-red/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-1.5 px-3 text-sm",
  md: "py-2.5 px-5 text-body",
  lg: "py-3 px-6 text-body-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    children,
    className = "",
    "aria-label": ariaLabel,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const hasVisibleText = typeof children === "string" && children.length > 0;

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      aria-label={!hasVisibleText ? ariaLabel : undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && "opacity-50 cursor-not-allowed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        children
      )}
    </button>
  );
});
