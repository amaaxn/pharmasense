import { useAuthStore } from "../stores/authStore";

export function PatientDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
      {user && (
        <p className="mt-2 text-gray-600">Welcome, {user.email}</p>
      )}
    </main>
  );
}
