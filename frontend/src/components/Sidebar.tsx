import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useTranslation } from "../i18n";
import { useReducedMotion } from "../utils/useReducedMotion";
import { slideInLeft, ANIMATION_DURATION } from "../utils/animations";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isLanding = location.pathname === "/";

  const publicNav = [
    { label: t.navOverview, href: isLanding ? "#overview" : "/#overview" },
    { label: t.navFeatures, href: isLanding ? "#features" : "/#features" },
    { label: t.navWorkflow, href: isLanding ? "#workflow" : "/#workflow" },
    { label: t.navImpact, href: isLanding ? "#impact" : "/#impact" },
  ];

  const patientNav = [
    { label: t.navMyProfile, path: "/patient/profile" },
    { label: t.navMyPrescriptions, path: "/patient/prescriptions" },
    { label: t.navMyVisits, path: "/patient/visits" },
  ];

  const clinicianNav = [
    { label: t.navDashboard, path: "/clinician" },
    { label: t.navNewVisit, path: "/clinician/visit/new" },
    { label: t.navAnalytics, path: "/analytics" },
  ];

  const centerLinks = !user
    ? publicNav
    : user.role === "patient"
      ? patientNav
      : clinicianNav;

  useEffect(() => {
    if (!sidebarOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const active = document.activeElement as HTMLElement | null;
      if (!panel.contains(active)) return;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 md:hidden"
        onClick={toggleSidebar}
        aria-hidden
      />

      {/* Drawer */}
      <motion.div
        ref={panelRef}
        initial="hidden"
        animate="visible"
        variants={reducedMotion ? undefined : slideInLeft}
        transition={
          reducedMotion ? { duration: 0 } : { duration: ANIMATION_DURATION.sidebarSlide }
        }
        className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border-default bg-bg-card shadow-modal md:hidden"
        role="dialog"
        aria-label={t.navCloseNavigation}
      >
        <div className="flex h-14 items-center justify-between border-b border-border-default px-4">
          <span className="text-h3 font-bold text-text-heading">PharmaSense</span>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t.navCloseNavigation}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4" aria-label={t.navMain}>
          {centerLinks.map((item) =>
            "path" in item ? (
              <Link
                key={item.path}
                to={item.path}
                onClick={toggleSidebar}
                aria-current={isActive(item.path) ? "page" : undefined}
                className="rounded-lg px-4 py-3 text-text-secondary hover:bg-bg-elevated hover:text-text-primary aria-[current=page]:bg-bg-elevated aria-[current=page]:text-accent-purple aria-[current=page]:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={toggleSidebar}
                className="rounded-lg px-4 py-3 text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
      </motion.div>
    </>
  );
}
