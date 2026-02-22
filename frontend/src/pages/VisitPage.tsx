import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useVisitStore } from "../stores/visitStore";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../i18n";
import { PageTransition } from "../components/PageTransition";
import { VoiceChatPanel } from "../components/VoiceChatPanel";
import { PronounceButton } from "../components/PronounceButton";
import { ReminderModal } from "../shared/ReminderModal";
import {
  listPrescriptionsByVisit,
  getReceipt,
  type PrescriptionSummary,
  type PrescriptionReceipt,
} from "../api/prescriptions";
import { downloadVisitPdf } from "../api/visits";
import {
  FileText,
  MessageSquare,
  Download,
  Pill,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Bell,
  X,
  AlertTriangle,
  Mic,
} from "lucide-react";

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

const cardAnim = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export function VisitPage() {
  const { id: visitId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const visitStore = useVisitStore();
  const fetchVisit = useVisitStore((s) => s.fetchVisit);
  const visit = visitStore.currentVisit;

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDrug, setReminderDrug] = useState<string | undefined>();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PrescriptionReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);

  const announcerRef = useRef<HTMLDivElement>(null);
  const announce = useCallback((msg: string) => {
    if (announcerRef.current) announcerRef.current.textContent = msg;
  }, []);

  useEffect(() => { if (visitId) fetchVisit(visitId); }, [visitId, fetchVisit]);

  useEffect(() => {
    if (!visitId) return;
    setPrescriptionsLoading(true);
    listPrescriptionsByVisit(visitId)
      .then((data) => { setPrescriptions(data); setPrescriptionsError(null); })
      .catch(() => setPrescriptionsError("Failed to load prescriptions."))
      .finally(() => setPrescriptionsLoading(false));
  }, [visitId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!visitId) return;
    setIsDownloading(true);
    try {
      const blob = await downloadVisitPdf(visitId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `visit-${visitId}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      announce("PDF downloaded.");
    } catch { announce("Failed to download PDF."); } finally { setIsDownloading(false); }
  }, [visitId, announce]);

  const handleOpenReminder = useCallback((drugName?: string) => { setReminderDrug(drugName); setReminderOpen(true); }, []);
  const handleSaveReminder = useCallback((times: string[]) => { announce(`Reminder set for ${times.join(", ")}`); setReminderOpen(false); }, [announce]);
  const handleViewReceipt = useCallback(async (prescriptionId: string) => {
    setReceiptLoading(prescriptionId);
    try { const receipt = await getReceipt(prescriptionId); setActiveReceipt(receipt); announce("Receipt loaded."); }
    catch { announce("Failed to load receipt."); } finally { setReceiptLoading(null); }
  }, [announce]);

  const isPatient = user?.role === "patient";
  const totalCopay = prescriptions.reduce((sum, p) => sum + (p.estimatedCopay ?? 0), 0);

  if (visitStore.isLoading && !visit) {
    return (
      <PageTransition>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageTransition>
    );
  }

  if (visitStore.error) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">{visitStore.error}</div>
          <button onClick={() => visitId && visitStore.fetchVisit(visitId)} className="mt-3 rounded-xl bg-secondary px-4 py-2 text-sm text-foreground">Retry</button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div ref={announcerRef} role="status" aria-live="polite" className="sr-only" />

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link to={user?.role === "clinician" ? "/clinician" : "/patient/visits"} className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-ps-plum" />
              <h1 className="font-display text-2xl font-bold text-foreground">{t.visitDetailTitle}</h1>
            </div>
            {visit && (
              <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{formatDate(visit.createdAt)}</span>
                {visit.patientName && <span>· {visit.patientName}</span>}
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  visit.status === "completed"
                    ? "bg-ps-green/12 text-ps-green ring-1 ring-ps-green/20"
                    : "bg-ps-blue/12 text-ps-blue ring-1 ring-ps-blue/20"
                }`}>
                  {visit.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {visit.status === "completed" ? t.visitCompleted : t.visitInProgress}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setVoiceChatOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                voiceChatOpen
                  ? "bg-gradient-to-r from-ps-burgundy to-primary text-white shadow-glow-brand"
                  : "glass text-foreground hover:bg-secondary/60"
              }`}
            >
              <Mic className="h-4 w-4" /> Speak
            </button>
            <Link to={`/visit/${visitId}/chat`}>
              <button className="flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/60">
                <MessageSquare className="h-4 w-4" /> {t.visitDetailChat}
              </button>
            </Link>
            <button onClick={handleDownloadPdf} disabled={isDownloading} className="flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/60 disabled:opacity-50">
              <Download className="h-4 w-4" /> {isDownloading ? "Downloading…" : t.visitDetailDownloadPdf}
            </button>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: Visit Notes + Extracted Data */}
          <div className="space-y-4 md:col-span-1">
            <motion.div {...cardAnim} className="glass-card rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold text-foreground">{t.visitNotes}</h3>
              </div>
              {visit?.notes ? (
                <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">{visit.notes}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No notes.</p>
              )}
            </motion.div>

            {visit?.extractedData && (
              <motion.div {...cardAnim} transition={{ delay: 0.08 }} className="glass-card rounded-2xl p-6">
                <h3 className="mb-4 font-display font-semibold text-foreground">Extracted Data</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.visitDiagnosis}</p>
                    <p className="text-foreground">{visit.extractedData.diagnosis || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.visitAllergies}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {visit.extractedData.allergies.length > 0
                        ? visit.extractedData.allergies.map((a) => (
                            <span key={a} className="flex items-center gap-1 rounded-full bg-ps-red/12 px-2.5 py-0.5 text-xs text-ps-red ring-1 ring-ps-red/20">
                              <AlertTriangle className="h-2.5 w-2.5" /> {a}
                            </span>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.visitMedications}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {visit.extractedData.currentMedications.length > 0
                        ? visit.extractedData.currentMedications.map((m) => (
                            <span key={m} className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs text-foreground">{m}</span>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Prescriptions */}
          <div className="md:col-span-2">
            <motion.div {...cardAnim} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between border-b border-border/30 pb-3">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">{t.visitDetailPrescriptions}</h3>
                </div>
                {prescriptions.length > 0 && (
                  <span className="text-sm text-muted-foreground">Total copay: {formatCurrency(totalCopay)}</span>
                )}
              </div>

              {prescriptionsLoading && (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              )}
              {prescriptionsError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">{prescriptionsError}</div>
              )}
              {!prescriptionsLoading && !prescriptionsError && prescriptions.length === 0 && (
                <p className="py-8 text-center text-sm italic text-muted-foreground">{t.visitDetailNoPrescriptions}</p>
              )}

              {prescriptions.length > 0 && (
                <div className="space-y-3">
                  {prescriptions.map((rx) => (
                    <div key={rx.prescriptionId} className="rounded-xl bg-secondary/30 p-4 transition hover:bg-secondary/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-mono font-semibold text-foreground">{rx.drugName}</h4>
                            <PronounceButton name={rx.drugName} />
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              rx.status === "approved" ? "bg-ps-green/12 text-ps-green ring-1 ring-ps-green/20"
                                : rx.status === "rejected" ? "bg-ps-red/12 text-ps-red ring-1 ring-ps-red/20"
                                : "bg-ps-amber/12 text-ps-amber ring-1 ring-ps-amber/20"
                            }`}>
                              {rx.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{rx.genericName}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground">{rx.dosage}</span>
                            <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground">{rx.frequency}</span>
                            <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground">{rx.duration || "ongoing"}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            {rx.isCovered != null && <span>{rx.isCovered ? "✓ Covered" : "✕ Not Covered"}</span>}
                            {rx.tier != null && <span>Tier {rx.tier}</span>}
                            {rx.estimatedCopay != null && <span>Copay: {formatCurrency(rx.estimatedCopay)}</span>}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          {rx.status === "approved" && (
                            <button onClick={() => handleViewReceipt(rx.prescriptionId)} disabled={receiptLoading === rx.prescriptionId} className="text-xs text-ps-green hover:underline disabled:opacity-50">
                              {receiptLoading === rx.prescriptionId ? "Loading…" : t.visitDetailViewReceipt}
                            </button>
                          )}
                          <Link to={`/visit/${visitId}/chat`} className="text-xs text-primary hover:underline">{t.visitDetailChat}</Link>
                          {isPatient && (
                            <button onClick={() => handleOpenReminder(rx.drugName)} className="text-left text-xs text-ps-amber hover:underline">
                              <Bell className="mr-1 inline h-3 w-3" />{t.visitDetailReminder}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Receipt overlay */}
        {activeReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setActiveReceipt(null); }} role="dialog" aria-modal="true">
            <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto glass-card rounded-2xl p-6 shadow-modal">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">{t.prescriptionReceipt}</h2>
                <button onClick={() => setActiveReceipt(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{activeReceipt.patientName}</span>
                  <span>{activeReceipt.clinicianName}</span>
                </div>
                <div className="text-xs text-muted-foreground">Issued: {formatDate(activeReceipt.issuedAt)}</div>
                {activeReceipt.drugs.map((drug, i) => (
                  <div key={i} className="rounded-xl bg-secondary/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{drug.drugName}</span>
                      <PronounceButton name={drug.drugName} />
                      {drug.isCovered && <span className="rounded-full bg-ps-green/12 px-2 py-0.5 text-xs text-ps-green">Covered</span>}
                    </div>
                    <p className="text-muted-foreground">{drug.genericName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground">{drug.dosage}</span>
                      <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground">{drug.frequency}</span>
                      <span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground">{drug.duration || "ongoing"}</span>
                    </div>
                    {drug.copay != null && <p className="mt-1 text-xs text-muted-foreground">Copay: {formatCurrency(drug.copay)}</p>}
                  </div>
                ))}
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.coverageStatus}</p>
                  <p className="text-foreground">{activeReceipt.coverage.planName} — {activeReceipt.coverage.memberId}</p>
                  <p className="text-xs text-muted-foreground">Total copay: {formatCurrency(activeReceipt.coverage.totalCopay)} · {activeReceipt.coverage.itemsCovered} covered</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.safetyChecks}</p>
                  {activeReceipt.safety.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={check.passed ? "text-ps-green" : "text-ps-red"}>{check.passed ? "✓" : "✕"}</span>
                      <span className="text-foreground">{check.checkType}: {check.message}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => setActiveReceipt(null)} className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground transition hover:bg-secondary/80">{t.close}</button>
              </div>
            </div>
          </div>
        )}

        <ReminderModal open={reminderOpen} medicationName={reminderDrug} onSave={handleSaveReminder} onCancel={() => setReminderOpen(false)} />

        {voiceChatOpen && visitId && (
          <VoiceChatPanel visitId={visitId} onClose={() => setVoiceChatOpen(false)} />
        )}
      </div>
    </PageTransition>
  );
}
