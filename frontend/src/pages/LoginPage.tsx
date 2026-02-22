import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { PageTransition } from "../components/PageTransition";

export function LoginPage() {
  const { isAuthenticated, user, signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"patient" | "clinician">("patient");
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
        navigate(role === "clinician" ? "/clinician" : "/patient", {
          replace: true,
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold tracking-tight text-primary-900">
          PharmaSense
        </h1>
        <h2 className="mt-2 text-center text-lg text-gray-600">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </h2>

        {signUpSuccess && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            Account created. Check your email for a confirmation link, then sign
            in.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {isSignUp && (
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">
                I am a…
              </legend>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value="patient"
                    checked={role === "patient"}
                    onChange={() => setRole("patient")}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  Patient
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value="clinician"
                    checked={role === "clinician"}
                    onChange={() => setRole("clinician")}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  Clinician
                </label>
              </div>
            </fieldset>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSignUpSuccess(false);
            }}
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </main>
    </PageTransition>
  );
}
