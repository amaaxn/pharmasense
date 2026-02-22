import { useEffect, useMemo, useState, useCallback } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useAuthStore } from "../stores/authStore";
import { useVisitStore } from "../stores/visitStore";
import { useTranslation } from "../i18n";
import { listPatients, type Patient } from "../api/patients";
import { resetDemoData } from "../api/admin";
import {
  Card,
  Avatar,
  Badge,
  Button,
  LoadingSpinner,
  ErrorBanner,
  EmptyState,
} from "../shared";
import { PageTransition } from "../components/PageTransition";
import { AddVisitPage } from "./AddVisitPage";

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
      .then((data) => {
        setPatients(data);
        setPatientsLoading(false);
      })
      .catch((err) => {
        setPatientsError((err as Error).message);
        setPatientsLoading(false);
      });
  }, [fetchVisits]);

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) {
      map.set(p.patientId, p);
    }
    return map;
  }, [patients]);

  const isLoading = visitsLoading || patientsLoading;

  const handleResetDemo = useCallback(async () => {
    if (!window.confirm("This will delete all existing data and re-seed with demo data. Continue?")) {
      return;
    }
    setResetting(true);
    setResetResult(null);
    try {
      const result = await resetDemoData();
      setResetResult(result.message);
      fetchVisits({ limit: 10 });
      setPatientsLoading(true);
      listPatients()
        .then((data) => {
          setPatients(data);
          setPatientsLoading(false);
        })
        .catch(() => setPatientsLoading(false));
    } catch (err) {
      setResetResult(`Reset failed: ${(err as Error).message}`);
    } finally {
      setResetting(false);
    }
  }, [fetchVisits]);

  return (
    <PageTransition>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-text-heading">{t.pageClinicianDashboard}</h1>
            {user && (
              <p className="mt-1 text-text-secondary">
                Welcome, {user.email}
              </p>
            )}
          </div>
          <Link to="/clinician/add-visit">
            <Button>{t.newVisit}</Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {(visitsError || patientsError) && (
          <ErrorBanner
            message={visitsError || patientsError || t.errorGeneric}
            className="mb-6"
          />
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column — Patient list */}
            <div className="lg:col-span-1">
              <h2 className="mb-4 text-h3 text-text-heading">{t.patients}</h2>
              {patients.length === 0 ? (
                <EmptyState title={t.noPatients} icon="👤" />
              ) : (
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <Link
                      key={patient.patientId}
                      to={`/clinician/patient/${patient.patientId}`}
                    >
                      <Card hoverable className="flex items-center gap-4">
                        <Avatar
                          fallback={`${patient.firstName} ${patient.lastName}`}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-text-heading">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {patient.allergies.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent-red/15 px-2 py-0.5 text-xs font-medium text-accent-red">
                                ⚠ {patient.allergies.length} {t.allergyCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right column — Recent visits */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-h3 text-text-heading">{t.recentVisits}</h2>
              {visits.length === 0 ? (
                <EmptyState
                  title={t.noRecentVisits}
                  icon="📋"
                  action={
                    <Link to="/clinician/add-visit">
                      <Button size="sm">{t.newVisit}</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {visits.map((visit) => {
                    const patient = patientMap.get(visit.patientId);
                    const displayName =
                      visit.patientName ||
                      (patient
                        ? `${patient.firstName} ${patient.lastName}`
                        : "Unknown Patient");
                    const reason =
                      visit.reason ||
                      visit.extractedData?.chiefComplaint ||
                      visit.notes;
                    const truncatedReason = reason
                      ? reason.length > 60
                        ? `${reason.slice(0, 60)}…`
                        : reason
                      : "—";
                    const relativeTime = formatDistanceToNow(
                      new Date(visit.createdAt),
                      { addSuffix: true },
                    );

                    return (
                      <Link key={visit.id} to={`/visit/${visit.id}`}>
                        <Card hoverable>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-text-heading">
                                  {displayName}
                                </p>
                                <span className="text-xs text-text-secondary">
                                  {relativeTime}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-text-secondary">
                                {truncatedReason}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {visit.prescriptionCount != null && (
                                <span className="text-xs text-text-secondary">
                                  {visit.prescriptionCount} Rx
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
                                  ? t.completionStatus
                                  : visit.status}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reset Demo Data — visible in non-production */}
        <div className="mt-12 flex flex-col items-center gap-2 border-t border-border-default pt-6">
          {resetResult && (
            <p className="text-sm text-text-secondary">{resetResult}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            loading={resetting}
            onClick={handleResetDemo}
            className="text-xs text-text-tertiary"
          >
            Reset Demo Data
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export function ClinicianDashboard() {
  return (
    <main className="min-h-screen">
      <Routes>
        <Route index element={<ClinicianHomePage />} />
        <Route path="add-visit" element={<AddVisitPage />} />
        <Route path="patient/:patientId" element={<PatientDetailStub />} />
        <Route path="*" element={<Navigate to="/clinician" replace />} />
      </Routes>
    </main>
  );
}

function PatientDetailStub() {
  const { t } = useTranslation();
  return (
    <PageTransition>
      <div className="p-8">
        <h1 className="text-h1 text-text-heading">{t.visitPatientInfo}</h1>
        <p className="mt-2 text-text-secondary">Patient detail page — coming in Part 5.</p>
      </div>
    </PageTransition>
  );
}
