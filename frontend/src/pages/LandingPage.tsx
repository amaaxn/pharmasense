import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../i18n";
import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import {
  Shield,
  Brain,
  Pill,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingDown,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Recommendations",
    desc: "Intelligent drug selection based on patient history, allergies, and formulary data.",
    gradient: "from-ps-burgundy/20 to-primary/20",
  },
  {
    icon: Shield,
    title: "Safety Checks",
    desc: "Real-time interaction warnings, allergy detection, and contraindication alerts.",
    gradient: "from-ps-crimson/20 to-ps-green/15",
  },
  {
    icon: Pill,
    title: "Formulary Validation",
    desc: "Instant coverage verification with tier pricing and prior-auth requirements.",
    gradient: "from-ps-wine/20 to-primary/20",
  },
];

const workflow = [
  { step: "01", title: "Patient Check-in", desc: "Verify demographics and insurance coverage" },
  { step: "02", title: "Clinical Assessment", desc: "AI-assisted notes and handwriting OCR" },
  { step: "03", title: "Prescription Review", desc: "Safety checks, alternatives, and approval" },
  { step: "04", title: "Patient Delivery", desc: "Digital pack with voice instructions" },
];

const stats = [
  { value: "40%", label: "Copay Reduction", icon: TrendingDown, color: "text-ps-green" },
  { value: "12K+", label: "Safety Alerts", icon: Shield, color: "text-ps-red" },
  { value: "98%", label: "Formulary Match", icon: CheckCircle2, color: "text-primary" },
  { value: "5K+", label: "Active Patients", icon: Users, color: "text-ps-blue" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export function LandingPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <PageTransition>
      <main className="min-h-screen">
        {/* Hero */}
        <section
          id="overview"
          className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 py-28 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 max-w-4xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full glass px-5 py-2 text-sm text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Coverage-aware prescription engine
            </motion.div>

            <img
              src="/logo.png"
              alt=""
              className="mx-auto mb-6 h-28 w-auto drop-shadow-[0_0_24px_rgba(127,29,58,0.5)] md:h-36"
            />
            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl">
              <span className="text-gradient-brand">Pharma</span>
              <span className="text-gradient-brand-accent">Sense</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              AI-powered prescription decision engine with real-time formulary
              validation, safety checks, and patient cost optimization.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link to={user ? (user.role === "clinician" ? "/clinician" : "/patient") : "/login"}>
                <button className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-ps-burgundy via-ps-crimson to-primary px-8 text-base font-semibold text-white shadow-glow-brand transition hover:opacity-90">
                  {user ? "Go to Dashboard" : t.signIn} <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <a href="#features">
                <button className="glass h-12 rounded-xl px-8 text-base font-medium text-foreground transition hover:bg-secondary/60">
                  Learn More
                </button>
              </a>
            </motion.div>
          </motion.div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-ps-burgundy/10 blur-[100px]" />
            <div className="absolute bottom-1/3 right-1/3 h-56 w-56 rounded-full bg-primary/8 blur-[80px]" />
            <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-ps-crimson/6 blur-[80px]" />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-16 max-w-xl">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t.navFeatures}
              </span>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Everything clinicians need
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Safe, cost-effective prescribing powered by AI.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  {...fadeUp}
                  transition={{ delay: i * 0.12 }}
                  className="group glass-card rounded-2xl p-7 card-hover"
                >
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient}`}>
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Stepper */}
        <section id="workflow" className="relative px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-16 max-w-xl">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t.navWorkflow}
              </span>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Streamlined clinical workflow
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From check-in to delivery in four steps.
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-4">
              {workflow.map((w, i) => (
                <motion.div key={w.step} {...fadeUp} transition={{ delay: i * 0.12 }} className="relative">
                  {i < workflow.length - 1 && <div className="stepper-line hidden md:block" />}
                  <div className="glass-card rounded-2xl p-6 card-hover">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ps-burgundy to-primary text-sm font-bold text-white shadow-glow-brand">
                      {w.step}
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{w.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Impact Stats */}
        <section id="impact" className="relative px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-16 max-w-xl">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t.navImpact}
              </span>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Measurable improvements
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real outcomes in patient care and cost savings.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring", bounce: 0.3 }}
                  className="glass-card rounded-2xl p-7 text-center card-hover"
                >
                  <s.icon className={`mx-auto mb-4 h-7 w-7 ${s.color}`} />
                  <span className="font-display text-4xl font-bold text-foreground">{s.value}</span>
                  <span className="mt-2 block text-sm text-muted-foreground">{s.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="glass px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <img src="/logo.png" alt="" className="h-6 w-auto object-contain" />
              <span className="font-display font-semibold">
                <span className="text-gradient-brand">Pharma</span><span className="text-gradient-brand-accent">Sense</span>
              </span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Coverage-aware prescription engine
            </div>
          </div>
        </footer>
      </main>
    </PageTransition>
  );
}
