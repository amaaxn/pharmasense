import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useTranslation } from "../i18n";
import { Menu, X, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  const isLanding = location.pathname === "/";

  const publicNav = [
    { label: t.navOverview, href: isLanding ? "#overview" : "/#overview" },
    { label: t.navFeatures, href: isLanding ? "#features" : "/#features" },
    { label: t.navWorkflow, href: isLanding ? "#workflow" : "/#workflow" },
    { label: t.navImpact, href: isLanding ? "#impact" : "/#impact" },
  ];

  const displayName = user?.email?.split("@")[0] ?? "";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed left-0 right-0 top-0 z-40 glass"
      style={{ height: "3.75rem" }}
      aria-label={t.navMain}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="group flex items-center gap-2 text-foreground">
            <img
              src="/logo.png"
              alt="PharmaSense logo"
              className="h-9 w-auto object-contain drop-shadow-[0_0_8px_rgba(127,29,58,0.4)] transition-transform group-hover:scale-105"
            />
            <span className="font-display text-lg font-bold tracking-tight">
              <span className="text-gradient-brand">Pharma</span><span className="text-gradient-brand-accent">Sense</span>
            </span>
          </Link>
        </div>

        {/* Center: desktop nav pill — only shown when logged out (dashboards have their own tab nav) */}
        {!user && (
          <div className="hidden items-center gap-0.5 rounded-xl bg-secondary/40 p-1 md:flex">
            {publicNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}

        {/* Right: auth */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ps-burgundy/40 to-primary/30 text-sm font-semibold text-foreground ring-1 ring-ps-burgundy/30">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight text-foreground">{displayName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{user.role}</span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                aria-label={t.signOut}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="rounded-lg bg-gradient-to-r from-ps-burgundy to-primary px-4 py-1.5 text-sm font-medium text-white shadow-glow-brand transition hover:opacity-90">
                {t.signIn}
              </button>
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
