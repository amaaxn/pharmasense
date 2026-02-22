import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { PatientDashboard } from "../pages/PatientDashboard";
import { ClinicianDashboard } from "../pages/ClinicianDashboard";
import { VisitPage } from "../pages/VisitPage";
import { VisitChatPage } from "../pages/VisitChatPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Patient-only */}
      <Route
        path="/patient/*"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Clinician-only */}
      <Route
        path="/clinician/*"
        element={
          <ProtectedRoute allowedRoles={["clinician"]}>
            <ClinicianDashboard />
          </ProtectedRoute>
        }
      />

      {/* Visit — either patient or clinician (participant) */}
      <Route
        path="/visit/:id"
        element={
          <ProtectedRoute allowedRoles={["patient", "clinician"]}>
            <VisitPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/visit/:id/chat"
        element={
          <ProtectedRoute allowedRoles={["patient", "clinician"]}>
            <VisitChatPage />
          </ProtectedRoute>
        }
      />

      {/* Analytics — clinician-only */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={["clinician"]}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
