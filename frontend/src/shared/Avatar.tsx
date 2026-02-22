import type { HTMLAttributes } from "react";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
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
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/25 to-ps-plum/25 font-semibold text-primary ring-1 ring-primary/20",
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
