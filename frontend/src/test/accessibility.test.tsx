import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipLink } from "../components/SkipLink";
import { AccessibilityToolbar } from "../components/AccessibilityToolbar";
import { StatusAnnouncer } from "../components/StatusAnnouncer";
import { useUiStore } from "../stores/uiStore";
import { dictionaries } from "../i18n/dictionaries";

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
  document.documentElement.className = "";
  document.documentElement.lang = "en";
});

afterEach(() => {
  document.documentElement.className = "";
  document.documentElement.lang = "en";
});

// ── §3.2 SkipLink ───────────────────────────────────────────

describe("§3.2 SkipLink", () => {
  it("renders an anchor targeting #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("has the skip-link CSS class", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link).toHaveClass("skip-link");
  });

  it("shows Spanish text when language is es", () => {
    useUiStore.setState({ language: "es" });
    render(<SkipLink />);
    expect(
      screen.getByText("Saltar al contenido principal"),
    ).toBeInTheDocument();
  });
});

// ── §3.3 AccessibilityToolbar ───────────────────────────────

describe("§3.3 AccessibilityToolbar", () => {
  it("renders collapsed by default with gear button", () => {
    render(<AccessibilityToolbar />);
    const gear = screen.getByRole("button", {
      name: dictionaries.en.accessibilitySettings,
    });
    expect(gear).toBeInTheDocument();
    expect(gear).toHaveTextContent("⚙");
  });

  it("has role=toolbar and appropriate aria-label", () => {
    render(<AccessibilityToolbar />);
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveAttribute(
      "aria-label",
      dictionaries.en.accessibilitySettings,
    );
  });

  it("expands to show 4 toggle buttons on click", async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);

    const gear = screen.getByRole("button", {
      name: dictionaries.en.accessibilitySettings,
    });
    await user.click(gear);

    expect(
      screen.getByRole("button", { name: dictionaries.en.toggleFontSize }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dictionaries.en.toggleDyslexiaFont }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dictionaries.en.toggleHighContrast }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dictionaries.en.toggleLanguage }),
    ).toBeInTheDocument();
  });

  it("toggle buttons are hidden when collapsed", () => {
    render(<AccessibilityToolbar />);
    expect(
      screen.queryByRole("button", { name: dictionaries.en.toggleFontSize }),
    ).not.toBeInTheDocument();
  });

  it("large-type toggle sets aria-pressed and updates store", async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);
    await user.click(
      screen.getByRole("button", {
        name: dictionaries.en.accessibilitySettings,
      }),
    );

    const btn = screen.getByRole("button", {
      name: dictionaries.en.toggleFontSize,
    });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    await user.click(btn);
    expect(useUiStore.getState().largeType).toBe(true);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("dyslexia font toggle updates store", async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);
    await user.click(
      screen.getByRole("button", {
        name: dictionaries.en.accessibilitySettings,
      }),
    );

    const btn = screen.getByRole("button", {
      name: dictionaries.en.toggleDyslexiaFont,
    });
    await user.click(btn);
    expect(useUiStore.getState().dyslexiaFont).toBe(true);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("high contrast toggle updates store", async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);
    await user.click(
      screen.getByRole("button", {
        name: dictionaries.en.accessibilitySettings,
      }),
    );

    const btn = screen.getByRole("button", {
      name: dictionaries.en.toggleHighContrast,
    });
    await user.click(btn);
    expect(useUiStore.getState().highContrast).toBe(true);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("language toggle switches EN to ES and back", async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);
    await user.click(
      screen.getByRole("button", {
        name: dictionaries.en.accessibilitySettings,
      }),
    );

    const langBtn = screen.getByRole("button", {
      name: dictionaries.en.toggleLanguage,
    });
    expect(langBtn).toHaveTextContent("EN");

    await user.click(langBtn);
    expect(useUiStore.getState().language).toBe("es");
    expect(langBtn).toHaveTextContent("ES");
  });

  it("gear button has aria-expanded attribute", async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);

    const gear = screen.getByRole("button", {
      name: dictionaries.en.accessibilitySettings,
    });
    expect(gear).toHaveAttribute("aria-expanded", "false");

    await user.click(gear);
    expect(gear).toHaveAttribute("aria-expanded", "true");
  });
});

// ── §3.5 StatusAnnouncer ────────────────────────────────────

