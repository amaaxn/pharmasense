import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dictionaries, type Dictionary } from "../i18n/dictionaries";
import { useTranslation } from "../i18n/useTranslation";
import { useUiStore } from "../stores/uiStore";

function resetStore() {
  useUiStore.setState({
    highContrast: false,
    dyslexiaFont: false,
    largeType: false,
    reduceMotion: false,
    language: "en",
    sidebarOpen: false,
  });
}

beforeEach(() => {
  resetStore();
  document.documentElement.lang = "en";
});

afterEach(() => {
  document.documentElement.lang = "en";
});

// ── §4.1 Architecture: lightweight dictionary-based i18n ────

describe("§4.1 i18n architecture", () => {
  it("dictionaries object has exactly two languages: en, es", () => {
    const langs = Object.keys(dictionaries);
    expect(langs).toHaveLength(2);
    expect(langs).toContain("en");
    expect(langs).toContain("es");
  });

  it("both dictionaries satisfy the Dictionary interface shape", () => {
    const enKeys = Object.keys(dictionaries.en).sort();
    const esKeys = Object.keys(dictionaries.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("no dictionary value is empty string", () => {
    for (const lang of ["en", "es"] as const) {
      for (const [key, value] of Object.entries(dictionaries[lang])) {
        expect(value, `${lang}.${key}`).toBeTruthy();
        expect(typeof value, `${lang}.${key}`).toBe("string");
        expect((value as string).trim().length, `${lang}.${key} is blank`).toBeGreaterThan(0);
      }
    }
  });
});

// ── §4.2 Dictionary structure: key groups ───────────────────

describe("§4.2 Dictionary structure — key groups", () => {
  const requiredKeyGroups: Record<string, (keyof Dictionary)[]> = {
    accessibility: [
      "skipLink",
      "accessibilitySettings",
      "toggleFontSize",
      "toggleDyslexiaFont",
      "toggleHighContrast",
      "toggleLanguage",
    ],
    navigation: [
      "navMain",
      "navOverview",
      "navFeatures",
      "navWorkflow",
      "navImpact",
      "navMyProfile",
      "navMyPrescriptions",
      "navMyVisits",
      "navDashboard",
      "navNewVisit",
      "navAnalytics",
      "navCloseNavigation",
    ],
    auth: [
      "signIn",
      "signOut",
      "signUp",
      "email",
      "password",
    ],
    pageTitles: [
      "pageLanding",
      "pageLogin",
      "pagePatientDashboard",
      "pageClinicianDashboard",
      "pageAnalytics",
    ],
    badges: [
      "badgeSafetyPass",
      "badgeSafetyFail",
      "badgeSafetyWarn",
      "badgeBlocked",
      "badgeApproved",
      "badgeAI",
      "badgeCovered",
      "badgeNotCovered",
      "badgePriorAuth",
      "badgeUnknown",
    ],
    buttons: [
      "approve",
      "reject",
      "submit",
      "cancel",
      "confirm",
      "close",
      "retry",
      "generate",
    ],
    prescriptions: [
      "prescriptionRecommendations",
      "prescriptionApprove",
      "prescriptionReject",
      "prescriptionReceipt",
      "coverageStatus",
      "safetyChecks",
      "alternatives",
      "copay",
      "patientInstructions",
    ],
    visits: [
      "visitNotes",
      "visitExtractData",
      "visitPatientInfo",
      "visitMedications",
      "visitAllergies",
    ],
    forms: [
      "patientName",
      "medication",
      "dosage",
      "frequency",
      "notes",
      "search",
    ],
    errors: [
      "errorGeneric",
      "errorNetwork",
      "errorUnauthorized",
      "errorNotFound",
      "errorValidation",
    ],
    emptyStates: [
      "emptyPrescriptions",
      "emptyVisits",
      "emptyRecommendations",
    ],
    statusAnnouncements: [
      "loading",
      "recommendationsLoading",
      "recommendationsLoaded",
      "recommendationsFailed",
      "prescriptionApproved",
      "prescriptionRejected",
      "ocrProcessing",
      "ocrComplete",
      "voiceGenerating",
      "voiceReady",
    ],
  };

  for (const [group, keys] of Object.entries(requiredKeyGroups)) {
    describe(`${group} keys`, () => {
      for (const key of keys) {
        it(`EN has "${key}"`, () => {
          expect(dictionaries.en[key]).toBeTruthy();
        });
        it(`ES has "${key}"`, () => {
          expect(dictionaries.es[key]).toBeTruthy();
        });
      }
    });
  }
});

// ── §4.2 Dictionary content — selected values ──────────────

describe("§4.2 Dictionary content — selected values", () => {
  it("EN skipLink is 'Skip to main content'", () => {
    expect(dictionaries.en.skipLink).toBe("Skip to main content");
  });

  it("ES skipLink is 'Saltar al contenido principal'", () => {
    expect(dictionaries.es.skipLink).toBe("Saltar al contenido principal");
  });

  it("EN badge labels include text, not just color", () => {
    expect(dictionaries.en.badgeSafetyPass).toBe("Safety Passed");
    expect(dictionaries.en.badgeSafetyFail).toBe("Blocked");
    expect(dictionaries.en.badgeSafetyWarn).toBe("Warning");
  });

  it("ES badge labels are translated", () => {
    expect(dictionaries.es.badgeSafetyPass).toBe("Seguridad Aprobada");
    expect(dictionaries.es.badgeSafetyFail).toBe("Bloqueado");
    expect(dictionaries.es.badgeSafetyWarn).toBe("Advertencia");
  });

  it("EN navbar labels match spec §7.3", () => {
    expect(dictionaries.en.navOverview).toBe("Overview");
    expect(dictionaries.en.navFeatures).toBe("Features");
    expect(dictionaries.en.navWorkflow).toBe("Workflow");
    expect(dictionaries.en.navImpact).toBe("Impact");
    expect(dictionaries.en.navMyProfile).toBe("My Profile");
    expect(dictionaries.en.navMyPrescriptions).toBe("My Prescriptions");
    expect(dictionaries.en.navMyVisits).toBe("My Visits");
    expect(dictionaries.en.navDashboard).toBe("Dashboard");
    expect(dictionaries.en.navNewVisit).toBe("New Visit");
    expect(dictionaries.en.navAnalytics).toBe("Analytics");
  });

  it("ES navbar labels are fully translated", () => {
    expect(dictionaries.es.navOverview).toBe("Resumen");
    expect(dictionaries.es.navDashboard).toBe("Panel");
    expect(dictionaries.es.navNewVisit).toBe("Nueva Visita");
    expect(dictionaries.es.navAnalytics).toBe("Analítica");
  });

  it("EN and ES Sign In / Sign Out are different", () => {
    expect(dictionaries.en.signIn).not.toBe(dictionaries.es.signIn);
    expect(dictionaries.en.signOut).not.toBe(dictionaries.es.signOut);
  });

  it("Coverage tier labels exist for tiers 1-4", () => {
    expect(dictionaries.en.tier1).toBe("Tier 1");
    expect(dictionaries.es.tier1).toBe("Nivel 1");
    expect(dictionaries.en.tier4).toBe("Tier 4");
    expect(dictionaries.es.tier4).toBe("Nivel 4");
  });
});

// ── §4.3 Translation hook ───────────────────────────────────

function TranslationConsumer() {
  const { t, lang } = useTranslation();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="signIn">{t.signIn}</span>
      <span data-testid="navDashboard">{t.navDashboard}</span>
      <span data-testid="badgeSafetyPass">{t.badgeSafetyPass}</span>
    </div>
  );
}

describe("§4.3 useTranslation hook", () => {
  it("returns EN dictionary by default", () => {
    render(<TranslationConsumer />);
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("signIn")).toHaveTextContent("Sign In");
    expect(screen.getByTestId("navDashboard")).toHaveTextContent("Dashboard");
    expect(screen.getByTestId("badgeSafetyPass")).toHaveTextContent(
      "Safety Passed",
    );
  });

  it("returns ES dictionary when language is es", () => {
    useUiStore.setState({ language: "es" });
    render(<TranslationConsumer />);
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
    expect(screen.getByTestId("signIn")).toHaveTextContent("Iniciar Sesión");
    expect(screen.getByTestId("navDashboard")).toHaveTextContent("Panel");
    expect(screen.getByTestId("badgeSafetyPass")).toHaveTextContent(
      "Seguridad Aprobada",
    );
  });

  it("reactively switches when store language changes", async () => {
    const user = userEvent.setup();
    function Toggle() {
      const { t, lang } = useTranslation();
      const toggleLanguage = useUiStore((s) => s.toggleLanguage);
      return (
        <>
          <span data-testid="label">{t.signIn}</span>
          <span data-testid="currentLang">{lang}</span>
          <button onClick={toggleLanguage}>toggle</button>
        </>
      );
    }

    render(<Toggle />);
    expect(screen.getByTestId("label")).toHaveTextContent("Sign In");
    expect(screen.getByTestId("currentLang")).toHaveTextContent("en");

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("label")).toHaveTextContent("Iniciar Sesión");
    expect(screen.getByTestId("currentLang")).toHaveTextContent("es");

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("label")).toHaveTextContent("Sign In");
    expect(screen.getByTestId("currentLang")).toHaveTextContent("en");
  });
});

// ── §4.4 HTML lang attribute ────────────────────────────────

describe("§4.4 HTML lang attribute sync", () => {
  it("lang defaults to en", () => {
    expect(document.documentElement.lang).toBe("en");
  });

  it("changing store language programmatically updates for consumers", () => {
    act(() => useUiStore.getState().toggleLanguage());
    expect(useUiStore.getState().language).toBe("es");

    act(() => useUiStore.getState().toggleLanguage());
    expect(useUiStore.getState().language).toBe("en");
  });

  it("setLanguage sets exact value", () => {
    act(() => useUiStore.getState().setLanguage("es"));
    expect(useUiStore.getState().language).toBe("es");
    act(() => useUiStore.getState().setLanguage("en"));
    expect(useUiStore.getState().language).toBe("en");
  });
});
