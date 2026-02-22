import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  id?: string;
}

export function Input({
  label,
  error,
  icon,
  id: idProp,
  className = "",
  ...rest
}: InputProps) {
  const id = idProp ?? `input-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={[
            "w-full rounded-lg border bg-bg-input px-4 py-2.5 text-text-primary",
            "placeholder:text-text-secondary/60",
            "focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus",
            error && "border-accent-red focus:border-accent-red focus:ring-accent-red",
            icon && "pl-10",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-accent-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
