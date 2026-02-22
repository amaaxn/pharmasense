import { useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Button } from "../../shared";

export interface QrCodeModalProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onDrawingReceived?: () => void;
}

export function QrCodeModal({
  channelId,
  isOpen,
  onClose,
}: QrCodeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawUrl = `${window.location.origin}/draw/${channelId}`;

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Draw on Your Tablet"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border-default bg-bg-card p-8 shadow-modal">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-h2 text-text-heading">Draw on Your Tablet</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* QR Code */}
        <div className="mx-auto mb-6 flex justify-center rounded-lg bg-white p-4">
          <QRCode value={drawUrl} size={200} level="M" />
        </div>

        {/* Clickable URL */}
        <div className="mb-6 text-center">
          <a
            href={drawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-purple underline hover:text-accent-purple/80"
          >
            {drawUrl}
          </a>
        </div>

        {/* Waiting indicator */}
        <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent-purple" />
          Waiting for drawing...
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
