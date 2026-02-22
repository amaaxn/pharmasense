import type { TextareaHTMLAttributes } from "react";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  id?: string;
}

export function TextArea({
  label,
  error,
  id: idProp,
  className = "",
  ...rest
}: TextAreaProps) {
  const id = idProp ?? `textarea-${Math.random().toString(36).slice(2, 9)}`;

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
      <textarea
        id={id}
        className={[
          "w-full rounded-lg border border-border-default bg-bg-input px-4 py-2.5 text-text-primary",
          "placeholder:text-text-secondary/60",
          "focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus",
          error && "border-accent-red focus:border-accent-red focus:ring-accent-red",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-accent-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
