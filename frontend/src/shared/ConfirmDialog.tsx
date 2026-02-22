import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import type { ReactNode } from "react";
import { useReducedMotion } from "../utils/useReducedMotion";
import { scaleIn, ANIMATION_DURATION } from "../utils/animations";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      const focusTarget = variant === "danger" ? cancelRef : confirmRef;
      focusTarget.current?.focus();
    }
  }, [open, variant]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={reducedMotion ? undefined : scaleIn}
        transition={
          reducedMotion ? { duration: 0 } : { duration: ANIMATION_DURATION.modalOpen }
        }
        className="w-full max-w-md rounded-2xl border border-border-default bg-bg-card p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-h3 text-text-heading"
        >
          {title}
        </h2>
        <div className="mt-3 text-text-secondary">{body}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            ref={cancelRef}
            variant="ghost"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
