import { useEffect, useMemo, useState, useCallback } from "react";
import { Routes, Route, Navigate, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";
import { useAuthStore } from "../stores/authStore";
import { useVisitStore } from "../stores/visitStore";
import { useTranslation } from "../i18n";
import { listPatients, getPatient, deletePatient, type Patient } from "../api/patients";
import { listVisits, type Visit } from "../api/visits";
import { listPrescriptionsByVisit, type PrescriptionSummary } from "../api/prescriptions";
import { getSummary, syncToSnowflake, type AnalyticsDashboardResponse, type SyncResult } from "../api/analytics";
import { resetDemoData } from "../api/admin";
import { PageTransition } from "../components/PageTransition";
import { CopaySavingsChart } from "../components/analytics/CopaySavingsChart";
import { SafetyBlocksChart } from "../components/analytics/SafetyBlocksChart";
import { AdherenceRiskTable } from "../components/analytics/AdherenceRiskTable";
import { AddVisitPage } from "./AddVisitPage";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  LayoutDashboard,
  RefreshCw,
  Pill,
  ArrowLeft,
  User,
  Shield,
  FileText,
  Heart,
  Trash2,
  BarChart3,
  TrendingDown,
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
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
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

function ClinicianHomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { visits, isLoading: visitsLoading, error: visitsError, fetchVisits } = useVisitStore();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  useEffect(() => {
    fetchVisits({ limit: 10 });
    setPatientsLoading(true);
    listPatients()
      .then((data) => { setPatients(data); setPatientsLoading(false); })
      .catch((err) => { setPatientsError((err as Error).message); setPatientsLoading(false); });
  }, [fetchVisits]);

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.patientId, p);
    return map;
  }, [patients]);

  const isLoading = visitsLoading || patientsLoading;

  const completedVisits = visits.filter((v) => v.status === "completed").length;
  const inProgressVisits = visits.filter((v) => v.status === "in_progress").length;

  const handleResetDemo = useCallback(async () => {
    if (!window.confirm("This will delete all existing data and re-seed with demo data. Continue?")) return;
    setResetting(true);
    setResetResult(null);
    try {
      const result = await resetDemoData();
      setResetResult(result.message);
      fetchVisits({ limit: 10 });
      listPatients().then(setPatients).catch(() => {});
    } catch (err) {
      setResetResult(`Reset failed: ${(err as Error).message}`);
    } finally {
      setResetting(false);
    }
  }, [fetchVisits]);

  const displayName = user?.email?.split("@")[0] ?? "";

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Welcome back, <span className="text-gradient">{displayName}</span>
          </h2>
          <p className="mt-1 text-muted-foreground">Here's your clinical overview for today.</p>
        </div>

        {(visitsError || patientsError) && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
            {visitsError || patientsError}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Patients" value={String(patients.length)} icon={Users} color="text-ps-blue" glow="shadow-glow-blue" />
          <StatCard label="Completed Visits" value={String(completedVisits)} icon={Calendar} color="text-ps-green" glow="shadow-glow-green" />
          <StatCard label="In Progress" value={String(inProgressVisits)} icon={Clock} color="text-ps-amber" />
          <StatCard label="Total Visits" value={String(visits.length)} icon={AlertTriangle} color="text-primary" glow="shadow-glow-purple" />
        </div>

        {/* Recent visits */}
        <section>
          <SectionHeader title={t.recentVisits} />
          <div className="mt-4 space-y-3">
            {visits.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Calendar className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{t.noRecentVisits}</h3>
                <Link to="/clinician/add-visit" className="mt-4 inline-block">
                  <button className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-glow-purple">
                    {t.newVisit}
                  </button>
                </Link>
              </div>
            ) : (
              visits.map((visit, i) => {
                const patient = patientMap.get(visit.patientId);
                const displayName = visit.patientName || (patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient");
                const reason = visit.reason || visit.extractedData?.chiefComplaint || visit.notes;
                const truncatedReason = reason ? (reason.length > 60 ? `${reason.slice(0, 60)}…` : reason) : "—";
                const relativeTime = formatDistanceToNow(new Date(visit.createdAt), { addSuffix: true });

                return (
                  <motion.div
                    key={visit.id}
                    {...cardAnim}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/visit/${visit.id}`}>
                      <div className="glass-card flex items-center justify-between rounded-2xl p-5 card-hover">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-semibold text-foreground">{displayName}</p>
                            <span className="text-xs text-muted-foreground">{relativeTime}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{truncatedReason}</p>
                        </div>
                        <div className="ml-4 flex items-center gap-3">
                          {visit.prescriptionCount != null && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Pill className="h-3 w-3" />
                              {visit.prescriptionCount} Rx
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            visit.status === "completed"
                              ? "bg-ps-green/12 text-ps-green ring-1 ring-ps-green/20"
                              : "bg-ps-blue/12 text-ps-blue ring-1 ring-ps-blue/20"
                          }`}>
                            {visit.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {visit.status === "completed" ? t.completionStatus : visit.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>

        {/* Patient list */}
        <section>
          <SectionHeader title={t.patients} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patients.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-muted-foreground">{t.noPatients}</p>
              </div>
            ) : (
              patients.map((patient, i) => (
                <motion.div
                  key={patient.patientId}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", bounce: 0.2 }}
                >
                  <Link to={`/clinician/patient/${patient.patientId}`}>
                    <div className="glass-card rounded-2xl p-5 card-hover">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-ps-plum/25 text-sm font-semibold text-primary ring-1 ring-primary/15">
                          {patient.firstName?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-semibold text-foreground">{patient.firstName} {patient.lastName}</p>
                        </div>
                      </div>
                      {(patient.allergies ?? []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(patient.allergies ?? []).map((a) => (
                            <span key={a} className="flex items-center gap-1 rounded-full bg-ps-red/12 px-2.5 py-0.5 text-xs text-ps-red ring-1 ring-ps-red/20">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Reset Demo Data */}
        <div className="flex flex-col items-center gap-2 border-t border-border/30 pt-6">
          {resetResult && <p className="text-sm text-muted-foreground">{resetResult}</p>}
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs text-muted-foreground/60 transition hover:bg-secondary/40 hover:text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
            Reset Demo Data
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

export function ClinicianDashboard() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const tabs = [
    { label: t.navDashboard, path: "/clinician", icon: LayoutDashboard },
    { label: t.navNewVisit, path: "/clinician/add-visit", icon: PlusCircle },
    { label: t.navAnalytics, path: "/clinician/analytics", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Tab nav */}
      <div className="mb-8 flex gap-1 rounded-2xl glass p-1.5">
        {tabs.map((tab) => {
          const isActive = tab.path === "/clinician"
            ? pathname === "/clinician" || pathname === "/clinician/"
            : pathname.startsWith(tab.path);
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
                  layoutId="clinician-tab"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>

      <Routes>
        <Route index element={<ClinicianHomePage />} />
        <Route path="add-visit" element={<AddVisitPage />} />
        <Route path="analytics" element={<ClinicianAnalyticsTab />} />
        <Route path="patient/:patientId" element={<PatientDetailPage />} />
        <Route path="*" element={<Navigate to="/clinician" replace />} />
      </Routes>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Analytics tab (Snowflake / local)                         */
/* ────────────────────────────────────────────────────────── */

function DataSourceBadge({ source }: { source: string }) {
  const isSnowflake = source === "snowflake";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
      isSnowflake
        ? "bg-ps-blue/12 text-ps-blue ring-1 ring-ps-blue/20"
        : "bg-secondary text-muted-foreground ring-1 ring-border/30"
    }`}>
      {isSnowflake ? "Snowflake" : "Local DB"}
    </span>
  );
}

function ClinicianAnalyticsTab() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getSummary();
      setDashboard(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const result = await syncToSnowflake();
      setSyncResult(result);
      await fetchDashboard();
    } catch {
      setSyncResult({ synced_count: 0, failed_count: 0, message: "Sync failed — see logs" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">{error}</div>
          <button onClick={fetchDashboard} className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground transition hover:bg-secondary/80">
            Retry
          </button>
        </div>
      </PageTransition>
    );
  }

  if (!dashboard) return null;

  const { copay_savings, copay_by_status, safety_blocks, visit_efficiency, adherence_risks, data_source } = dashboard;
  const totalBlocks = safety_blocks.reduce((s, b) => s + b.count, 0);

  const metrics = [
    { label: "Total Visits", value: String(visit_efficiency.total_visits), subtitle: `${visit_efficiency.total_prescriptions} prescriptions`, icon: Clock, color: "text-ps-blue", glow: "shadow-glow-blue" },
    { label: "Copay Saved", value: `$${copay_savings.total_copay_saved.toFixed(0)}`, subtitle: `Avg $${copay_savings.average_copay.toFixed(0)} per Rx`, icon: TrendingDown, color: "text-ps-green", glow: "shadow-glow-green" },
    { label: "Safety Blocks", value: String(totalBlocks), subtitle: "Dangerous Rx prevented", icon: Shield, color: "text-ps-red", glow: "shadow-glow-red" },
    { label: "Avg Time / Visit", value: `${visit_efficiency.avg_duration_minutes} min`, subtitle: "Clinical decision time", icon: Pill, color: "text-primary", glow: "shadow-glow-purple" },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-1 rounded-full bg-gradient-to-b from-primary to-ps-plum" />
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Analytics</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataSourceBadge source={data_source} />
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary/80 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Sync result */}
        {syncResult && (
          <div className="flex items-center gap-3 rounded-xl glass p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 text-ps-green" />
            <span className="text-foreground">{syncResult.message}</span>
            <button onClick={() => setSyncResult(null)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                {...cardAnim}
                transition={{ delay: i * 0.08, type: "spring", bounce: 0.2 }}
                className={`glass-card rounded-2xl p-5 card-hover ${m.glow}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 ${m.color}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                </div>
                <p className="mt-4 font-display text-3xl font-bold text-foreground">{m.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground/60">{m.subtitle}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="mb-5 font-display text-lg font-semibold text-foreground">Copay Savings</h3>
            <CopaySavingsChart data={copay_by_status} />
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="mb-5 font-display text-lg font-semibold text-foreground">Safety Blocks</h3>
            <SafetyBlocksChart data={safety_blocks} />
          </div>
        </div>

        {/* Adherence risk table */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-5 font-display text-lg font-semibold text-foreground">Adherence Risk</h3>
          <AdherenceRiskTable data={adherence_risks} />
        </div>
      </div>
    </PageTransition>
  );
}

function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [prescriptionMap, setPrescriptionMap] = useState<Map<string, PrescriptionSummary[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!patientId || !patient) return;
    const name = `${patient.firstName} ${patient.lastName}`.trim() || "this patient";
    if (!window.confirm(`Are you sure you want to delete ${name}? This will permanently remove the patient and all associated visits and prescriptions. This action cannot be undone.`)) return;

    setDeleting(true);
    try {
      await deletePatient(patientId);
      navigate("/clinician", { replace: true });
    } catch (err) {
      setError(`Failed to delete patient: ${(err as Error).message}`);
      setDeleting(false);
    }
  }, [patientId, patient, navigate]);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getPatient(patientId),
      listVisits({ patientId }),
    ])
      .then(async ([p, v]) => {
        setPatient(p);
        setVisits(v);

        const rxMap = new Map<string, PrescriptionSummary[]>();
        await Promise.all(
          v.map(async (visit) => {
            try {
              const rxList = await listPrescriptionsByVisit(visit.id);
              if (rxList.length > 0) rxMap.set(visit.id, rxList);
            } catch { /* non-fatal */ }
          }),
        );
        setPrescriptionMap(rxMap);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageTransition>
    );
  }

  if (error || !patient) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <Link to="/clinician" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-destructive">{error || "Patient not found."}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const completedVisits = visits.filter((v) => v.status === "completed").length;
  const totalPrescriptions = Array.from(prescriptionMap.values()).reduce((sum, list) => sum + list.length, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Back link */}
        <Link to="/clinician" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Patient header card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ps-burgundy/25 to-primary/25 text-2xl font-bold text-primary ring-1 ring-primary/15">
              {patient.firstName?.charAt(0) || "?"}{patient.lastName?.charAt(0) || ""}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {patient.firstName} {patient.lastName}
                </h2>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                >
                  <Trash2 className={`h-3.5 w-3.5 ${deleting ? "animate-spin" : ""}`} />
                  {deleting ? "Deleting…" : "Delete Patient"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {patient.dateOfBirth && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                    {age != null && <span className="text-foreground/60">({age} yrs)</span>}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {patient.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-secondary/40 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{visits.length}</p>
              <p className="text-xs text-muted-foreground">Total Visits</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{completedVisits}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalPrescriptions}</p>
              <p className="text-xs text-muted-foreground">Prescriptions</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Allergies */}
          <div className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ps-red/12">
                <AlertTriangle className="h-4 w-4 text-ps-red" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{t.visitAllergies}</h3>
            </div>
            {(patient.allergies ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((a) => (
                  <span key={a} className="rounded-full bg-ps-red/12 px-3 py-1 text-sm text-ps-red ring-1 ring-ps-red/20">
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.patientAllergiesNone}</p>
            )}
          </div>

          {/* Current Medications */}
          <div className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ps-blue/12">
                <Pill className="h-4 w-4 text-ps-blue" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{t.visitMedications}</h3>
            </div>
            {(patient.currentMedications ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.currentMedications.map((m) => (
                  <span key={m} className="rounded-full bg-ps-blue/12 px-3 py-1 text-sm text-ps-blue ring-1 ring-ps-blue/20">
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No current medications on file.</p>
            )}
          </div>

          {/* Insurance */}
          <div className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ps-green/12">
                <Shield className="h-4 w-4 text-ps-green" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{t.insurancePlan}</h3>
            </div>
            {patient.insurancePlan ? (
              <div className="space-y-1 text-sm">
                <p className="text-foreground">{patient.insurancePlan}</p>
                {patient.insuranceMemberId && (
                  <p className="text-muted-foreground">Member ID: {patient.insuranceMemberId}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No insurance information on file.</p>
            )}
          </div>

          {/* Medical History */}
          <div className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">Medical History</h3>
            </div>
            {patient.medicalHistory ? (
              <p className="whitespace-pre-line text-sm text-foreground">{patient.medicalHistory}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No medical history on file.</p>
            )}
          </div>
        </div>

        {/* Visit history */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">Visit History</h3>
          </div>

          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.emptyVisits}</p>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => {
                const reason = visit.reason || visit.notes;
                const rxList = prescriptionMap.get(visit.id) ?? [];
                const relTime = formatDistanceToNow(new Date(visit.createdAt), { addSuffix: true });

                return (
                  <Link key={visit.id} to={`/visit/${visit.id}`}>
                    <div className="rounded-xl border border-border/30 bg-secondary/20 p-4 transition hover:bg-secondary/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {reason ? (reason.length > 80 ? `${reason.slice(0, 80)}…` : reason) : "Visit"}
                            </span>
                            <span className="text-xs text-muted-foreground">{relTime}</span>
                          </div>
                          {rxList.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {rxList.map((rx, idx) => (
                                <span key={idx} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                  <Pill className="h-2.5 w-2.5" />
                                  {rx.drugName} {rx.dosage}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          visit.status === "completed"
                            ? "bg-ps-green/12 text-ps-green ring-1 ring-ps-green/20"
                            : "bg-ps-blue/12 text-ps-blue ring-1 ring-ps-blue/20"
                        }`}>
                          {visit.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {visit.status === "completed" ? t.completionStatus : visit.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
