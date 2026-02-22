import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  id: idProp,
  className = "",
  ...rest
}: SelectProps) {
  const id = idProp ?? `select-${Math.random().toString(36).slice(2, 9)}`;

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
      <select
        id={id}
        className={[
          "w-full rounded-lg border border-border-default bg-bg-input px-4 py-2.5 text-text-primary",
          "focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus",
          error && "border-accent-red focus:border-accent-red focus:ring-accent-red",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-accent-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
