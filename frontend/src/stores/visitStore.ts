import { create } from "zustand";

interface Visit {
  id: string;
  patientId: string;
  clinicianId: string;
  status: "in_progress" | "completed" | "cancelled";
  notes: string;
  createdAt: string;
}

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  isLoading: boolean;

  setVisits: (visits: Visit[]) => void;
  setCurrentVisit: (visit: Visit | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useVisitStore = create<VisitState>()((set) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,

  setVisits: (visits) => set({ visits }),
  setCurrentVisit: (visit) => set({ currentVisit: visit }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ visits: [], currentVisit: null, isLoading: false }),
}));
