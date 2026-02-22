import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useTranslation } from "../i18n";
import {
  User,
  Pill,
  Calendar,
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Eye,
  Zap,
  Workflow,
  TrendingUp,
} from "lucide-react";

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const publicNav = [
    { label: t.navOverview, href: "#overview", icon: Eye },
    { label: t.navFeatures, href: "#features", icon: Zap },
    { label: t.navWorkflow, href: "#workflow", icon: Workflow },
    { label: t.navImpact, href: "#impact", icon: TrendingUp },
  ];

  const patientNav = [
    { label: t.navMyProfile, path: "/patient/profile", icon: User },
    { label: t.navMyPrescriptions, path: "/patient/prescriptions", icon: Pill },
    { label: t.navMyVisits, path: "/patient/visits", icon: Calendar },
  ];

  const clinicianNav = [
    { label: t.navDashboard, path: "/clinician", icon: LayoutDashboard },
    { label: t.navNewVisit, path: "/clinician/add-visit", icon: PlusCircle },
    { label: t.navAnalytics, path: "/analytics", icon: BarChart3 },
  ];

  const navItems = !user
    ? publicNav
    : user.role === "clinician"
      ? clinicianNav
      : patientNav;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          <motion.aside
            initial={{ x: "-100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-0 left-0 top-[3.75rem] z-50 w-72 glass p-5 md:hidden"
            role="navigation"
            aria-label={t.navMain}
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item, i) => {
                const Icon = item.icon;
                if ("href" in item) {
                  return (
                    <motion.a
                      key={item.label}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </motion.a>
                  );
                }
                return (
                  <motion.div
                    key={item.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive(item.path)
                          ? "bg-primary/12 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
