export function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div id="main-content" className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-primary-900">
          PharmaSense
        </h1>
        <p className="mt-4 text-lg text-primary-700">
          Coverage-aware prescription decision engine
        </p>
        <div className="mt-8 flex gap-4">
          <a
            href="/login"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Sign In
          </a>
        </div>
      </div>
    </main>
  );
}
