import { create } from "zustand";
import apiClient from "../api/client";

// ── Types ───────────────────────────────────────────────────

export interface ExtractedData {
  chiefComplaint: string;
  currentMedications: string[];
  allergies: string[];
  diagnosis: string;
}

export interface Visit {
  id: string;
  patientId: string;
  clinicianId: string;
  status: "in_progress" | "completed" | "cancelled";
  notes: string;
  extractedData: ExtractedData | null;
  createdAt: string;
}

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
  error: string | null;

  fetchVisits: () => Promise<void>;
  fetchVisit: (id: string) => Promise<void>;
  createVisit: () => Promise<string>;
  updateVisit: (id: string, payload: Partial<Visit>) => Promise<void>;
  extractDataFromNotes: () => Promise<void>;
  appendToNotes: (text: string) => void;
  setFormField: <K extends keyof VisitFormState>(
    key: K,
    value: VisitFormState[K],
  ) => void;
  resetVisitForm: () => void;
  reset: () => void;
}

export const useVisitStore = create<VisitState>()((set, get) => ({
  visits: [],
  currentVisit: null,
  form: { ...EMPTY_FORM },
  isLoading: false,
  isExtracting: false,
  error: null,

  fetchVisits: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get("/visits") as unknown as Visit[];
      set({ visits: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchVisit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get(`/visits/${id}`) as unknown as Visit;
      set({ currentVisit: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createVisit: async () => {
    const { form } = get();
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.post("/visits", {
        patient_id: form.patientId,
        notes: form.notes,
        chief_complaint: form.chiefComplaint,
        current_medications: form.currentMedications,
        allergies: form.allergies,
        diagnosis: form.diagnosis,
      });
      const visit = data as unknown as Visit;
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
      const data = await apiClient.put(`/visits/${id}`, payload) as unknown as Visit;
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
      const data = await apiClient.post(`/visits/${visit.id}/extract`);
      const extracted = data as unknown as ExtractedData;
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
      error: null,
    });
  },
}));
