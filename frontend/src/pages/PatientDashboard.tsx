import { Routes, Route, Navigate, useNavigate, Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { PageTransition } from "../components/PageTransition";
import { PronounceButton } from "../components/PronounceButton";
import type { Patient } from "../api/patients";
import type {
  PrescriptionSummary,
  PrescriptionReceipt as ReceiptType,
  PatientPack,
} from "../api/prescriptions";
import type { Visit } from "../api/visits";
import {
  User,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Upload,
  Plus,
  Globe,
  ArrowRight,
  FileText,
  Volume2,
  Bell,
  MessageSquare,
  X,
} from "lucide-react";

const cardAnim = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-ps-plum" />
      <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, glow }: {
  label: string; value: string; icon: React.ElementType; color: string; glow?: string;
}) {
  return (
    <motion.div {...cardAnim} className={`glass-card rounded-2xl p-5 card-hover ${glow || ""}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 ${color}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

function Badge({ variant, children }: { variant: "green" | "amber" | "red" | "blue"; children: React.ReactNode }) {
  const colors = {
    green: "bg-ps-green/12 text-ps-green ring-1 ring-ps-green/20",
    amber: "bg-ps-amber/12 text-ps-amber ring-1 ring-ps-amber/20",
    red: "bg-ps-red/12 text-ps-red ring-1 ring-ps-red/20",
    blue: "bg-ps-blue/12 text-ps-blue ring-1 ring-ps-blue/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// Profile Page
// ═══════════════════════════════════════════════════════════

function PatientProfilePage() {
  const { t, lang } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setLanguage = useUiStore((s) => s.setLanguage);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAllergy, setNewAllergy] = useState("");
  const [allergyToRemove, setAllergyToRemove] = useState<string | null>(null);
  const [insuranceFields, setInsuranceFields] = useState<{ provider: string; policyNumber: string; groupNumber: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showInsuranceReview, setShowInsuranceReview] = useState(false);

  const [activePrescriptions, setActivePrescriptions] = useState(0);
  const [upcomingVisits, setUpcomingVisits] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    patientsApi.getPatient(user.userId).then(setPatient).catch(() => setError("Failed to load profile")).finally(() => setLoading(false));

    visitsApi.listVisits().then(async (visits) => {
      const inProgress = visits.filter((v) => v.status === "in_progress");
      setUpcomingVisits(inProgress.length);

      let rxCount = 0;
      for (const v of visits) {
        try {
          const rxList = await prescriptionsApi.listPrescriptionsByVisit(v.id);
          rxCount += rxList.filter((rx) => rx.status === "approved").length;
        } catch { /* no prescriptions for this visit */ }
      }
      setActivePrescriptions(rxCount);
    }).catch(() => { /* non-critical */ });
  }, [user]);

  const handleAddAllergy = useCallback(async () => {
    if (!patient || !newAllergy.trim()) return;
    const updated = await patientsApi.updatePatient(patient.patientId, { allergies: [...patient.allergies, newAllergy.trim()] });
    setPatient(updated);
    setNewAllergy("");
  }, [patient, newAllergy]);

  const handleRemoveAllergy = useCallback(async () => {
    if (!patient || !allergyToRemove) return;
    const updated = await patientsApi.updatePatient(patient.patientId, { allergies: patient.allergies.filter((a) => a !== allergyToRemove) });
    setPatient(updated);
    setAllergyToRemove(null);
  }, [patient, allergyToRemove]);

  const handleInsuranceUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => { const result = reader.result as string; resolve(result.split(",")[1] || result); };
        reader.readAsDataURL(file);
      });
      const resp = await processOcr({ base64_data: base64, mime_type: file.type || "image/jpeg", source_type: "INSURANCE_CARD" });
      const r = resp.result as Record<string, string>;
      setInsuranceFields({ provider: r.provider || r.insurance_provider || "", policyNumber: r.policy_number || r.policyNumber || "", groupNumber: r.group_number || r.groupNumber || "" });
      setShowInsuranceReview(true);
    } catch {
      setError("Failed to scan insurance card");
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleSaveInsurance = useCallback(async () => {
    if (!patient || !insuranceFields) return;
    const updated = await patientsApi.updatePatient(patient.patientId, { insurancePlan: `${insuranceFields.provider} - ${insuranceFields.policyNumber}` });
    setPatient(updated);
    setShowInsuranceReview(false);
    setInsuranceFields(null);
  }, [patient, insuranceFields]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
        {error}
        <button onClick={() => setError(null)} className="ml-3 underline">Dismiss</button>
      </div>
    );
  }

  const displayName = patient ? `${patient.firstName} ${patient.lastName}` : user?.email?.split("@")[0] || "";

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader title={t.patientProfileTitle} />

        {/* Patient info card */}
        <motion.div {...cardAnim} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-ps-plum/25 text-2xl font-bold text-primary ring-1 ring-primary/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">{displayName}</h3>
              <p className="text-sm text-muted-foreground">{patient?.email || user?.email}</p>
              {patient?.dateOfBirth && (
                <p className="text-sm text-muted-foreground">{t.dateOfBirth}: {patient.dateOfBirth}</p>
              )}
              <span className="mt-2 inline-block rounded-full bg-primary/12 px-3 py-0.5 text-xs font-semibold capitalize text-primary">
                {user?.role}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Active Prescriptions" value={String(activePrescriptions)} icon={Pill} color="text-ps-green" glow="shadow-glow-green" />
          <StatCard label="Upcoming Visits" value={String(upcomingVisits)} icon={Calendar} color="text-ps-blue" glow="shadow-glow-blue" />
          <StatCard label="Safety Alerts" value={String(patient?.allergies?.length ?? 0)} icon={AlertTriangle} color="text-ps-amber" />
        </div>

        {/* Insurance Information */}
        <motion.div {...cardAnim} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">{t.patientInsuranceTitle}</h3>
          {patient?.insurancePlan && (
            <p className="mb-3 text-sm text-muted-foreground">{t.insurancePlan}: <strong className="text-foreground">{patient.insurancePlan}</strong></p>
          )}
          {showInsuranceReview && insuranceFields ? (
            <div className="space-y-3 rounded-xl border border-ps-blue/20 bg-ps-blue/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ps-blue">{t.patientInsuranceReview}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["provider", "policyNumber", "groupNumber"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground">{t[`patientInsurance${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof t] || field}</label>
                    <input
                      type="text"
                      value={insuranceFields[field]}
                      onChange={(e) => setInsuranceFields((f) => f ? { ...f, [field]: e.target.value } : f)}
                      className="mt-1 w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveInsurance} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow-purple">
                {t.patientInsuranceSave}
              </button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/60">
                <Upload className="h-4 w-4" />
                {isScanning ? t.patientInsuranceScanning : t.patientInsuranceUpload}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleInsuranceUpload} disabled={isScanning} />
            </label>
          )}
        </motion.div>

        {/* Allergies */}
        <motion.div {...cardAnim} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">{t.patientAllergiesTitle}</h3>
          {patient && (patient.allergies ?? []).length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {(patient.allergies ?? []).map((a) => (
                <span key={a} className="inline-flex items-center rounded-full bg-ps-red/12 px-3 py-1 text-xs font-medium text-ps-red ring-1 ring-ps-red/20">
                  <AlertTriangle className="mr-1.5 h-3 w-3" />
                  {a}
                  <button onClick={() => setAllergyToRemove(a)} className="ml-1.5 text-ps-red/60 hover:text-ps-red" aria-label={`Remove ${a}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm italic text-muted-foreground">{t.patientAllergiesNone}</p>
          )}
          <div className="flex gap-2">
            <input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAllergy()}
              placeholder={t.patientAllergiesAddPlaceholder}
              className="flex-1 rounded-xl border border-border/50 bg-secondary/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
            />
            <button onClick={handleAddAllergy} disabled={!newAllergy.trim()} className="flex items-center gap-1 rounded-xl glass px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/60 disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {t.patientAllergiesAdd}
            </button>
          </div>
        </motion.div>

        {/* Language Preference */}
        <motion.div {...cardAnim} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">{t.patientLanguageTitle}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                lang === "en" ? "bg-primary text-primary-foreground shadow-glow-purple" : "glass text-foreground hover:bg-secondary/60"
              }`}
            >
              <Globe className="h-4 w-4" />
              English
            </button>
            <button
              onClick={() => setLanguage("es")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                lang === "es" ? "bg-primary text-primary-foreground shadow-glow-purple" : "glass text-foreground hover:bg-secondary/60"
              }`}
            >
              <Globe className="h-4 w-4" />
              Español
            </button>
          </div>
        </motion.div>

        <ConfirmDialog
          open={allergyToRemove !== null}
          title={t.patientAllergiesRemoveConfirm}
          body={`"${allergyToRemove}"`}
          onConfirm={handleRemoveAllergy}
          onCancel={() => setAllergyToRemove(null)}
        />
      </div>
    </PageTransition>
  );
}

// ═══════════════════════════════════════════════════════════
// Prescriptions Page
// ═══════════════════════════════════════════════════════════

function PatientPrescriptionsPage() {
  const { t, lang } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{ receipt: ReceiptType; pack: PatientPack | null } | null>(null);
  const [reminderTarget, setReminderTarget] = useState<PrescriptionSummary | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    visitsApi.listVisits().then(async (visits) => {
      const allRx: PrescriptionSummary[] = [];
      for (const v of visits) {
        try { const rxList = await prescriptionsApi.listPrescriptionsByVisit(v.id); allRx.push(...rxList); } catch { /* no prescriptions */ }
      }
      setPrescriptions(allRx);
    }).catch(() => setError("Failed to load prescriptions")).finally(() => setLoading(false));
  }, [user]);

  const handleViewReceipt = useCallback(async (rxId: string) => {
    try {
      const receipt = await prescriptionsApi.getReceipt(rxId);
      let pack: PatientPack | null = null;
      try { pack = await prescriptionsApi.generatePatientPack(rxId); } catch { /* pack may not be available */ }
      setReceiptData({ receipt, pack });
    } catch { setError("Failed to load receipt"); }
  }, []);

  const handleListen = useCallback(async (rx: PrescriptionSummary) => {
    setGeneratingVoice(rx.prescriptionId);
    try {
      const resp = await voiceApi.generateVoicePack({ prescriptionId: rx.prescriptionId, language: lang });
      if (resp.audioUrl) { const audio = new Audio(resp.audioUrl); audio.play(); }
    } finally { setGeneratingVoice(null); }
  }, [lang]);

  const handleReminderSave = useCallback((_times: string[]) => {}, []);

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (error) return <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">{error}</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader title={t.patientPrescriptionsTitle} />

        {prescriptions.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Pill className="mx-auto mb-4 h-8 w-8 text-primary/40" />
            <p className="text-muted-foreground">{t.patientPrescriptionsNone}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((rx, i) => (
              <motion.div key={rx.prescriptionId} {...cardAnim} transition={{ delay: i * 0.06 }} className="glass-card rounded-2xl p-5 card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-semibold text-foreground">{rx.drugName}</h3>
                      <PronounceButton name={rx.drugName} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{rx.genericName} · {rx.dosage} · {rx.frequency}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Badge variant={rx.status === "approved" ? "green" : rx.status === "rejected" ? "red" : "amber"}>
                        {rx.status}
                      </Badge>
                      {rx.isCovered !== null && (
                        <Badge variant={rx.isCovered ? "green" : "red"}>
                          {rx.isCovered ? "covered" : "not covered"}
                        </Badge>
                      )}
                      {rx.tier != null && (
                        <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Tier {rx.tier}
                        </span>
                      )}
                    </div>
                  </div>
                  {rx.estimatedCopay != null && (
                    <div className="text-right">
                      <p className="font-display text-xl font-bold text-foreground">${rx.estimatedCopay.toFixed(2)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">copay</p>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <CoverageBar
                    coverageStatus={rx.isCovered === true ? "COVERED" : rx.isCovered === false ? "NOT_COVERED" : "UNKNOWN"}
                    tier={rx.tier}
                    copay={rx.estimatedCopay}
                    requiresPriorAuth={null}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/30 pt-3">
                  <button onClick={() => handleViewReceipt(rx.prescriptionId)} className="flex items-center gap-1.5 rounded-xl glass px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/60">
                    <FileText className="h-3.5 w-3.5" /> {t.patientPrescriptionsViewReceipt}
                  </button>
                  <button onClick={() => handleListen(rx)} disabled={generatingVoice === rx.prescriptionId} className="flex items-center gap-1.5 rounded-xl glass px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/60 disabled:opacity-50">
                    <Volume2 className="h-3.5 w-3.5" /> {generatingVoice === rx.prescriptionId ? "Loading…" : t.patientPrescriptionsListen}
                  </button>
                  <button onClick={() => setReminderTarget(rx)} className="flex items-center gap-1.5 rounded-xl glass px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/60">
                    <Bell className="h-3.5 w-3.5" /> {t.patientPrescriptionsReminder}
                  </button>
                  <button onClick={() => navigate(`/visit/${rx.prescriptionId}/chat`)} className="flex items-center gap-1.5 rounded-xl glass px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/60">
                    <MessageSquare className="h-3.5 w-3.5" /> {t.patientPrescriptionsChat}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {receiptData && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 pt-16" onClick={(e) => e.target === e.currentTarget && setReceiptData(null)}>
            <div className="w-full max-w-3xl">
              <button onClick={() => setReceiptData(null)} className="mb-3 flex items-center gap-1.5 rounded-xl glass px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" /> Close
              </button>
              <PrescriptionReceipt receipt={receiptData.receipt} patientPack={receiptData.pack} />
            </div>
          </div>
        )}

        <ReminderModal
          open={reminderTarget !== null}
          medicationName={reminderTarget?.drugName}
          frequency={reminderTarget?.frequency}
          onSave={handleReminderSave}
          onCancel={() => setReminderTarget(null)}
        />
      </div>
    </PageTransition>
  );
}

// ═══════════════════════════════════════════════════════════
// Visits Page
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
    visitsApi.listVisits().then(setVisits).catch(() => setError("Failed to load visits")).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (error) return <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">{error}</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader title={t.patientVisitsTitle} />

        {visits.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Calendar className="mx-auto mb-4 h-8 w-8 text-primary/40" />
            <p className="text-muted-foreground">{t.patientVisitsNone}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((v, i) => (
              <motion.div key={v.id} {...cardAnim} transition={{ delay: i * 0.06 }} className="glass-card rounded-2xl p-5 card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{v.reason || "Visit"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString()} {v.patientName ? `· ${v.patientName}` : ""}
                    </p>
                    {v.prescriptionCount != null && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Pill className="h-3 w-3" /> {v.prescriptionCount} prescription(s)
                      </p>
                    )}
                    <button onClick={() => navigate(`/visit/${v.id}`)} className="mt-3 flex items-center gap-1.5 rounded-xl glass px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/60">
                      {t.patientVisitsViewDetail} <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <Badge variant={v.status === "completed" ? "green" : v.status === "cancelled" ? "red" : "blue"}>
                    {v.status === "completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {v.status !== "completed" && <Clock className="mr-1 h-3 w-3" />}
                    {v.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ═══════════════════════════════════════════════════════════
// Dashboard with tabs
// ═══════════════════════════════════════════════════════════

export function PatientDashboard() {
  const location = useLocation();

  const tabs = [
    { label: "My Profile", path: "/patient/profile", icon: User },
    { label: "My Prescriptions", path: "/patient/prescriptions", icon: Pill },
    { label: "My Visits", path: "/patient/visits", icon: Calendar },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Tab nav */}
      <div className="mb-8 flex gap-1 rounded-2xl glass p-1.5">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path !== "/patient/profile" && location.pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="patient-tab"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <Routes>
        <Route index element={<Navigate to="/patient/profile" replace />} />
        <Route path="profile" element={<PatientProfilePage />} />
        <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
        <Route path="visits" element={<PatientVisitsPage />} />
        <Route path="*" element={<Navigate to="/patient/profile" replace />} />
      </Routes>
    </div>
  );
}
