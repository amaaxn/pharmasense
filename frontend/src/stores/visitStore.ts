import { create } from "zustand";
import {
  listVisits as apiListVisits,
  getVisit as apiGetVisit,
  createVisit as apiCreateVisit,
  updateVisit as apiUpdateVisit,
  extractVisitData as apiExtractVisitData,
} from "../api/visits";

// Re-export types from api/visits so existing consumers don't break
export type { ExtractedData, Visit } from "../api/visits";

import type { ExtractedData, Visit } from "../api/visits";

export interface VisitFormState {
  patientId: string;
  notes: string;
  chiefComplaint: string;
  currentMedications: string[];
  allergies: string[];
  diagnosis: string;
}

const EMPTY_FORM: VisitFormState = {
  patientId: "",
  notes: "",
  chiefComplaint: "",
  currentMedications: [],
  allergies: [],
  diagnosis: "",
};

// ── Store ───────────────────────────────────────────────────

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  form: VisitFormState;
  isLoading: boolean;
  isExtracting: boolean;
  isProcessingDrawing: boolean;
  drawingChannelId: string | null;
  error: string | null;

  fetchVisits: (params?: { limit?: number }) => Promise<void>;
  fetchVisit: (id: string) => Promise<void>;
  createVisit: () => Promise<string>;
  updateVisit: (id: string, payload: Partial<Visit>) => Promise<void>;
  extractDataFromNotes: () => Promise<void>;
  appendToNotes: (text: string) => void;
  setFormField: <K extends keyof VisitFormState>(
    key: K,
    value: VisitFormState[K],
  ) => void;
  setDrawingChannelId: (id: string | null) => void;
  setProcessingDrawing: (val: boolean) => void;
  mergeExtractedFields: (fields: Partial<ExtractedData>) => void;
  updateExtractedData: (data: ExtractedData) => void;
  resetVisitForm: () => void;
  reset: () => void;
}

export const useVisitStore = create<VisitState>()((set, get) => ({
  visits: [],
  currentVisit: null,
  form: { ...EMPTY_FORM },
  isLoading: false,
  isExtracting: false,
  isProcessingDrawing: false,
  drawingChannelId: null,
  error: null,

  fetchVisits: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiListVisits(params);
      set({ visits: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchVisit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetVisit(id);
      set({ currentVisit: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createVisit: async () => {
    const { form } = get();
    set({ isLoading: true, error: null });
    try {
      const visit = await apiCreateVisit({
        patient_id: form.patientId,
        notes: form.notes,
        chief_complaint: form.chiefComplaint,
        current_medications: form.currentMedications,
        allergies: form.allergies,
        diagnosis: form.diagnosis,
      });
      set((s) => ({
        visits: [...s.visits, visit],
        currentVisit: visit,
        isLoading: false,
      }));
      get().resetVisitForm();
      return visit.id;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateVisit: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiUpdateVisit(id, payload);
      set((s) => ({
        currentVisit: data,
        visits: s.visits.map((v) => (v.id === id ? data : v)),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  extractDataFromNotes: async () => {
    const visit = get().currentVisit;
    if (!visit) return;
    set({ isExtracting: true, error: null });
    try {
      const extracted = await apiExtractVisitData(visit.id);
      set((s) => ({
        currentVisit: s.currentVisit
          ? { ...s.currentVisit, extractedData: extracted }
          : null,
        form: {
          ...s.form,
          chiefComplaint: extracted.chiefComplaint || s.form.chiefComplaint,
          currentMedications:
            extracted.currentMedications.length > 0
              ? extracted.currentMedications
              : s.form.currentMedications,
          allergies:
            extracted.allergies.length > 0
              ? extracted.allergies
              : s.form.allergies,
          diagnosis: extracted.diagnosis || s.form.diagnosis,
        },
        isExtracting: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isExtracting: false });
    }
  },

  appendToNotes: (text) => {
    set((s) => {
      const newNotes = s.form.notes ? `${s.form.notes}\n${text}` : text;
      return {
        form: { ...s.form, notes: newNotes },
        currentVisit: s.currentVisit
          ? { ...s.currentVisit, notes: newNotes }
          : null,
      };
    });
  },

  setFormField: (key, value) => {
    set((s) => ({ form: { ...s.form, [key]: value } }));
  },

  setDrawingChannelId: (id) => {
    set({ drawingChannelId: id });
  },

  setProcessingDrawing: (val) => {
    set({ isProcessingDrawing: val });
  },

  mergeExtractedFields: (fields) => {
    set((s) => {
      const current = s.currentVisit?.extractedData;
      if (!current) return s;

      const merged: ExtractedData = {
        ...current,
        allergies: fields.allergies
          ? Array.from(new Set([...current.allergies, ...fields.allergies]))
          : current.allergies,
        currentMedications: fields.currentMedications
          ? Array.from(
              new Set([
                ...current.currentMedications,
                ...fields.currentMedications,
              ]),
            )
          : current.currentMedications,
        chiefComplaint: fields.chiefComplaint || current.chiefComplaint,
        diagnosis: fields.diagnosis || current.diagnosis,
      };

      return {
        currentVisit: s.currentVisit
          ? { ...s.currentVisit, extractedData: merged }
          : null,
        form: {
          ...s.form,
          allergies: merged.allergies,
          currentMedications: merged.currentMedications,
          chiefComplaint: merged.chiefComplaint,
          diagnosis: merged.diagnosis,
        },
      };
    });
  },

  updateExtractedData: (data) => {
    set((s) => ({
      currentVisit: s.currentVisit
        ? { ...s.currentVisit, extractedData: data }
        : null,
      form: {
        ...s.form,
        chiefComplaint: data.chiefComplaint,
        currentMedications: data.currentMedications,
        allergies: data.allergies,
        diagnosis: data.diagnosis,
      },
    }));
  },

  resetVisitForm: () => {
    set({ form: { ...EMPTY_FORM } });
  },

  reset: () => {
    set({
      visits: [],
      currentVisit: null,
      form: { ...EMPTY_FORM },
      isLoading: false,
      isExtracting: false,
      isProcessingDrawing: false,
      drawingChannelId: null,
      error: null,
    });
  },
}));
