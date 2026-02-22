import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const cssContent = fs.readFileSync(
  path.resolve(__dirname, "../index.css"),
  "utf-8",
);

const htmlContent = fs.readFileSync(
  path.resolve(__dirname, "../../index.html"),
  "utf-8",
);

// ── §1.1 Color palette ──────────────────────────────────────

describe("§1.1 Color Palette tokens", () => {
  const backgroundTokens: Record<string, string> = {
    "--color-bg-primary": "#070609",
    "--color-bg-card": "#121018",
    "--color-bg-input": "#18141F",
    "--color-bg-elevated": "#1F1828",
  };

  const borderTokens: Record<string, string> = {
    "--color-border-default": "#33273F",
    "--color-border-focus": "#A855F7",
  };

  const textTokens: Record<string, string> = {
    "--color-text-primary": "#F3EEF7",
    "--color-text-secondary": "#B6A9C9",
    "--color-text-heading": "#FFFFFF",
  };

  const accentTokens: Record<string, string> = {
    "--color-accent-purple": "#A855F7",
    "--color-accent-plum": "#7C3AED",
    "--color-accent-burgundy": "#7F1D3A",
    "--color-accent-green": "#22C55E",
    "--color-accent-red": "#DC2626",
    "--color-accent-amber": "#F59E0B",
    "--color-accent-maroon": "#5B0F1F",
  };

  const safetyTokens: Record<string, string> = {
    "--color-safety-pass": "#22C55E",
    "--color-safety-fail": "#DC2626",
    "--color-safety-warn": "#F59E0B",
  };

  const coverageTokens: Record<string, string> = {
    "--color-coverage-covered": "#22C55E",
    "--color-coverage-not-covered": "#B91C1C",
    "--color-coverage-prior-auth": "#F59E0B",
    "--color-coverage-unknown": "#9CA3AF",
  };

  const tierTokens: Record<string, string> = {
    "--color-tier-1": "#22C55E",
    "--color-tier-2": "#A855F7",
    "--color-tier-3": "#F59E0B",
    "--color-tier-4": "#DC2626",
  };

  const allTokenGroups = [
    ["background", backgroundTokens],
    ["border", borderTokens],
    ["text", textTokens],
    ["accent", accentTokens],
    ["safety", safetyTokens],
    ["coverage", coverageTokens],
    ["tier", tierTokens],
  ] as const;

  for (const [group, tokens] of allTokenGroups) {
    for (const [token, hex] of Object.entries(tokens)) {
      it(`defines ${group} token ${token} as ${hex}`, () => {
        const pattern = new RegExp(
          `${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*${hex}`,
          "i",
        );
        expect(cssContent).toMatch(pattern);
      });
    }
  }
});

// ── §1.1 High-contrast overrides ────────────────────────────

describe("§1.1 High-contrast mode overrides", () => {
  const overrides: Record<string, string> = {
    "--color-bg-primary": "#000000",
    "--color-text-primary": "#FFFFFF",
    "--color-border-default": "#FFFFFF",
    "--color-accent-purple": "#C084FC",
  };

  it("contains a .high-contrast rule block", () => {
    expect(cssContent).toMatch(/\.high-contrast\s*\{/);
  });

  for (const [token, hex] of Object.entries(overrides)) {
    it(`high-contrast overrides ${token} to ${hex}`, () => {
      const ruleMatch = cssContent.match(
        /\.high-contrast\s*\{([^}]+)\}/,
      );
      expect(ruleMatch).not.toBeNull();
      const ruleBody = ruleMatch![1]!;
      const pattern = new RegExp(
        `${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*${hex}`,
        "i",
      );
      expect(ruleBody).toMatch(pattern);
    });
  }
});

// ── §1.2 Typography scale ───────────────────────────────────

describe("§1.2 Typography scale tokens", () => {
  const typographyTokens: Record<string, string> = {
    "--text-display": "3rem",
    "--text-h1": "2rem",
    "--text-h2": "1.5rem",
    "--text-h3": "1.25rem",
    "--text-body": "1rem",
    "--text-body-lg": "1.125rem",
    "--text-sm": "0.875rem",
    "--text-xs": "0.75rem",
    "--text-mono": "0.875rem",
  };

  for (const [token, size] of Object.entries(typographyTokens)) {
    it(`defines ${token} as ${size}`, () => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`${escaped}\\s*:\\s*${size}`);
      expect(cssContent).toMatch(pattern);
    });
  }

  const fontWeights: Record<string, string> = {
    "--text-display--font-weight": "700",
    "--text-h1--font-weight": "700",
    "--text-h2--font-weight": "600",
    "--text-h3--font-weight": "600",
    "--text-xs--font-weight": "500",
  };

  for (const [token, weight] of Object.entries(fontWeights)) {
    it(`defines ${token} as ${weight}`, () => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(cssContent).toMatch(new RegExp(`${escaped}\\s*:\\s*${weight}`));
    });
  }

  it("defines Inter as the primary sans-serif font", () => {
    expect(cssContent).toMatch(/--font-sans:\s*"Inter"/);
  });

  it("defines JetBrains Mono as the monospace font", () => {
    expect(cssContent).toMatch(/--font-mono:\s*"JetBrains Mono"/);
  });

  it("defines OpenDyslexic as the dyslexia font", () => {
    expect(cssContent).toMatch(/--font-dyslexia:\s*"OpenDyslexic"/);
  });
});

// ── §1.2 Large type mode ────────────────────────────────────

