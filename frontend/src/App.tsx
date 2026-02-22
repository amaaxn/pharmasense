import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";
import { SkipLink } from "./components/SkipLink";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { MouseGradientBg } from "./components/MouseGradientBg";
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
      <MouseGradientBg />
      <SkipLink />
      <Navbar />
      <Sidebar />

      <main id="main-content" className="relative z-10 pt-[3.75rem]">
        <AppRoutes />
      </main>

      <AccessibilityToolbar />
    </>
  );
}
