import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";
import { SkipLink } from "./components/SkipLink";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { AccessibilityToolbar } from "./components/AccessibilityToolbar";
import { useAccessibilitySync } from "./components/useAccessibilitySync";
import { AppRoutes } from "./routes";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useAccessibilitySync();

  return (
    <>
      <SkipLink />
      <Navbar />
      <Sidebar />

      <main id="main-content" className="pt-14">
        <AppRoutes />
      </main>

      <AccessibilityToolbar />
    </>
  );
}