describe("§1.2 Large type mode (1.25x)", () => {
  it("contains a .large-type rule block", () => {
    expect(cssContent).toMatch(/\.large-type\s*\{/);
  });

  const scaledSizes: Record<string, string> = {
    "--text-display": "3.75rem",
    "--text-h1": "2.5rem",
    "--text-h2": "1.875rem",
    "--text-h3": "1.5625rem",
    "--text-body": "1.25rem",
    "--text-body-lg": "1.40625rem",
    "--text-sm": "1.09375rem",
    "--text-xs": "0.9375rem",
    "--text-mono": "1.09375rem",
  };

  for (const [token, scaled] of Object.entries(scaledSizes)) {
    it(`large-type scales ${token} to ${scaled}`, () => {
      const ruleMatch = cssContent.match(/\.large-type\s*\{([^}]+)\}/);
      expect(ruleMatch).not.toBeNull();
      const ruleBody = ruleMatch![1]!;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(ruleBody).toMatch(new RegExp(`${escaped}\\s*:\\s*${scaled}`));
    });
  }
});

// ── §1.2 Dyslexia font mode ────────────────────────────────

describe("§1.2 Dyslexia font mode", () => {
  it("contains a .dyslexia-font rule block", () => {
    expect(cssContent).toMatch(/\.dyslexia-font\s*\{/);
  });

  it("overrides --font-sans to OpenDyslexic", () => {
    const ruleMatch = cssContent.match(/\.dyslexia-font\s*\{([^}]+)\}/);
    expect(ruleMatch).not.toBeNull();
    const ruleBody = ruleMatch![1]!;
    expect(ruleBody).toMatch(/--font-sans:\s*"OpenDyslexic"/);
  });
});

// ── §1.5 Shadows ────────────────────────────────────────────

describe("§1.5 Shadow tokens", () => {
  const shadowTokens = [
    "--shadow-card",
    "--shadow-card-hover",
    "--shadow-modal",
    "--shadow-glow-purple",
    "--shadow-glow-green",
    "--shadow-glow-red",
  ];

  for (const token of shadowTokens) {
    it(`defines shadow token ${token}`, () => {
      expect(cssContent).toContain(token);
    });
  }

  it("shadow-card uses multiple layers", () => {
    expect(cssContent).toMatch(
      /--shadow-card:\s*0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.3\)/,
    );
  });

  it("shadow-glow-purple uses purple rgba", () => {
    expect(cssContent).toMatch(
      /--shadow-glow-purple:\s*0 0 16px rgba\(168,\s*85,\s*247/,
    );
  });
});

// ── Font loading in index.html ──────────────────────────────

describe("Font loading in index.html", () => {
  it("preconnects to Google Fonts", () => {
    expect(htmlContent).toContain("fonts.googleapis.com");
    expect(htmlContent).toContain("fonts.gstatic.com");
  });

  it("loads Inter font", () => {
    expect(htmlContent).toMatch(/Inter.*wght@400;500;600;700/);
  });

  it("loads JetBrains Mono font", () => {
    expect(htmlContent).toContain("JetBrains+Mono");
  });

  it("loads OpenDyslexic font", () => {
    expect(htmlContent).toMatch(/opendyslexic/i);
  });
});

// ── Reduced motion ──────────────────────────────────────────

describe("Reduced motion support", () => {
  it("includes prefers-reduced-motion media query", () => {
    expect(cssContent).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    );
  });

  it("includes .reduce-motion class for manual toggle", () => {
    expect(cssContent).toMatch(/\.reduce-motion\s/);
  });

  it("sets animation-duration to 0s", () => {
    expect(cssContent).toMatch(/animation-duration:\s*0s\s*!important/);
  });

  it("sets transition-duration to 0s", () => {
    expect(cssContent).toMatch(/transition-duration:\s*0s\s*!important/);
  });
});

// ── Focus-visible ring ──────────────────────────────────────

describe("Focus-visible ring", () => {
  it("uses border-focus color for focus ring", () => {
    expect(cssContent).toMatch(
      /\*:focus-visible[\s\S]*outline:.*var\(--color-border-focus\)/,
    );
  });
});

// ── Skip link ───────────────────────────────────────────────

describe("Skip link CSS", () => {
  it("defines .skip-link class", () => {
    expect(cssContent).toMatch(/\.skip-link\s*\{/);
  });

  it("positions skip link off-screen by default", () => {
    expect(cssContent).toMatch(/\.skip-link[\s\S]*left:\s*-9999px/);
  });

  it("shows skip link on focus", () => {
    expect(cssContent).toMatch(/\.skip-link:focus\s*\{/);
  });
});

// ── DOM class toggle behavior ───────────────────────────────

describe("DOM class toggle behavior", () => {
  beforeEach(() => {
    document.documentElement.className = "";
  });

  afterEach(() => {
    document.documentElement.className = "";
  });

  it("high-contrast class can be toggled on <html>", () => {
    document.documentElement.classList.add("high-contrast");
    expect(document.documentElement.classList.contains("high-contrast")).toBe(
      true,
    );
    document.documentElement.classList.remove("high-contrast");
    expect(document.documentElement.classList.contains("high-contrast")).toBe(
      false,
    );
  });

  it("large-type class can be toggled on <html>", () => {
    document.documentElement.classList.add("large-type");
    expect(document.documentElement.classList.contains("large-type")).toBe(true);
  });

  it("dyslexia-font class can be toggled on <html>", () => {
    document.documentElement.classList.add("dyslexia-font");
    expect(document.documentElement.classList.contains("dyslexia-font")).toBe(
      true,
    );
  });

  it("multiple accessibility classes can coexist", () => {
    document.documentElement.classList.add(
      "high-contrast",
      "large-type",
      "dyslexia-font",
    );
    expect(document.documentElement.classList.contains("high-contrast")).toBe(
      true,
    );
    expect(document.documentElement.classList.contains("large-type")).toBe(true);
    expect(document.documentElement.classList.contains("dyslexia-font")).toBe(
      true,
    );
  });
});
