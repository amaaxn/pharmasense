import type { HTMLAttributes } from "react";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  /** Fallback initial when no image (e.g. first letter of name) */
  fallback: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-body",
  lg: "h-12 w-12 text-body-lg",
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className = "",
  ...rest
}: AvatarProps) {
  const initial = fallback.charAt(0).toUpperCase();

  return (
    <div
      className={[
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated font-semibold text-text-primary",
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? `Avatar for ${fallback}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </div>
  );
}
