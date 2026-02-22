import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../i18n";

function PatientProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-8">
      <h1 className="text-h1 text-text-heading">{t.pageProfile}</h1>
      {user && <p className="mt-2 text-text-secondary">Welcome, {user.email}</p>}
    </div>
  );
}

function PatientPrescriptionsPage() {
  return (
    <div className="p-8">
      <h1 className="text-h1 text-text-heading">My Prescriptions</h1>
      <p className="mt-2 text-text-secondary">No prescriptions yet.</p>
    </div>
  );
}

function PatientVisitsPage() {
  return (
    <div className="p-8">
      <h1 className="text-h1 text-text-heading">My Visits</h1>
      <p className="mt-2 text-text-secondary">No visits yet.</p>
    </div>
  );
}

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
