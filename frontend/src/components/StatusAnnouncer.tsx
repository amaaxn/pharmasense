interface StatusAnnouncerProps {
  message: string;
  politeness?: "polite" | "assertive";
}

export function StatusAnnouncer({
  message,
  politeness = "polite",
}: StatusAnnouncerProps) {
  return (
    <div className="sr-only" aria-live={politeness} aria-atomic="true">
      {message}
    </div>
  );
}
