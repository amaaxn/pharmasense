import { create } from "zustand";
import apiClient from "../api/client";

// ── Types ───────────────────────────────────────────────────

export interface RecommendedDrug {
  drugName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  rationale: string;
  tier: number | null;
  estimatedCopay: number | null;
  isCovered: boolean | null;
  requiresPriorAuth: boolean | null;
}

export interface AlternativeDrug {
  drugName: string;
  genericName: string;
  dosage: string;
  reason: string;
  tier: number | null;
  estimatedCopay: number | null;
}

export interface SafetyCheck {
  checkType: string;
  passed: boolean;
  severity: string | null;
  message: string;
}

export interface RecommendationOption {
  primary: RecommendedDrug;
  alternatives: AlternativeDrug[];
  warnings: string[];
}

export interface ReceiptDrugItem {
  drugName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  tier: number | null;
  copay: number | null;
  isCovered: boolean;
  requiresPriorAuth: boolean;
}

export interface PrescriptionReceipt {
  receiptId: string;
  prescriptionId: string;
  visitId: string;
  patientId: string;
  clinicianId: string;
  patientName: string;
  clinicianName: string;
  issuedAt: string;
  status: string;
  drugs: ReceiptDrugItem[];
  safety: {
    allPassed: boolean;
    checks: SafetyCheck[];
    allergyFlags: string[];
    interactionFlags: string[];
    doseRangeFlags: string[];
  };
  coverage: {
    planName: string;
    memberId: string;
    totalCopay: number;
    itemsCovered: number;
    itemsNotCovered: number;
    priorAuthRequired: string[];
  };
  notes: string | null;
}

export interface PatientPack {
  instructions: string;
  warnings: string[];
  medicationSchedule: string | null;
}

export type PrescriptionStatus =
  | "idle"
  | "loading"
  | "recommended"
  | "approved"
  | "rejected"
  | "blocked";

export interface RecommendationRequest {
  visitId: string;
  chiefComplaint: string;
  patientId: string;
  currentMedications: string[];
  allergies: string[];
  notes?: string;
}

// ── Store ───────────────────────────────────────────────────

interface PrescriptionState {
  options: RecommendationOption[];
  reasoningSummary: string | null;
  selectedOptionIndex: number | null;
  prescriptionId: string | null;
  status: PrescriptionStatus;
  receipt: PrescriptionReceipt | null;
  patientPack: PatientPack | null;
  isLoading: boolean;
  error: string | null;

  fetchRecommendations: (req: RecommendationRequest) => Promise<void>;
  selectOption: (index: number) => void;
  approveOption: (
    prescriptionId: string,
    confirmedSafetyReview: boolean,
    comment?: string,
  ) => Promise<void>;
  rejectOption: (prescriptionId: string, reason: string) => Promise<void>;
  fetchReceipt: (prescriptionId: string) => Promise<void>;
  generatePatientPack: (prescriptionId: string) => Promise<void>;
  reset: () => void;
}

export const usePrescriptionStore = create<PrescriptionState>()((set) => ({
  options: [],
  reasoningSummary: null,
  selectedOptionIndex: null,
  prescriptionId: null,
  status: "idle",
  receipt: null,
  patientPack: null,
  isLoading: false,
  error: null,

  fetchRecommendations: async (req) => {
    set({ isLoading: true, error: null, status: "loading", options: [] });
    try {
      const data = await apiClient.post("/prescriptions/recommend", {
        visit_id: req.visitId,
        chief_complaint: req.chiefComplaint,
        patient_id: req.patientId,
        current_medications: req.currentMedications,
        allergies: req.allergies,
        notes: req.notes,
      });
      const resp = data as unknown as {
        recommendations: RecommendationOption[];
        reasoning_summary?: string;
      };
      set({
        options: resp.recommendations ?? [],
        reasoningSummary: resp.reasoning_summary ?? null,
        status: "recommended",
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false, status: "idle" });
    }
  },

  selectOption: (index) => {
    set({ selectedOptionIndex: index });
  },

  approveOption: async (prescriptionId, confirmedSafetyReview, comment) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.post("/prescriptions/approve", {
        prescription_id: prescriptionId,
        confirmed_safety_review: confirmedSafetyReview,
        comment,
      });
      const receipt = data as unknown as PrescriptionReceipt;
      set({
        prescriptionId,
        receipt,
        status: "approved",
        isLoading: false,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 422) {
        set({ status: "blocked", error: "Prescription blocked", isLoading: false });
      } else {
        set({ error: (err as Error).message, isLoading: false });
      }
      throw err;
    }
  },

  rejectOption: async (prescriptionId, reason) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post("/prescriptions/reject", {
        prescription_id: prescriptionId,
        reason,
      });
      set({
        prescriptionId,
        status: "rejected",
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  fetchReceipt: async (prescriptionId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get(
        `/prescriptions/${prescriptionId}/receipt`,
      );
      set({ receipt: data as unknown as PrescriptionReceipt, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  generatePatientPack: async (prescriptionId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.post(
        `/prescriptions/${prescriptionId}/patient-pack`,
      );
      set({ patientPack: data as unknown as PatientPack, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  reset: () => {
    set({
      options: [],
      reasoningSummary: null,
      selectedOptionIndex: null,
      prescriptionId: null,
      status: "idle",
      receipt: null,
      patientPack: null,
      isLoading: false,
      error: null,
    });
  },
}));
