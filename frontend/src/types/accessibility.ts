/**
 * Accessibility-related types.
 */

export type Language = "en" | "es";

export interface AccessibilityPreferences {
  highContrast: boolean;
  dyslexiaFont: boolean;
  largeType: boolean;
  reduceMotion: boolean;
  language: Language;
}
