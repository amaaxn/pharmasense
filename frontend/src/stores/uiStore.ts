import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "es";

interface UiState {
  highContrast: boolean;
  dyslexiaFont: boolean;
  largeType: boolean;
  reduceMotion: boolean;
  language: Language;
  sidebarOpen: boolean;

  toggleHighContrast: () => void;
  toggleDyslexiaFont: () => void;
  toggleLargeType: () => void;
  toggleReduceMotion: () => void;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      highContrast: false,
      dyslexiaFont: false,
      largeType: false,
      reduceMotion: false,
      language: "en",
      sidebarOpen: false,

      toggleHighContrast: () =>
        set((s) => ({ highContrast: !s.highContrast })),
      toggleDyslexiaFont: () =>
        set((s) => ({ dyslexiaFont: !s.dyslexiaFont })),
      toggleLargeType: () => set((s) => ({ largeType: !s.largeType })),
      toggleReduceMotion: () =>
        set((s) => ({ reduceMotion: !s.reduceMotion })),
      toggleLanguage: () =>
        set((s) => ({ language: s.language === "en" ? "es" : "en" })),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "pharmasense-ui",
      version: 2,
      migrate: (persisted: unknown) => {
        // v1 → v2: reset language to "en" (clears any accidental "es" persisted during dev)
        const s = persisted as Record<string, unknown>;
        return { ...s, language: "en" };
      },
      partialize: (state) => ({
        highContrast: state.highContrast,
        dyslexiaFont: state.dyslexiaFont,
        largeType: state.largeType,
        reduceMotion: state.reduceMotion,
        language: state.language,
      }),
    },
  ),
);
