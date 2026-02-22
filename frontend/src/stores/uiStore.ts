import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  highContrast: boolean;
  dyslexiaFont: boolean;
  fontSize: "normal" | "large" | "x-large";
  sidebarOpen: boolean;

  toggleHighContrast: () => void;
  toggleDyslexiaFont: () => void;
  setFontSize: (size: "normal" | "large" | "x-large") => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      highContrast: false,
      dyslexiaFont: false,
      fontSize: "normal",
      sidebarOpen: true,

      toggleHighContrast: () =>
        set((s) => ({ highContrast: !s.highContrast })),
      toggleDyslexiaFont: () =>
        set((s) => ({ dyslexiaFont: !s.dyslexiaFont })),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: "pharmasense-ui" },
  ),
);
