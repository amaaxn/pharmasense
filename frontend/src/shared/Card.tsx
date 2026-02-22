import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  selected?: boolean;
  blocked?: boolean;
}

export function Card({
  children,
  header,
  footer,
  hoverable = false,
  selected = false,
  blocked = false,
  className = "",
  ...rest
}: CardProps) {
  return (
    <div
      data-testid="card"
      className={[
        "rounded-xl border border-border-default bg-bg-card p-6 shadow-card",
        hoverable &&
          "cursor-pointer transition-all hover:border-accent-purple/30 hover:shadow-card-hover",
        selected && "border-accent-purple shadow-glow-purple",
        blocked &&
          "relative border-accent-red/50 opacity-75 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-xl before:bg-accent-red",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {header && (
        <div className="mb-4 border-b border-border-default pb-4">
          {header}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 border-t border-border-default pt-4">{footer}</div>
      )}
    </div>
  );
}
