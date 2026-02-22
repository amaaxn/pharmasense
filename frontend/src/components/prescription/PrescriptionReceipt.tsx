import { useCallback, useState } from "react";
import { downloadPrescriptionPdf } from "../../api/prescriptions";
import { useTranslation } from "../../i18n/useTranslation";
import type {
  PrescriptionReceipt as ReceiptType,
  PatientPack as PatientPackType,
} from "../../types/models";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { PatientPack } from "../patient/PatientPack";
import { CoverageBar } from "./CoverageBar";
import { SavingsCard } from "./SavingsCard";

interface PrescriptionReceiptProps {
  receipt: ReceiptType;
  patientPack: PatientPackType | null;
}

const coverageStatusBadge: Record<string, string> = {
  COVERED: "bg-accent-green/10 text-accent-green",
  NOT_COVERED: "bg-accent-red/10 text-accent-red",
  PRIOR_AUTH_REQUIRED: "bg-accent-amber/10 text-accent-amber",
  UNKNOWN: "bg-bg-elevated text-text-secondary",
};

export function PrescriptionReceipt({
  receipt,
  patientPack,
}: PrescriptionReceiptProps) {
  const { t } = useTranslation();
  const [showPatientPack, setShowPatientPack] = useState(false);
  const [reasoningTab, setReasoningTab] = useState<"clinician" | "patient">(
    "clinician",
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await downloadPrescriptionPdf(receipt.prescriptionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription_${receipt.prescriptionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [receipt.prescriptionId]);

  const drug = receipt.drugs[0];

  return (
    <article className="space-y-6 rounded-2xl border border-border bg-bg-surface p-6">
      {/* Medication header */}
      <header>
        <h2 className="text-xl font-bold text-text-primary">
          {t.receiptMedicationHeader}
        </h2>
        {drug && (
          <div className="mt-2 space-y-1">
            <p className="text-lg font-semibold text-brand-primary">
              {drug.drugName}{" "}
              <span className="text-sm font-normal text-text-secondary">
                ({drug.genericName})
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {drug.dosage} · {drug.frequency} · {drug.duration} · {drug.route}
            </p>
          </div>
        )}
        <p className="mt-2 text-xs text-text-secondary">
          {t.receiptApprovedBy} {receipt.clinicianName} ·{" "}
          {t.receiptIssuedOn} {formatDate(receipt.issuedAt)}
        </p>
      </header>

      {/* Coverage */}
      {drug && (
        <section aria-label={t.receiptCoverage}>
          <h3 className="mb-2 text-lg font-semibold text-text-primary">
            {t.receiptCoverage}
          </h3>
          <CoverageBar
            coverageStatus={drug.isCovered ? "COVERED" : "NOT_COVERED"}
            tier={drug.tier}
            copay={drug.copay}
            requiresPriorAuth={drug.requiresPriorAuth}
          />
          {receipt.alternatives.length > 0 && drug.copay != null && (
            <div className="mt-3">
              <SavingsCard
                currentCopay={drug.copay}
                alternatives={receipt.alternatives}
                priorAuthRequired={receipt.coverage.priorAuthRequired.length > 0}
              />
            </div>
          )}
        </section>
      )}

      {/* Safety checks */}
      <section aria-label={t.receiptSafetyChecks}>
        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          {t.receiptSafetyChecks}
        </h3>
        <ul className="space-y-1.5">
          {receipt.safety.checks.map((check) => (
            <li
              key={check.checkType}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={
                  check.passed ? "text-accent-green" : "text-accent-red"
                }
              >
                {check.passed ? "✓" : "✕"}
              </span>
              <span className="text-text-primary">{check.message}</span>
              {check.severity && (
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs text-text-secondary">
                  {check.severity}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Alternatives */}
      <section aria-label={t.receiptAlternatives}>
        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          {t.receiptAlternatives}
        </h3>
        {receipt.alternatives.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            {t.receiptNoAlternatives}
          </p>
        ) : (
          <div className="space-y-2">
            {receipt.alternatives.map((alt) => (
              <div
                key={alt.drugName}
                className="flex flex-wrap items-center gap-3 rounded-lg bg-bg-elevated p-3"
              >
                <span className="font-medium text-text-primary">
                  {alt.drugName}
                </span>
                {alt.copay != null && (
                  <span className="text-sm font-mono text-text-primary">
                    {formatCurrency(alt.copay)}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    coverageStatusBadge[alt.coverageStatus] ??
                    coverageStatusBadge.UNKNOWN
                  }`}
                >
                  {alt.coverageStatus}
                </span>
                <span className="text-xs text-text-secondary">{alt.reason}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reasoning */}
      {receipt.reasoning && (
        <section aria-label={t.receiptReasoning}>
          <h3 className="mb-2 text-lg font-semibold text-text-primary">
            {t.receiptReasoning}
          </h3>
          <div className="flex gap-2 border-b border-border pb-1">
            <button
              type="button"
              onClick={() => setReasoningTab("clinician")}
              className={`px-3 py-1 text-sm font-medium ${
                reasoningTab === "clinician"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.receiptForClinician}
            </button>
            <button
              type="button"
              onClick={() => setReasoningTab("patient")}
              className={`px-3 py-1 text-sm font-medium ${
                reasoningTab === "patient"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.receiptForPatient}
            </button>
          </div>
          <div className="mt-3">
            {reasoningTab === "clinician" ? (
              <p className="text-sm text-text-primary">
                {receipt.reasoning.clinicianSummary}
              </p>
            ) : (
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20">
                <p className="text-body-lg text-text-primary">
                  {receipt.reasoning.patientExplanation}
                </p>
                <p className="mt-2 text-xs text-text-secondary italic">
                  AI-generated explanation
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowPatientPack((v) => !v)}
          className="rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated"
        >
          {showPatientPack ? t.receiptHidePatientPack : t.receiptShowPatientPack}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {isDownloadingPdf ? t.receiptPdfDownloading : t.receiptDownloadPdf}
        </button>
      </div>

      {/* Inline patient pack */}
      {showPatientPack && patientPack && (
        <PatientPack
          pack={patientPack}
          prescriptionId={receipt.prescriptionId}
        />
      )}
    </article>
  );
}
