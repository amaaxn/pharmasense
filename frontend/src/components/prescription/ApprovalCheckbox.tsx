import { useState, useCallback, useRef } from "react";
import { Button, ConfirmDialog, TextArea } from "../../shared";

export type CardActionState =
  | "pending"
  | "approved"
  | "rejected";

export interface ApprovalCheckboxProps {
  blocked: boolean;
  hasWarnings: boolean;
  onApprove: (comment: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  cardState: CardActionState;
  medicationName: string;
}

export function ApprovalCheckbox({
  blocked,
  hasWarnings,
  onApprove,
  onReject,
  cardState,
  medicationName,
}: ApprovalCheckboxProps) {
  const [checked, setChecked] = useState(false);
  const [comment, setComment] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const announcerRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((msg: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = msg;
    }
  }, []);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await onApprove(comment);
      announce(`${medicationName} approved.`);
    } catch {
      // error handled by parent
    } finally {
      setIsApproving(false);
    }
  }, [onApprove, comment, medicationName, announce]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await onReject(rejectReason);
      announce(`${medicationName} rejected.`);
      setShowRejectDialog(false);
    } catch {
      // error handled by parent
    } finally {
      setIsRejecting(false);
    }
  }, [onReject, rejectReason, medicationName, announce]);

  // Read-only states
  if (cardState === "approved" || cardState === "rejected") {
    return null;
  }

  const checkboxLabel = hasWarnings
    ? "I have reviewed the warnings and confirm approval"
    : "I have reviewed allergies and interaction flags";

  return (
    <>
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      />

      {/* Clinician comment (collapsible) */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-text-secondary hover:text-text-primary">
          Add a comment (optional)
        </summary>
        <div className="mt-2">
          <TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            className="text-sm"
            rows={2}
          />
        </div>
      </details>

      {/* Checkbox + buttons */}
      <div className="mt-4 space-y-3">
        {!blocked && (
          <label className="flex items-start gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              aria-required="true"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-default text-accent-purple focus:ring-border-focus"
            />
            <span>{checkboxLabel}</span>
          </label>
        )}

        <div className="flex items-center gap-3">
          {blocked ? (
            <span
              className="inline-flex items-center gap-1 text-sm text-accent-red/60 cursor-not-allowed"
              aria-disabled="true"
              aria-label="Cannot approve, prescription blocked due to safety check failure"
            >
              ⛔ Cannot Approve — Blocked
            </span>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={!checked}
              loading={isApproving}
              onClick={handleApprove}
            >
              Approve Prescription
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowRejectDialog(true)}
          >
            Reject
          </Button>
        </div>
      </div>

      {/* Reject dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        title="Reject Prescription"
        body={
          <div className="space-y-3">
            <p>
              Are you sure you want to reject{" "}
              <strong>{medicationName}</strong>? Please provide a reason.
            </p>
            <TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="text-sm"
              rows={3}
            />
          </div>
        }
        confirmLabel={isRejecting ? "Rejecting..." : "Reject"}
        variant="danger"
        onConfirm={handleRejectConfirm}
        onCancel={() => {
          setShowRejectDialog(false);
          setRejectReason("");
        }}
      />
    </>
  );
}
