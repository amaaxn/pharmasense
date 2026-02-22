import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";

export type BadgeVariant =
  | "safety-pass"
  | "safety-fail"
  | "safety-warn"
  | "status-blocked"
  | "status-approved"
  | "ai";

export interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  safetyCheckDetails?: { checkType: string; passed: boolean; message: string }[];
  className?: string;
}

const variantConfig: Record<
  BadgeVariant,
  { bg: string; text: string; icon: string }
> = {
  "safety-pass": {
    bg: "bg-ps-green/12 ring-1 ring-ps-green/20",
    text: "text-ps-green",
    icon: "✓",
  },
  "safety-fail": {
    bg: "bg-ps-red/12 ring-1 ring-ps-red/20",
    text: "text-ps-red",
    icon: "✕",
  },
  "safety-warn": {
    bg: "bg-ps-amber/12 ring-1 ring-ps-amber/20",
    text: "text-ps-amber",
    icon: "⚠",
  },
  "status-blocked": {
    bg: "bg-ps-red/12 ring-1 ring-ps-red/20",
    text: "text-ps-red",
    icon: "🚫",
  },
  "status-approved": {
    bg: "bg-ps-green/12 ring-1 ring-ps-green/20",
    text: "text-ps-green",
    icon: "✓",
  },
  ai: {
    bg: "bg-primary/12 ring-1 ring-primary/20",
    text: "text-primary",
    icon: "✦",
  },
};

export function Badge({
  variant,
  children,
  safetyCheckDetails,
  className = "",
}: BadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const config = variantConfig[variant];
  const isSafetyPassWithDetails =
    variant === "safety-pass" && safetyCheckDetails && safetyCheckDetails.length > 0;

  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  return (
    <span className="relative inline-block" ref={ref}>
      <span
        role={isSafetyPassWithDetails ? "button" : undefined}
        tabIndex={isSafetyPassWithDetails ? 0 : undefined}
        onClick={isSafetyPassWithDetails ? () => setPopoverOpen((o) => !o) : undefined}
        onKeyDown={
          isSafetyPassWithDetails
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPopoverOpen((o) => !o);
                }
              }
            : undefined
        }
        aria-expanded={isSafetyPassWithDetails ? popoverOpen : undefined}
        aria-haspopup={isSafetyPassWithDetails ? "dialog" : undefined}
        className={[
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
          config.bg,
          config.text,
          isSafetyPassWithDetails && "cursor-pointer",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span aria-hidden>{config.icon}</span>
        {children}
      </span>

      {isSafetyPassWithDetails && popoverOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Safety check details"
          className="absolute left-0 top-full z-50 mt-2 min-w-[220px] glass-card rounded-xl p-3 shadow-modal"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Safety checks
          </p>
          <ul className="space-y-1.5">
            {safetyCheckDetails.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className={item.passed ? "text-ps-green" : "text-ps-red"} aria-hidden>
                  {item.passed ? "✓" : "✕"}
                </span>
                <span>
                  <strong>{item.checkType}:</strong> {item.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
