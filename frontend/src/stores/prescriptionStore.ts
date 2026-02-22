import { create } from "zustand";
import {
  recommend as apiRecommend,
  approve as apiApprove,
  reject as apiReject,
  getReceipt as apiGetReceipt,
  generatePatientPack as apiGeneratePatientPack,
} from "../api/prescriptions";

// Re-export types from api/prescriptions so existing consumers don't break
export type {
  RecommendedDrug,
  AlternativeDrug,
  SafetyCheck,
  RecommendationLabel,
  CoverageStatus,
  RecommendationOption,
  ReceiptDrugItem,
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
      const resp = await apiRecommend({
        visit_id: req.visitId,
        chief_complaint: req.chiefComplaint,
        patient_id: req.patientId,
        current_medications: req.currentMedications,
        allergies: req.allergies,
        notes: req.notes,
      });
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
    });
  },
}));
