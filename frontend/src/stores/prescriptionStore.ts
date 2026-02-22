import { create } from "zustand";
import {
  recommend as apiRecommend,
  approve as apiApprove,
  reject as apiReject,
  getReceipt as apiGetReceipt,
  generatePatientPack as apiGeneratePatientPack,
} from "../api/prescriptions";
import {
  cacheRecommendations,
  getCachedRecommendations,
  DEMO_RECOMMENDATIONS,
  DEMO_REASONING_SUMMARY,
} from "../lib/demoFallback";

// Re-export types from api/prescriptions so existing consumers don't break
export type {
  RecommendedDrug,
  AlternativeDrug,
  SafetyCheck,
  RecommendationLabel,
  CoverageStatus,
  RecommendationOption,
  ReceiptDrugItem,
  ReceiptAlternative,
  ReceiptReasoning,
  PrescriptionReceipt,
  PatientPack,
} from "../api/prescriptions";

import type {
  RecommendationOption,
  PrescriptionReceipt,
  PatientPack,
} from "../api/prescriptions";

// ── Store-only types ────────────────────────────────────────

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
  approvalError: string | null;
  isDemoMode: boolean;

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
  approvalError: null,
  isDemoMode: false,

  fetchRecommendations: async (req) => {
    set({ isLoading: true, error: null, status: "loading", options: [], isDemoMode: false });
    try {
      const resp = await apiRecommend({
        visit_id: req.visitId,
        chief_complaint: req.chiefComplaint,
        patient_id: req.patientId,
        current_medications: req.currentMedications,
        allergies: req.allergies,
        notes: req.notes,
      });
      const options = resp.recommendations ?? [];
      const summary = resp.reasoning_summary ?? null;
      const prescriptionId = resp.prescription_id ?? null;
      cacheRecommendations(options, summary);
      set({
        options,
        reasoningSummary: summary,
        prescriptionId,
        status: "recommended",
        isLoading: false,
        isDemoMode: false,
      });
    } catch {
      const demoPrescriptionId = `demo-${crypto.randomUUID()}`;
      const cached = getCachedRecommendations();
      if (cached) {
        set({
          options: cached.options,
          reasoningSummary: cached.reasoningSummary,
          prescriptionId: demoPrescriptionId,
          status: "recommended",
          isLoading: false,
          isDemoMode: true,
        });
      } else {
        set({
          options: DEMO_RECOMMENDATIONS,
          reasoningSummary: DEMO_REASONING_SUMMARY,
          prescriptionId: demoPrescriptionId,
          status: "recommended",
          isLoading: false,
          isDemoMode: true,
        });
      }
    }
  },

  selectOption: (index) => {
    set({ selectedOptionIndex: index });
  },

  approveOption: async (prescriptionId, confirmedSafetyReview, comment) => {
    const state = usePrescriptionStore.getState();
    if (state.isDemoMode) {
      set({ prescriptionId, status: "approved", isLoading: false, approvalError: null });
      return;
    }
    set({ isLoading: true, approvalError: null });
    try {
      const receipt = await apiApprove({
        prescription_id: prescriptionId,
        confirmed_safety_review: confirmedSafetyReview,
        comment,
      });
      set({
        prescriptionId,
        receipt,
        status: "approved",
        isLoading: false,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 422) {
        set({ status: "blocked", approvalError: "Prescription blocked by safety check", isLoading: false });
      } else {
        set({ approvalError: (err as Error).message, isLoading: false });
      }
      throw err;
    }
  },

  rejectOption: async (prescriptionId, reason) => {
    const state = usePrescriptionStore.getState();
    if (state.isDemoMode) {
      set({ prescriptionId, status: "rejected", isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await apiReject({
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
      const receipt = await apiGetReceipt(prescriptionId);
      set({ receipt, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  generatePatientPack: async (prescriptionId) => {
    set({ isLoading: true, error: null });
    try {
      const patientPack = await apiGeneratePatientPack(prescriptionId);
      set({ patientPack, isLoading: false });
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
      approvalError: null,
      isDemoMode: false,
    });
  },
}));
