import { create } from "zustand";

interface Prescription {
  id: string;
  visitId: string;
  drugName: string;
  dosage: string;
  status: "recommended" | "approved" | "rejected";
  safetyScore: number | null;
  copay: number | null;
}

interface PrescriptionState {
  prescriptions: Prescription[];
  currentPrescription: Prescription | null;
  isLoading: boolean;

  setPrescriptions: (prescriptions: Prescription[]) => void;
  setCurrentPrescription: (prescription: Prescription | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const usePrescriptionStore = create<PrescriptionState>()((set) => ({
  prescriptions: [],
  currentPrescription: null,
  isLoading: false,

  setPrescriptions: (prescriptions) => set({ prescriptions }),
  setCurrentPrescription: (prescription) =>
    set({ currentPrescription: prescription }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({ prescriptions: [], currentPrescription: null, isLoading: false }),
}));
