import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { PageTransition } from "../components/PageTransition";
import { ArrowLeft, Stethoscope, UserCircle } from "lucide-react";
import { motion } from "framer-motion";

export function LoginPage() {
  const { isAuthenticated, user, signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"patient" | "clinician">("clinician");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  if (isAuthenticated && user) {
    const dest = user.role === "clinician" ? "/clinician" : "/patient";
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, role);
        setSignUpSuccess(true);
      } else {
        await signIn(email, password);
        navigate(role === "clinician" ? "/clinician" : "/patient", { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "clinician" as const, label: "Clinician", icon: Stethoscope },
    { value: "patient" as const, label: "Patient", icon: UserCircle },
  ];

  return (
    <PageTransition>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="glass-card rounded-2xl p-8">
            <div className="mb-8 flex items-center gap-3">
              <img src="/logo.png" alt="PharmaSense" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  {isSignUp ? "Create Account" : "Sign In"}
                </h1>
                <p className="text-xs text-muted-foreground">Access your PharmaSense dashboard</p>
              </div>
            </div>


            {signUpSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-ps-green/20 bg-ps-green/8 p-3 text-sm text-ps-green"
              >
                Account created. Check your email for a confirmation link, then sign in.
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="clinician@pharmasense.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-border/50 bg-secondary/50 px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={6}
                  className="h-11 w-full rounded-xl border border-border/50 bg-secondary/50 px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          role === r.value
                            ? "border-primary/40 bg-primary/10 text-primary shadow-glow-purple"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-ps-burgundy to-primary text-sm font-semibold text-white shadow-glow-brand transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Please wait…
                  </span>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSignUpSuccess(false);
                }}
                className="font-medium text-primary hover:text-primary/80"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </motion.div>
      </main>
    </PageTransition>
  );
}
