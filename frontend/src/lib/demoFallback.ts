/**
 * Demo fallback layer (Part 6 §7.3).
 *
 * Caches the last successful recommendation set to localStorage so the demo
 * can proceed even when Gemini API is down. Also provides a hardcoded Maria
 * Lopez recommendation set matching the exact demo script.
 */

import type { RecommendationOption } from "../api/prescriptions";

const CACHE_KEY = "pharmasense:demo:recommendations";
const VOICE_FALLBACK_KEY = "pharmasense:demo:voiceFallbackUrl";

// ---------------------------------------------------------------------------
// Recommendation caching
// ---------------------------------------------------------------------------

interface CachedRecommendations {
  options: RecommendationOption[];
  reasoningSummary: string | null;
  cachedAt: string;
}

export function cacheRecommendations(
  options: RecommendationOption[],
  reasoningSummary: string | null,
): void {
  try {
    const payload: CachedRecommendations = {
      options,
      reasoningSummary,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export function getCachedRecommendations(): CachedRecommendations | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedRecommendations;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Voice fallback URL
// ---------------------------------------------------------------------------

export function setVoiceFallbackUrl(url: string): void {
  try {
    localStorage.setItem(VOICE_FALLBACK_KEY, url);
  } catch {
    // ignore
  }
}

export function getVoiceFallbackUrl(): string | null {
  try {
    return localStorage.getItem(VOICE_FALLBACK_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hardcoded Maria Lopez demo recommendations (§7.2 steps 7-9)
// ---------------------------------------------------------------------------

export const DEMO_RECOMMENDATIONS: RecommendationOption[] = [
  {
    label: "BEST_COVERED",
    primary: {
      drugName: "Azithromycin",
      genericName: "azithromycin",
      dosage: "250mg",
      frequency: "once daily",
      duration: "5 days",
      route: "oral",
      rationale:
        "First-line macrolide for strep pharyngitis with penicillin allergy. No cross-reactivity.",
      tier: 1,
      estimatedCopay: 10,
      isCovered: true,
      requiresPriorAuth: false,
    },
    alternatives: [
      {
        drugName: "Clarithromycin",
        genericName: "clarithromycin",
        dosage: "500mg",
        reason: "Alternative macrolide; higher cost but similar efficacy",
        tier: 2,
        estimatedCopay: 25,
      },
    ],
    warnings: [],
    safetyChecks: [
      { checkType: "allergy", passed: true, severity: null, message: "No conflict — not in penicillin class" },
      { checkType: "interaction", passed: true, severity: null, message: "No known interactions with Metformin or Lisinopril" },
      { checkType: "dose_range", passed: true, severity: null, message: "250mg within 250–500mg range" },
      { checkType: "duplicate", passed: true, severity: null, message: "No duplicate therapy" },
    ],
    blocked: false,
  },
  {
    label: "CHEAPEST",
    primary: {
      drugName: "Ciprofloxacin",
      genericName: "ciprofloxacin",
      dosage: "500mg",
      frequency: "twice daily",
      duration: "7 days",
      route: "oral",
      rationale:
        "Fluoroquinolone alternative. No cross-reactivity with penicillin. Safe with current medications.",
      tier: 2,
      estimatedCopay: 15,
      isCovered: true,
      requiresPriorAuth: false,
    },
    alternatives: [],
    warnings: [],
    safetyChecks: [
      { checkType: "allergy", passed: true, severity: null, message: "No conflict" },
      { checkType: "interaction", passed: true, severity: null, message: "No known interactions" },
      { checkType: "dose_range", passed: true, severity: null, message: "500mg within standard range" },
      { checkType: "duplicate", passed: true, severity: null, message: "No duplicate therapy" },
    ],
    blocked: false,
  },
  {
    label: "CLINICAL_BACKUP",
    primary: {
      drugName: "Amoxicillin",
      genericName: "amoxicillin",
      dosage: "500mg",
      frequency: "three times daily",
      duration: "10 days",
      route: "oral",
      rationale: "Standard first-line for strep but BLOCKED for this patient.",
      tier: 1,
      estimatedCopay: 5,
      isCovered: true,
      requiresPriorAuth: false,
    },
    alternatives: [],
    warnings: ["ALLERGY: Penicillin class — patient has documented Penicillin allergy"],
    safetyChecks: [
      { checkType: "allergy", passed: false, severity: "SEVERE", message: "BLOCKED: Amoxicillin is in the penicillin drug class — patient allergic to Penicillin" },
      { checkType: "interaction", passed: true, severity: null, message: "N/A — blocked by allergy check" },
      { checkType: "dose_range", passed: true, severity: null, message: "500mg within range" },
      { checkType: "duplicate", passed: true, severity: null, message: "No duplicate therapy" },
    ],
    blocked: true,
    blockReason: "ALLERGY: Penicillin class",
  },
];

export const DEMO_REASONING_SUMMARY =
  "Azithromycin is recommended as first-line for strep pharyngitis in patients " +
  "with penicillin allergy. Ciprofloxacin is a cheaper alternative. Amoxicillin " +
  "is BLOCKED due to penicillin-class allergy cross-reactivity.";