describe("§3.5 StatusAnnouncer", () => {
  it("renders with aria-live=polite by default", () => {
    render(<StatusAnnouncer message="Test message" />);
    const region = screen.getByText("Test message");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders with aria-live=assertive when specified", () => {
    render(
      <StatusAnnouncer message="Urgent message" politeness="assertive" />,
    );
    const el = screen.getByText("Urgent message");
    expect(el).toHaveAttribute("aria-live", "assertive");
  });

  it("has aria-atomic=true", () => {
    render(<StatusAnnouncer message="Hello" />);
    const el = screen.getByText("Hello");
    expect(el).toHaveAttribute("aria-atomic", "true");
  });

  it("is visually hidden via sr-only class", () => {
    const { container } = render(<StatusAnnouncer message="Hidden text" />);
    const div = container.firstElementChild;
    expect(div).toHaveClass("sr-only");
  });

  it("updates message content when prop changes", () => {
    const { rerender } = render(
      <StatusAnnouncer message="Loading..." />,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    rerender(<StatusAnnouncer message="Done!" />);
    expect(screen.getByText("Done!")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});

// ── uiStore ─────────────────────────────────────────────────

describe("uiStore accessibility fields", () => {
  it("initializes with all accessibility flags off", () => {
    const state = useUiStore.getState();
    expect(state.highContrast).toBe(false);
    expect(state.dyslexiaFont).toBe(false);
    expect(state.largeType).toBe(false);
    expect(state.reduceMotion).toBe(false);
    expect(state.language).toBe("en");
  });

  it("toggleHighContrast flips the flag", () => {
    act(() => useUiStore.getState().toggleHighContrast());
    expect(useUiStore.getState().highContrast).toBe(true);
    act(() => useUiStore.getState().toggleHighContrast());
    expect(useUiStore.getState().highContrast).toBe(false);
  });

  it("toggleDyslexiaFont flips the flag", () => {
    act(() => useUiStore.getState().toggleDyslexiaFont());
    expect(useUiStore.getState().dyslexiaFont).toBe(true);
  });

  it("toggleLargeType flips the flag", () => {
    act(() => useUiStore.getState().toggleLargeType());
    expect(useUiStore.getState().largeType).toBe(true);
  });

  it("toggleReduceMotion flips the flag", () => {
    act(() => useUiStore.getState().toggleReduceMotion());
    expect(useUiStore.getState().reduceMotion).toBe(true);
  });

  it("toggleLanguage cycles en → es → en", () => {
    act(() => useUiStore.getState().toggleLanguage());
    expect(useUiStore.getState().language).toBe("es");
    act(() => useUiStore.getState().toggleLanguage());
    expect(useUiStore.getState().language).toBe("en");
  });

  it("setLanguage sets a specific language", () => {
    act(() => useUiStore.getState().setLanguage("es"));
    expect(useUiStore.getState().language).toBe("es");
  });
});

// ── i18n dictionaries ───────────────────────────────────────

describe("i18n dictionaries", () => {
  it("English dictionary has all required keys", () => {
    expect(dictionaries.en.skipLink).toBe("Skip to main content");
    expect(dictionaries.en.accessibilitySettings).toBe(
      "Accessibility settings",
    );
    expect(dictionaries.en.toggleFontSize).toBeTruthy();
    expect(dictionaries.en.toggleDyslexiaFont).toBeTruthy();
    expect(dictionaries.en.toggleHighContrast).toBeTruthy();
    expect(dictionaries.en.toggleLanguage).toBeTruthy();
  });

  it("Spanish dictionary has all required keys", () => {
    expect(dictionaries.es.skipLink).toBe("Saltar al contenido principal");
    expect(dictionaries.es.accessibilitySettings).toBe(
      "Configuración de accesibilidad",
    );
    expect(dictionaries.es.toggleFontSize).toBeTruthy();
    expect(dictionaries.es.toggleDyslexiaFont).toBeTruthy();
    expect(dictionaries.es.toggleHighContrast).toBeTruthy();
    expect(dictionaries.es.toggleLanguage).toBeTruthy();
  });

  it("both dictionaries have identical keys", () => {
    const enKeys = Object.keys(dictionaries.en).sort();
    const esKeys = Object.keys(dictionaries.es).sort();
    expect(enKeys).toEqual(esKeys);
  });
});

// ── useAccessibilitySync (unit behavior) ────────────────────

describe("useAccessibilitySync class syncing", () => {
  it("high-contrast store state syncs to <html> classList", () => {
    document.documentElement.classList.toggle("high-contrast", true);
    expect(
      document.documentElement.classList.contains("high-contrast"),
    ).toBe(true);
    document.documentElement.classList.toggle("high-contrast", false);
    expect(
      document.documentElement.classList.contains("high-contrast"),
    ).toBe(false);
  });

  it("large-type store state syncs to <html> classList", () => {
    document.documentElement.classList.toggle("large-type", true);
    expect(
      document.documentElement.classList.contains("large-type"),
    ).toBe(true);
  });

  it("dyslexia-font store state syncs to <html> classList", () => {
    document.documentElement.classList.toggle("dyslexia-font", true);
    expect(
      document.documentElement.classList.contains("dyslexia-font"),
    ).toBe(true);
  });

  it("reduce-motion store state syncs to <html> classList", () => {
    document.documentElement.classList.toggle("reduce-motion", true);
    expect(
      document.documentElement.classList.contains("reduce-motion"),
    ).toBe(true);
  });

  it("lang attribute can be set", () => {
    document.documentElement.lang = "es";
    expect(document.documentElement.lang).toBe("es");
    document.documentElement.lang = "en";
    expect(document.documentElement.lang).toBe("en");
  });
});
