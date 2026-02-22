import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { Button } from "../shared/Button";
import { PageTransition } from "../components/PageTransition";

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <PageTransition>
    <main className="min-h-screen">
      {/* Hero / Overview */}
      <section
        id="overview"
        className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-24 text-center"
      >
        <h1 className="text-display font-bold text-text-heading">
          {t.pageLanding}
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-text-secondary">
          Coverage-aware prescription decision engine
        </p>
        <div className="mt-8">
          <Link to="/login">
            <Button variant="primary" size="lg">
              {t.signIn}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-border-default px-4 py-16"
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="text-h2 text-text-heading">{t.navFeatures}</h2>
          <p className="mt-4 text-text-secondary">
            AI-powered recommendations, formulary validation, and patient safety
            checks.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section
        id="workflow"
        className="border-t border-border-default px-4 py-16"
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="text-h2 text-text-heading">{t.navWorkflow}</h2>
          <p className="mt-4 text-text-secondary">
            Streamlined visit creation, structured extraction, and prescription
            approval workflow.
          </p>
        </div>
      </section>

      {/* Impact */}
      <section
        id="impact"
        className="border-t border-border-default px-4 py-16"
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="text-h2 text-text-heading">{t.navImpact}</h2>
          <p className="mt-4 text-text-secondary">
            Reduce copay costs, improve safety, and save time for clinicians and
            patients.
          </p>
        </div>
      </section>
    </main>
    </PageTransition>
  );
}
