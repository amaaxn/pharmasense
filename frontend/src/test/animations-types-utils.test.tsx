import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, renderHook } from "@testing-library/react";
import { PageTransition } from "../components/PageTransition";
import { useReducedMotion } from "../utils/useReducedMotion";
import { useUiStore } from "../stores/uiStore";
import {
  ANIMATION_DURATION,
  slideUp,
  scaleIn,
  slideInLeft,
  staggerContainer,
  staggerSlideUp,
} from "../utils/animations";
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from "../utils/formatters";
import { APP_NAME, TOAST_AUTO_DISMISS_MS, DEBOUNCE_MS } from "../utils/constants";
import type { UserProfile, Visit, ApiResponse } from "../types";

describe("§9.1 Shared Animation Variants", () => {
  it("slideUp has correct structure", () => {
    expect(slideUp.hidden).toEqual({ opacity: 0, y: 24 });
    const visible = slideUp.visible as { opacity?: number; y?: number; transition?: { duration: number } };
    expect(visible.opacity).toBe(1);
    expect(visible.y).toBe(0);
    expect(visible.transition?.duration).toBe(ANIMATION_DURATION.pageEntrance);
  });

  it("scaleIn has correct structure", () => {
    expect(scaleIn.hidden).toEqual({ opacity: 0, scale: 0.95 });
    const visible = scaleIn.visible as { scale?: number };
    expect(visible.scale).toBe(1);
  });

  it("slideInLeft has correct structure", () => {
    expect(slideInLeft.hidden).toEqual({ x: "-100%" });
    const visible = slideInLeft.visible as { x?: number };
    expect(visible.x).toBe(0);
  });

  it("staggerContainer has staggerChildren", () => {
    const visible = staggerContainer.visible as { transition?: { staggerChildren?: number } };
    expect(visible.transition?.staggerChildren).toBe(
      ANIMATION_DURATION.cardStagger,
    );
  });

  it("staggerSlideUp is child variant", () => {
    expect(staggerSlideUp.hidden).toHaveProperty("y", 16);
  });

  it("ANIMATION_DURATION matches §9.4 guidelines", () => {
    expect(ANIMATION_DURATION.pageEntrance).toBe(0.4);
    expect(ANIMATION_DURATION.modalOpen).toBe(0.3);
    expect(ANIMATION_DURATION.sidebarSlide).toBe(0.3);
    expect(ANIMATION_DURATION.cardStagger).toBe(0.08);
    expect(ANIMATION_DURATION.recommendationStagger).toBe(0.1);
  });
});

describe("§9.2 Reduced Motion", () => {
  beforeEach(() => {
    useUiStore.setState({ reduceMotion: false });
  });

  it("useReducedMotion returns false when store has reduceMotion off", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("useReducedMotion returns true when store has reduceMotion on", () => {
    useUiStore.setState({ reduceMotion: true });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});

describe("§9.3 PageTransition", () => {
  it("PageTransition renders children", () => {
    render(
      <PageTransition>
        <span>Page content</span>
      </PageTransition>,
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});

describe("§10 TypeScript Type Definitions", () => {
  it("UserProfile has required fields", () => {
    const u: UserProfile = {
      userId: "u1",
      email: "a@b.com",
      role: "clinician",
    };
    expect(u.role).toBe("clinician");
  });

  it("Visit has required fields", () => {
    const v: Visit = {
      id: "v1",
      patientId: "p1",
      clinicianId: "c1",
      status: "in_progress",
      notes: "",
      extractedData: null,
      createdAt: "2025-01-01",
    };
    expect(v.status).toBe("in_progress");
  });

  it("ApiResponse is generic", () => {
    const r: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: "x" },
      error: null,
      error_code: null,
      meta: null,
    };
    expect(r.data?.id).toBe("x");
  });
});

describe("§11.1 Formatters", () => {
  it("formatCurrency formats USD", () => {
    expect(formatCurrency(12.5)).toMatch(/\$12\.50/);
    expect(formatCurrency(0)).toMatch(/\$0\.00/);
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("formatDate formats date", () => {
    expect(formatDate("2025-01-15")).toMatch(/Jan/);
    expect(formatDate(null)).toBe("—");
  });

  it("formatDateTime includes time", () => {
    const s = formatDateTime("2025-01-15T14:30:00Z");
    expect(s).toMatch(/Jan/);
    expect(s).toMatch(/\d/);
  });

  it("formatRelativeTime returns relative strings", () => {
    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - 60 * 1000);
    expect(formatRelativeTime(oneMinAgo)).toMatch(/min ago/);
    expect(formatRelativeTime(null)).toBe("—");
  });
});

describe("§11.2 Constants", () => {
  it("APP_NAME is PharmaSense", () => {
    expect(APP_NAME).toBe("PharmaSense");
  });

  it("TOAST_AUTO_DISMISS_MS is 5000", () => {
    expect(TOAST_AUTO_DISMISS_MS).toBe(5000);
  });

  it("DEBOUNCE_MS has search and notes", () => {
    expect(DEBOUNCE_MS.search).toBe(300);
    expect(DEBOUNCE_MS.notes).toBe(500);
  });
});
