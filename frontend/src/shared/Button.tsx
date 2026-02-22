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
    "bg-gradient-to-r from-ps-burgundy to-primary text-white border-0 hover:opacity-90 shadow-glow-brand",
  secondary:
    "glass text-foreground border border-border/50 hover:bg-secondary/60",
  ghost:
    "bg-transparent text-muted-foreground border-0 hover:bg-secondary hover:text-foreground",
  danger:
    "bg-transparent text-destructive border border-destructive/40 hover:bg-destructive/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-1.5 px-3 text-sm rounded-lg",
  md: "py-2.5 px-5 text-sm rounded-xl",
  lg: "py-3 px-6 text-base rounded-xl",
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
        "inline-flex items-center justify-center gap-2 font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
