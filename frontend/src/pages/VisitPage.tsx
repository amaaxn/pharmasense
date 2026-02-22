import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useVisitStore } from "../stores/visitStore";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../i18n";
import { PageTransition } from "../components/PageTransition";
import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  ErrorBanner,
  ReminderModal,
} from "../shared";
import {
  listPrescriptionsByVisit,
  getReceipt,
  type PrescriptionSummary,
  type PrescriptionReceipt,
} from "../api/prescriptions";
import { downloadVisitPdf } from "../api/visits";

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VisitPage() {
  const { id: visitId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const visitStore = useVisitStore();
  const visit = visitStore.currentVisit;

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>(
    [],
  );
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState<string | null>(
    null,
  );
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDrug, setReminderDrug] = useState<string | undefined>();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PrescriptionReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);

  const announcerRef = useRef<HTMLDivElement>(null);
  const announce = useCallback((msg: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = msg;
    }
  }, []);

  useEffect(() => {
    if (visitId) {
      visitStore.fetchVisit(visitId);
    }
  }, [visitId, visitStore]);

  useEffect(() => {
    if (!visitId) return;
    setPrescriptionsLoading(true);
    listPrescriptionsByVisit(visitId)
      .then((data) => {
        setPrescriptions(data);
        setPrescriptionsError(null);
      })
      .catch(() => {
        setPrescriptionsError("Failed to load prescriptions.");
      })
      .finally(() => setPrescriptionsLoading(false));
  }, [visitId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!visitId) return;
    setIsDownloading(true);
    try {
      const blob = await downloadVisitPdf(visitId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visit-${visitId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      announce("PDF downloaded.");
    } catch {
      announce("Failed to download PDF.");
    } finally {
      setIsDownloading(false);
    }
  }, [visitId, announce]);

  const handleOpenReminder = useCallback((drugName?: string) => {
    setReminderDrug(drugName);
    setReminderOpen(true);
  }, []);

  const handleSaveReminder = useCallback(
    (time: string) => {
      announce(`Reminder set for ${time}`);
      setReminderOpen(false);
    },
    [announce],
  );

  const handleViewReceipt = useCallback(
    async (prescriptionId: string) => {
      setReceiptLoading(prescriptionId);
      try {
        const receipt = await getReceipt(prescriptionId);
        setActiveReceipt(receipt);
        announce("Receipt loaded.");
      } catch {
        announce("Failed to load receipt.");
      } finally {
        setReceiptLoading(null);
      }
    },
    [announce],
  );

  const isPatient = user?.role === "patient";
  const isClinician = user?.role === "clinician";

  const totalCopay = prescriptions.reduce(
    (sum, p) => sum + (p.estimatedCopay ?? 0),
    0,
  );

  if (visitStore.isLoading && !visit) {
    return (
      <PageTransition>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  if (visitStore.error) {
    return (
      <PageTransition>
        <div className="p-4 lg:p-8">
          <ErrorBanner message={visitStore.error} />
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => visitId && visitStore.fetchVisit(visitId)}
            >
              Retry
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-4 lg:p-8">
        <div
          ref={announcerRef}
          role="status"
          aria-live="polite"
          className="sr-only"
        />

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-h1 text-text-heading">
              {t.visitDetailTitle}
            </h1>
            {visit && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span>
                  {t.visitDetailDate}: {formatDate(visit.createdAt)}
                </span>
                {visit.patientName && (
                  <span>
                    {t.visitDetailPatient}: {visit.patientName}
                  </span>
                )}
                <Badge
                  variant={
                    visit.status === "completed"
                      ? "status-approved"
                      : "ai"
                  }
                >
                  {visit.status === "completed"
                    ? t.visitCompleted
                    : t.visitInProgress}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/visit/${visitId}/chat`}>
              <Button variant="secondary" size="sm">
                {t.visitDetailChat}
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPdf}
              loading={isDownloading}
            >
              {t.visitDetailDownloadPdf}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — Visit info */}
          <div className="lg:col-span-1">
            <Card
              header={
                <h2 className="text-h3 font-semibold text-text-heading">
                  {t.visitNotes}
                </h2>
              }
            >
              {visit?.notes ? (
                <p className="whitespace-pre-wrap font-mono text-sm text-text-primary">
                  {visit.notes}
                </p>
              ) : (
                <p className="text-sm text-text-secondary">No notes.</p>
              )}
            </Card>

            {visit?.extractedData && (
              <Card
                className="mt-4"
                header={
                  <h2 className="text-h3 font-semibold text-text-heading">
                    Extracted Data
                  </h2>
                }
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-text-secondary">
                      {t.visitDiagnosis}
                    </p>
                    <p className="text-text-primary">
                      {visit.extractedData.diagnosis || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-text-secondary">
                      {t.visitAllergies}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {visit.extractedData.allergies.length > 0
                        ? visit.extractedData.allergies.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-accent-red/10 px-2 py-0.5 text-xs text-accent-red"
                            >
                              {a}
                            </span>
                          ))
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-text-secondary">
                      {t.visitMedications}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {visit.extractedData.currentMedications.length > 0
                        ? visit.extractedData.currentMedications.map((m) => (
                            <span
                              key={m}
                              className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-primary"
                            >
                              {m}
                            </span>
                          ))
                        : "—"}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right column — Prescriptions */}
          <div className="lg:col-span-2">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <h2 className="text-h3 font-semibold text-text-heading">
                    {t.visitDetailPrescriptions}
                  </h2>
                  {prescriptions.length > 0 && (
                    <span className="text-sm text-text-secondary">
                      Total copay: {formatCurrency(totalCopay)}
                    </span>
                  )}
                </div>
              }
            >
              {prescriptionsLoading && (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              )}

              {prescriptionsError && (
                <ErrorBanner message={prescriptionsError} />
              )}

              {!prescriptionsLoading &&
                !prescriptionsError &&
                prescriptions.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-secondary">
                    {t.visitDetailNoPrescriptions}
                  </p>
                )}

              {prescriptions.length > 0 && (
                <div className="space-y-4">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.prescriptionId}
                      className="flex items-center justify-between rounded-lg border border-border-default bg-bg-elevated p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono font-semibold text-text-heading">
                            {rx.drugName}
                          </h3>
                          <Badge
                            variant={
                              rx.status === "approved"
                                ? "status-approved"
                                : rx.status === "rejected"
                                  ? "safety-fail"
                                  : "ai"
                            }
                          >
                            {rx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">
                          {rx.genericName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-bg-card px-2.5 py-0.5 font-mono text-text-primary">
                            {rx.dosage}
                          </span>
                          <span className="rounded-full bg-bg-card px-2.5 py-0.5 font-mono text-text-primary">
                            {rx.frequency}
                          </span>
                          <span className="rounded-full bg-bg-card px-2.5 py-0.5 font-mono text-text-primary">
                            {rx.duration || "ongoing"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                          {rx.isCovered != null && (
                            <span>
                              {rx.isCovered ? "✓ Covered" : "✕ Not Covered"}
                            </span>
                          )}
                          {rx.tier != null && (
                            <span>Tier {rx.tier}</span>
                          )}
                          {rx.estimatedCopay != null && (
                            <span>
                              Copay: {formatCurrency(rx.estimatedCopay)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex flex-col gap-2">
                        {rx.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(rx.prescriptionId)}
                            disabled={receiptLoading === rx.prescriptionId}
                            className="text-left text-xs text-accent-green hover:underline disabled:opacity-50"
                          >
                            {receiptLoading === rx.prescriptionId
                              ? "Loading…"
                              : t.visitDetailViewReceipt}
                          </button>
                        )}
                        {(isClinician || isPatient) && (
                          <Link
                            to={`/visit/${visitId}/chat`}
                            className="text-xs text-accent-cyan hover:underline"
                          >
                            {t.visitDetailChat}
                          </Link>
                        )}
                        {isPatient && (
                          <button
                            type="button"
                            onClick={() => handleOpenReminder(rx.drugName)}
                            className="text-left text-xs text-accent-purple hover:underline"
                          >
                            {t.visitDetailReminder}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Receipt overlay */}
        {activeReceipt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveReceipt(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t.prescriptionReceipt}
          >
            <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-bg-card p-6 shadow-modal">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-h2 text-text-heading">
                  {t.prescriptionReceipt}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="rounded p-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  aria-label={t.close}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>{t.visitDetailPatient}: {activeReceipt.patientName}</span>
                  <span>{t.visitDetailClinician}: {activeReceipt.clinicianName}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  Issued: {formatDate(activeReceipt.issuedAt)}
                </div>

                {activeReceipt.drugs.map((drug, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border-default bg-bg-elevated p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-text-heading">
                        {drug.drugName}
                      </span>
                      {drug.isCovered && (
                        <Badge variant="safety-pass">Covered</Badge>
                      )}
                    </div>
                    <p className="text-text-secondary">{drug.genericName}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-bg-card px-2 py-0.5 font-mono">
                        {drug.dosage}
                      </span>
                      <span className="rounded-full bg-bg-card px-2 py-0.5 font-mono">
                        {drug.frequency}
                      </span>
                      <span className="rounded-full bg-bg-card px-2 py-0.5 font-mono">
                        {drug.duration || "ongoing"}
                      </span>
                    </div>
                    {drug.copay != null && (
                      <p className="mt-1 text-xs text-text-secondary">
                        {t.copay}: {formatCurrency(drug.copay)}
                      </p>
                    )}
                  </div>
                ))}

                <div className="rounded-lg border border-border-default bg-bg-elevated p-3">
                  <h3 className="mb-1 text-xs font-semibold uppercase text-text-secondary">
                    {t.coverageStatus}
                  </h3>
                  <p className="text-text-primary">
                    {activeReceipt.coverage.planName} — {activeReceipt.coverage.memberId}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Total {t.copay}: {formatCurrency(activeReceipt.coverage.totalCopay)}
                    {" · "}
                    {activeReceipt.coverage.itemsCovered} covered
                    {activeReceipt.coverage.itemsNotCovered > 0 &&
                      ` · ${activeReceipt.coverage.itemsNotCovered} not covered`}
                  </p>
                </div>

                <div className="rounded-lg border border-border-default bg-bg-elevated p-3">
                  <h3 className="mb-1 text-xs font-semibold uppercase text-text-secondary">
                    {t.safetyChecks}
                  </h3>
                  {activeReceipt.safety.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className={
                          check.passed
                            ? "text-accent-green"
                            : "text-accent-red"
                        }
                      >
                        {check.passed ? "✓" : "✕"}
                      </span>
                      <span className="text-text-primary">
                        {check.checkType}: {check.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveReceipt(null)}
                >
                  {t.close}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reminder modal (patient only) */}
        <ReminderModal
          open={reminderOpen}
          medicationName={reminderDrug}
          onSave={handleSaveReminder}
          onCancel={() => setReminderOpen(false)}
        />
      </div>
    </PageTransition>
  );
}
