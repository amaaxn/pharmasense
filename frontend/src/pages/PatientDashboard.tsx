import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useTranslation } from "../i18n";
import * as patientsApi from "../api/patients";
import * as visitsApi from "../api/visits";
import * as prescriptionsApi from "../api/prescriptions";
import * as voiceApi from "../api/voice";
import { processOcr } from "../api/ocr";
import { CoverageBar } from "../components/prescription/CoverageBar";
import { PrescriptionReceipt } from "../components/prescription/PrescriptionReceipt";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { ReminderModal } from "../shared/ReminderModal";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { Patient } from "../api/patients";
import type {
  PrescriptionSummary,
  PrescriptionReceipt as ReceiptType,
  PatientPack,
} from "../api/prescriptions";
import type { Visit } from "../api/visits";

// ═══════════════════════════════════════════════════════════
// §7 Patient Profile Page
// ═══════════════════════════════════════════════════════════

function PatientProfilePage() {
  const { t, lang } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setLanguage = useUiStore((s) => s.setLanguage);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Allergy management
  const [newAllergy, setNewAllergy] = useState("");
  const [allergyToRemove, setAllergyToRemove] = useState<string | null>(null);

  // Insurance OCR
  const [insuranceFields, setInsuranceFields] = useState<{
    provider: string;
    policyNumber: string;
    groupNumber: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showInsuranceReview, setShowInsuranceReview] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    patientsApi
      .getPatient(user.userId)
      .then(setPatient)
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleAddAllergy = useCallback(async () => {
    if (!patient || !newAllergy.trim()) return;
    const updated = await patientsApi.updatePatient(patient.patientId, {
      allergies: [...patient.allergies, newAllergy.trim()],
    });
    setPatient(updated);
    setNewAllergy("");
  }, [patient, newAllergy]);

  const handleRemoveAllergy = useCallback(async () => {
    if (!patient || !allergyToRemove) return;
    const updated = await patientsApi.updatePatient(patient.patientId, {
      allergies: patient.allergies.filter((a) => a !== allergyToRemove),
    });
    setPatient(updated);
    setAllergyToRemove(null);
  }, [patient, allergyToRemove]);

  const handleInsuranceUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsScanning(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] || result);
          };
          reader.readAsDataURL(file);
        });
        const resp = await processOcr({
          base64_data: base64,
          mime_type: file.type || "image/jpeg",
          source_type: "INSURANCE_CARD",
        });
        const r = resp.result as Record<string, string>;
        setInsuranceFields({
          provider: r.provider || r.insurance_provider || "",
          policyNumber: r.policy_number || r.policyNumber || "",
          groupNumber: r.group_number || r.groupNumber || "",
        });
        setShowInsuranceReview(true);
      } catch {
        setError("Failed to scan insurance card");
      } finally {
        setIsScanning(false);
      }
    },
    [],
  );

  const handleSaveInsurance = useCallback(async () => {
    if (!patient || !insuranceFields) return;
    const updated = await patientsApi.updatePatient(patient.patientId, {
      insurancePlan: `${insuranceFields.provider} - ${insuranceFields.policyNumber}`,
    });
    setPatient(updated);
    setShowInsuranceReview(false);
    setInsuranceFields(null);
  }, [patient, insuranceFields]);

  const handleLanguageChange = useCallback(
    (newLang: "en" | "es") => {
      setLanguage(newLang);
    },
    [setLanguage],
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onDismiss={() => setError(null)} />;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-text-primary">
        {t.patientProfileTitle}
      </h1>

      {/* Basic info */}
      {patient && (
        <section className="rounded-2xl border border-border bg-bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            {t.patientName}
          </h2>
          <p className="mt-1 text-text-primary">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="text-sm text-text-secondary">{patient.email}</p>
          <p className="text-sm text-text-secondary">
            {t.dateOfBirth}: {patient.dateOfBirth}
          </p>
        </section>
      )}

      {/* Insurance section */}
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {t.patientInsuranceTitle}
        </h2>
        {patient?.insurancePlan && (
          <p className="mb-3 text-text-primary">
            {t.insurancePlan}: {patient.insurancePlan}
          </p>
        )}

        {showInsuranceReview && insuranceFields ? (
          <div className="space-y-3 rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4">
            <p className="text-sm font-medium text-text-secondary">
              {t.patientInsuranceReview}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs text-text-secondary">
                  {t.patientInsuranceProvider}
                </label>
                <input
                  type="text"
                  value={insuranceFields.provider}
                  onChange={(e) =>
                    setInsuranceFields((f) =>
                      f ? { ...f, provider: e.target.value } : f,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary">
                  {t.patientInsurancePolicyNumber}
                </label>
                <input
                  type="text"
                  value={insuranceFields.policyNumber}
                  onChange={(e) =>
                    setInsuranceFields((f) =>
                      f ? { ...f, policyNumber: e.target.value } : f,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary">
                  {t.patientInsuranceGroupNumber}
                </label>
                <input
                  type="text"
                  value={insuranceFields.groupNumber}
                  onChange={(e) =>
                    setInsuranceFields((f) =>
                      f ? { ...f, groupNumber: e.target.value } : f,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveInsurance}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
            >
              {t.patientInsuranceSave}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <label className="cursor-pointer rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated">
              {isScanning ? t.patientInsuranceScanning : t.patientInsuranceUpload}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInsuranceUpload}
                disabled={isScanning}
              />
            </label>
          </div>
        )}
      </section>

      {/* Allergy management */}
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {t.patientAllergiesTitle}
        </h2>
        {patient && patient.allergies.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {patient.allergies.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-red/10 px-3 py-1 text-sm font-medium text-accent-red"
              >
                {allergy}
                <button
                  type="button"
                  onClick={() => setAllergyToRemove(allergy)}
                  className="text-accent-red/70 hover:text-accent-red"
                  aria-label={`Remove ${allergy}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-text-secondary italic">
            {t.patientAllergiesNone}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            placeholder={t.patientAllergiesAddPlaceholder}
            onKeyDown={(e) => e.key === "Enter" && handleAddAllergy()}
            className="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button
            type="button"
            onClick={handleAddAllergy}
            disabled={!newAllergy.trim()}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {t.patientAllergiesAdd}
          </button>
        </div>
      </section>

      {/* Language preference */}
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {t.patientLanguageTitle}
        </h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleLanguageChange("en")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              lang === "en"
                ? "bg-brand-primary text-white"
                : "border border-border bg-bg-surface text-text-primary hover:bg-bg-elevated"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange("es")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              lang === "es"
                ? "bg-brand-primary text-white"
                : "border border-border bg-bg-surface text-text-primary hover:bg-bg-elevated"
            }`}
          >
            Español
          </button>
        </div>
      </section>

      {/* Confirm dialog for allergy removal */}
      <ConfirmDialog
        open={allergyToRemove !== null}
        title={t.patientAllergiesRemoveConfirm}
        body={`"${allergyToRemove}"`}
        onConfirm={handleRemoveAllergy}
        onCancel={() => setAllergyToRemove(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §8 Patient Prescriptions Page
// ═══════════════════════════════════════════════════════════

function PatientPrescriptionsPage() {
  const { t, lang } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt modal
  const [receiptData, setReceiptData] = useState<{
    receipt: ReceiptType;
    pack: PatientPack | null;
  } | null>(null);

  // Reminder modal
  const [reminderTarget, setReminderTarget] = useState<PrescriptionSummary | null>(null);

  // Voice generation
  const [generatingVoice, setGeneratingVoice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    visitsApi
      .listVisits()
      .then(async (visits) => {
        const allRx: PrescriptionSummary[] = [];
        for (const v of visits) {
          try {
            const rxList = await prescriptionsApi.listPrescriptionsByVisit(v.id);
            allRx.push(...rxList);
          } catch {
            /* visit may have no prescriptions */
          }
        }
        setPrescriptions(allRx);
      })
      .catch(() => setError("Failed to load prescriptions"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleViewReceipt = useCallback(async (rxId: string) => {
    try {
      const receipt = await prescriptionsApi.getReceipt(rxId);
      let pack: PatientPack | null = null;
      try {
        pack = await prescriptionsApi.generatePatientPack(rxId);
      } catch {
        /* pack may not be available */
      }
      setReceiptData({ receipt, pack });
    } catch {
      setError("Failed to load receipt");
    }
  }, []);

  const handleListen = useCallback(
    async (rx: PrescriptionSummary) => {
      setGeneratingVoice(rx.prescriptionId);
      try {
        const resp = await voiceApi.generateVoicePack({
          prescriptionId: rx.prescriptionId,
          language: lang,
        });
        if (resp.audioUrl) {
          const audio = new Audio(resp.audioUrl);
          audio.play();
        }
      } finally {
        setGeneratingVoice(null);
      }
    },
    [lang],
  );

  const handleReminderSave = useCallback((_times: string[]) => {
    // In production, would save to backend
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onDismiss={() => setError(null)} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text-primary">
        {t.patientPrescriptionsTitle}
      </h1>

      {prescriptions.length === 0 ? (
        <p className="text-text-secondary">{t.patientPrescriptionsNone}</p>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div
              key={rx.prescriptionId}
              className="rounded-2xl border border-border bg-bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {rx.drugName}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {rx.genericName} · {rx.dosage} · {rx.frequency}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    rx.status === "approved"
                      ? "bg-accent-green/10 text-accent-green"
                      : rx.status === "rejected"
                        ? "bg-accent-red/10 text-accent-red"
                        : "bg-bg-elevated text-text-secondary"
                  }`}
                >
                  {rx.status}
                </span>
              </div>

              {/* Coverage badge */}
              <div className="mt-3">
                <CoverageBar
                  coverageStatus={
                    rx.isCovered === true
                      ? "COVERED"
                      : rx.isCovered === false
                        ? "NOT_COVERED"
                        : "UNKNOWN"
                  }
                  tier={rx.tier}
                  copay={rx.estimatedCopay}
                  requiresPriorAuth={null}
                />
              </div>

              {/* 4 action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleViewReceipt(rx.prescriptionId)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                >
                  📄 {t.patientPrescriptionsViewReceipt}
                </button>
                <button
                  type="button"
                  onClick={() => handleListen(rx)}
                  disabled={generatingVoice === rx.prescriptionId}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated disabled:opacity-50"
                >
                  {generatingVoice === rx.prescriptionId
                    ? "⏳"
                    : "🔊"}{" "}
                  {t.patientPrescriptionsListen}
                </button>
                <button
                  type="button"
                  onClick={() => setReminderTarget(rx)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                >
                  🔔 {t.patientPrescriptionsReminder}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/visit/${rx.prescriptionId}/chat`)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                >
                  💬 {t.patientPrescriptionsChat}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receipt modal overlay */}
      {receiptData && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16"
          onClick={(e) =>
            e.target === e.currentTarget && setReceiptData(null)
          }
        >
          <div className="w-full max-w-3xl">
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="mb-3 rounded-lg bg-bg-surface px-3 py-1 text-sm text-text-secondary hover:text-text-primary"
            >
              ✕ Close
            </button>
            <PrescriptionReceipt
              receipt={receiptData.receipt}
              patientPack={receiptData.pack}
            />
          </div>
        </div>
      )}

      {/* Reminder modal */}
      <ReminderModal
        open={reminderTarget !== null}
        medicationName={reminderTarget?.drugName}
        frequency={reminderTarget?.frequency}
        onSave={handleReminderSave}
        onCancel={() => setReminderTarget(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §10 Patient Visits Page
// ═══════════════════════════════════════════════════════════

function PatientVisitsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    visitsApi
      .listVisits()
      .then(setVisits)
      .catch(() => setError("Failed to load visits"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onDismiss={() => setError(null)} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text-primary">
        {t.patientVisitsTitle}
      </h1>

      {visits.length === 0 ? (
        <p className="text-text-secondary">{t.patientVisitsNone}</p>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="rounded-2xl border border-border bg-bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {visit.reason || "Visit"}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {new Date(visit.createdAt).toLocaleDateString()}
                  </p>
                  {visit.patientName && (
                    <p className="text-sm text-text-secondary">
                      {visit.patientName}
                    </p>
                  )}
                  {visit.prescriptionCount != null && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {visit.prescriptionCount} prescription(s)
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    visit.status === "completed"
                      ? "bg-accent-green/10 text-accent-green"
                      : visit.status === "cancelled"
                        ? "bg-accent-red/10 text-accent-red"
                        : "bg-accent-blue/10 text-accent-blue"
                  }`}
                >
                  {visit.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/visit/${visit.id}`)}
                className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-bg-elevated"
              >
                {t.patientVisitsViewDetail} →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Dashboard Router
// ═══════════════════════════════════════════════════════════

export function PatientDashboard() {
  return (
    <main className="min-h-screen">
      <Routes>
        <Route index element={<Navigate to="/patient/profile" replace />} />
        <Route path="profile" element={<PatientProfilePage />} />
        <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
        <Route path="visits" element={<PatientVisitsPage />} />
        <Route path="*" element={<Navigate to="/patient/profile" replace />} />
      </Routes>
    </main>
  );
}
