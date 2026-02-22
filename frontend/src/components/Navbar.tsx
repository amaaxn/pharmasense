import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useTranslation } from "../i18n";
import { Button } from "../shared/Button";
import { Avatar } from "../shared/Avatar";

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isLanding = location.pathname === "/";

  // Logged out: Overview, Features, Workflow, Impact (anchor links on landing)
  const publicNav = [
    { label: t.navOverview, href: isLanding ? "#overview" : "/#overview" },
    { label: t.navFeatures, href: isLanding ? "#features" : "/#features" },
    { label: t.navWorkflow, href: isLanding ? "#workflow" : "/#workflow" },
    { label: t.navImpact, href: isLanding ? "#impact" : "/#impact" },
  ];

  // Patient: My Profile, My Prescriptions, My Visits
  const patientNav = [
    { label: t.navMyProfile, path: "/patient/profile" },
    { label: t.navMyPrescriptions, path: "/patient/prescriptions" },
    { label: t.navMyVisits, path: "/patient/visits" },
  ];

  // Clinician: Dashboard, New Visit, Analytics
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

  const profilePath = user?.role === "patient" ? "/patient/profile" : "/clinician";

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-40 w-full border-b border-border-default/50 bg-bg-primary/80 backdrop-blur-md"
      aria-label={t.navMain}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="text-h3 font-bold text-text-heading hover:text-accent-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary rounded"
        >
          PharmaSense
        </Link>

        {/* Center nav — visible on md+ */}
        <div className="hidden md:flex md:items-center md:gap-6">
          {centerLinks.map((item) =>
            "path" in item ? (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive(item.path) ? "page" : undefined}
                className="text-text-secondary hover:text-text-primary aria-[current=page]:text-accent-purple aria-[current=page]:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded px-1"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded px-1"
              >
                {item.label}
              </a>
            ),
          )}
        </div>

        {/* Right: Auth area */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={profilePath}
                className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label={t.pageProfile}
              >
                <Avatar fallback={user.email} size="sm" />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                {t.signOut}
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">
                {t.signIn}
              </Button>
            </Link>
          )}

          {/* Hamburger — mobile */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary md:hidden"
            aria-label={t.navMain}
            aria-expanded={sidebarOpen}
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
