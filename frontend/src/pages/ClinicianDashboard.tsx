import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../i18n";

function ClinicianHomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-8">
      <h1 className="text-h1 text-text-heading">{t.navDashboard}</h1>
      {user && <p className="mt-2 text-text-secondary">Welcome, {user.email}</p>}
    </div>
  );
}

function NewVisitPage() {
  const { t } = useTranslation();
  return (
    <div className="p-8">
      <h1 className="text-h1 text-text-heading">{t.pageNewVisit}</h1>
      <p className="mt-2 text-text-secondary">Create a new visit.</p>
    </div>
  );
}

export function ClinicianDashboard() {
  return (
    <main className="min-h-screen">
      <Routes>
        <Route index element={<ClinicianHomePage />} />
        <Route path="visit/new" element={<NewVisitPage />} />
        <Route path="*" element={<Navigate to="/clinician" replace />} />
      </Routes>
    </main>
  );
}
