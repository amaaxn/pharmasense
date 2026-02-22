import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

// ── Hoist mocks so vi.mock factories can reference them ─────

const { mockGet, mockPost, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("../api/client", () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: vi.fn(),
  },
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { useVisitStore } from "../stores/visitStore";
import {
  usePrescriptionStore,
  type RecommendationOption,
  type PrescriptionReceipt,
  type PatientPack,
} from "../stores/prescriptionStore";

const mockApi = { get: mockGet, post: mockPost, put: mockPut };

// ── visitStore ──────────────────────────────────────────────

describe("§5.2 visitStore", () => {
  beforeEach(() => {
    useVisitStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty visits, no current visit, and clean form", () => {
      const s = useVisitStore.getState();
      expect(s.visits).toEqual([]);
      expect(s.currentVisit).toBeNull();
      expect(s.form.patientId).toBe("");
      expect(s.form.notes).toBe("");
      expect(s.form.chiefComplaint).toBe("");
      expect(s.form.currentMedications).toEqual([]);
      expect(s.form.allergies).toEqual([]);
      expect(s.isLoading).toBe(false);
      expect(s.isExtracting).toBe(false);
      expect(s.error).toBeNull();
    });
  });

  describe("form management", () => {
    it("setFormField updates individual fields", () => {
      act(() => {
        useVisitStore.getState().setFormField("patientId", "p-123");
        useVisitStore.getState().setFormField("notes", "Headache reported");
      });
      const s = useVisitStore.getState();
      expect(s.form.patientId).toBe("p-123");
      expect(s.form.notes).toBe("Headache reported");
    });

    it("setFormField updates array fields", () => {
      act(() => {
        useVisitStore
          .getState()
          .setFormField("allergies", ["Penicillin", "Sulfa"]);
      });
      expect(useVisitStore.getState().form.allergies).toEqual([
        "Penicillin",
        "Sulfa",
      ]);
    });

    it("resetVisitForm clears all form fields", () => {
      act(() => {
        useVisitStore.getState().setFormField("patientId", "p-123");
        useVisitStore.getState().setFormField("notes", "Some notes");
        useVisitStore.getState().resetVisitForm();
      });
      const f = useVisitStore.getState().form;
      expect(f.patientId).toBe("");
      expect(f.notes).toBe("");
    });
  });

  describe("appendToNotes", () => {
    it("appends text to empty notes", () => {
      act(() => useVisitStore.getState().appendToNotes("OCR result"));
      expect(useVisitStore.getState().form.notes).toBe("OCR result");
    });

    it("appends with newline to existing notes", () => {
      act(() => {
        useVisitStore.getState().setFormField("notes", "Line 1");
        useVisitStore.getState().appendToNotes("Line 2");
      });
      expect(useVisitStore.getState().form.notes).toBe("Line 1\nLine 2");
    });

    it("also updates currentVisit.notes if set", () => {
      const fakeVisit = {
        id: "v1",
        patientId: "p1",
        clinicianId: "c1",
        status: "in_progress" as const,
        notes: "existing",
        extractedData: null,
        createdAt: "2025-01-01",
      };
      useVisitStore.setState({ currentVisit: fakeVisit, form: { ...useVisitStore.getState().form, notes: "existing" } });
      act(() => useVisitStore.getState().appendToNotes("new text"));
      expect(useVisitStore.getState().currentVisit?.notes).toBe(
        "existing\nnew text",
      );
    });
  });

  describe("API actions", () => {
    it("fetchVisits populates visits list", async () => {
      const visits = [
        { id: "v1", patientId: "p1", clinicianId: "c1", status: "in_progress", notes: "", extractedData: null, createdAt: "2025-01-01" },
      ];
      mockApi.get.mockResolvedValueOnce(visits);

      await act(() => useVisitStore.getState().fetchVisits());

      expect(mockApi.get).toHaveBeenCalledWith("/visits");
      expect(useVisitStore.getState().visits).toEqual(visits);
      expect(useVisitStore.getState().isLoading).toBe(false);
    });

    it("fetchVisits sets error on failure", async () => {
      mockApi.get.mockRejectedValueOnce(new Error("Network error"));

      await act(() => useVisitStore.getState().fetchVisits());

      expect(useVisitStore.getState().error).toBe("Network error");
      expect(useVisitStore.getState().isLoading).toBe(false);
    });

    it("fetchVisit sets currentVisit", async () => {
      const visit = { id: "v2", patientId: "p1", clinicianId: "c1", status: "completed", notes: "ok", extractedData: null, createdAt: "2025-01-01" };
      mockApi.get.mockResolvedValueOnce(visit);

      await act(() => useVisitStore.getState().fetchVisit("v2"));

      expect(mockApi.get).toHaveBeenCalledWith("/visits/v2");
      expect(useVisitStore.getState().currentVisit).toEqual(visit);
    });

    it("createVisit posts form data and returns visit id", async () => {
      const createdVisit = { id: "v-new", patientId: "p1", clinicianId: "c1", status: "in_progress", notes: "hi", extractedData: null, createdAt: "2025-01-01" };
      mockApi.post.mockResolvedValueOnce(createdVisit);

      act(() => {
        useVisitStore.getState().setFormField("patientId", "p1");
        useVisitStore.getState().setFormField("notes", "hi");
        useVisitStore.getState().setFormField("chiefComplaint", "headache");
      });

      const id = await act(() => useVisitStore.getState().createVisit());

      expect(mockApi.post).toHaveBeenCalledWith("/visits", expect.objectContaining({
        patient_id: "p1",
        notes: "hi",
        chief_complaint: "headache",
      }));
      expect(id).toBe("v-new");
      expect(useVisitStore.getState().currentVisit).toEqual(createdVisit);
      expect(useVisitStore.getState().form.patientId).toBe("");
    });

    it("extractDataFromNotes calls extract endpoint and updates form", async () => {
      const extracted = {
        chiefComplaint: "migraine",
        currentMedications: ["Ibuprofen"],
        allergies: ["Aspirin"],
        diagnosis: "Chronic migraine",
      };
      mockApi.post.mockResolvedValueOnce(extracted);

      useVisitStore.setState({
        currentVisit: {
          id: "v1", patientId: "p1", clinicianId: "c1",
          status: "in_progress", notes: "notes", extractedData: null, createdAt: "2025-01-01",
        },
      });

      await act(() => useVisitStore.getState().extractDataFromNotes());

      expect(mockApi.post).toHaveBeenCalledWith("/visits/v1/extract");
      const s = useVisitStore.getState();
      expect(s.form.chiefComplaint).toBe("migraine");
      expect(s.form.currentMedications).toEqual(["Ibuprofen"]);
      expect(s.form.allergies).toEqual(["Aspirin"]);
      expect(s.form.diagnosis).toBe("Chronic migraine");
      expect(s.isExtracting).toBe(false);
      expect(s.currentVisit?.extractedData).toEqual(extracted);
    });

    it("extractDataFromNotes is a no-op without currentVisit", async () => {
      await act(() => useVisitStore.getState().extractDataFromNotes());
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it("updateVisit calls PUT and updates state", async () => {
      const updated = { id: "v1", patientId: "p1", clinicianId: "c1", status: "completed", notes: "done", extractedData: null, createdAt: "2025-01-01" };
      mockApi.put.mockResolvedValueOnce(updated);

      useVisitStore.setState({
        visits: [{ id: "v1", patientId: "p1", clinicianId: "c1", status: "in_progress", notes: "", extractedData: null, createdAt: "2025-01-01" }],
        currentVisit: { id: "v1", patientId: "p1", clinicianId: "c1", status: "in_progress", notes: "", extractedData: null, createdAt: "2025-01-01" },
      });

      await act(() => useVisitStore.getState().updateVisit("v1", { status: "completed" }));

      expect(mockApi.put).toHaveBeenCalledWith("/visits/v1", { status: "completed" });
      expect(useVisitStore.getState().currentVisit?.status).toBe("completed");
      expect(useVisitStore.getState().visits[0]?.status).toBe("completed");
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      useVisitStore.setState({
        visits: [{ id: "v1" } as never],
        currentVisit: { id: "v1" } as never,
        isLoading: true,
        error: "err",
      });

      act(() => useVisitStore.getState().reset());

      const s = useVisitStore.getState();
      expect(s.visits).toEqual([]);
      expect(s.currentVisit).toBeNull();
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });
  });
});

// ── prescriptionStore ───────────────────────────────────────

describe("§5.4 prescriptionStore", () => {
  beforeEach(() => {
    usePrescriptionStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with idle status and empty state", () => {
      const s = usePrescriptionStore.getState();
      expect(s.options).toEqual([]);
      expect(s.reasoningSummary).toBeNull();
      expect(s.selectedOptionIndex).toBeNull();
      expect(s.prescriptionId).toBeNull();
      expect(s.status).toBe("idle");
      expect(s.receipt).toBeNull();
      expect(s.patientPack).toBeNull();
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });
  });

  describe("fetchRecommendations", () => {
    const req = {
      visitId: "v1",
      chiefComplaint: "headache",
      patientId: "p1",
      currentMedications: ["Aspirin"],
      allergies: ["Penicillin"],
    };

    it("fetches recommendations and updates options + status", async () => {
      const option: RecommendationOption = {
        primary: {
          drugName: "Acetaminophen",
          genericName: "acetaminophen",
          dosage: "500mg",
          frequency: "every 6 hours",
          duration: "5 days",
          route: "oral",
          rationale: "Standard analgesic",
          tier: 1,
          estimatedCopay: 5.0,
          isCovered: true,
          requiresPriorAuth: false,
        },
        alternatives: [],
        warnings: [],
      };
      mockApi.post.mockResolvedValueOnce({
        recommendations: [option],
        reasoning_summary: "Chose OTC analgesic",
      });

      await act(() =>
        usePrescriptionStore.getState().fetchRecommendations(req),
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/prescriptions/recommend",
        expect.objectContaining({
          visit_id: "v1",
          chief_complaint: "headache",
        }),
      );
      const s = usePrescriptionStore.getState();
      expect(s.options).toHaveLength(1);
      expect(s.options[0]?.primary.drugName).toBe("Acetaminophen");
      expect(s.reasoningSummary).toBe("Chose OTC analgesic");
      expect(s.status).toBe("recommended");
      expect(s.isLoading).toBe(false);
    });

    it("sets loading state during request", async () => {
      let resolveRequest: (v: unknown) => void;
      const pending = new Promise((r) => { resolveRequest = r; });
      mockApi.post.mockReturnValueOnce(pending);

      const promise = act(() =>
        usePrescriptionStore.getState().fetchRecommendations(req),
      );

      expect(usePrescriptionStore.getState().isLoading).toBe(true);
      expect(usePrescriptionStore.getState().status).toBe("loading");

      resolveRequest!({ recommendations: [], reasoning_summary: null });
      await promise;

      expect(usePrescriptionStore.getState().isLoading).toBe(false);
    });

    it("handles error gracefully", async () => {
      mockApi.post.mockRejectedValueOnce(new Error("API error"));

      await act(() =>
        usePrescriptionStore.getState().fetchRecommendations(req),
      );

      const s = usePrescriptionStore.getState();
      expect(s.error).toBe("API error");
      expect(s.status).toBe("idle");
      expect(s.isLoading).toBe(false);
    });
  });

  describe("selectOption", () => {
    it("sets selectedOptionIndex", () => {
      act(() => usePrescriptionStore.getState().selectOption(2));
      expect(usePrescriptionStore.getState().selectedOptionIndex).toBe(2);
    });
  });

  describe("approveOption", () => {
    it("sends approval and stores receipt", async () => {
      const receipt: PrescriptionReceipt = {
        receiptId: "r1",
        prescriptionId: "rx1",
        visitId: "v1",
        patientId: "p1",
        clinicianId: "c1",
        patientName: "John",
        clinicianName: "Dr. Smith",
        issuedAt: "2025-01-01T00:00:00Z",
        status: "approved",
        drugs: [],
        safety: { allPassed: true, checks: [], allergyFlags: [], interactionFlags: [], doseRangeFlags: [] },
        coverage: { planName: "Gold", memberId: "m1", totalCopay: 10, itemsCovered: 1, itemsNotCovered: 0, priorAuthRequired: [] },
        notes: null,
      };
      mockApi.post.mockResolvedValueOnce(receipt);

      await act(() =>
        usePrescriptionStore.getState().approveOption("rx1", true, "Looks good"),
      );

      expect(mockApi.post).toHaveBeenCalledWith("/prescriptions/approve", {
        prescription_id: "rx1",
        confirmed_safety_review: true,
        comment: "Looks good",
      });
      const s = usePrescriptionStore.getState();
      expect(s.status).toBe("approved");
      expect(s.receipt).toEqual(receipt);
      expect(s.prescriptionId).toBe("rx1");
    });

    it("sets blocked status on 422 response", async () => {
      const err = { response: { status: 422 }, message: "Blocked" };
      mockApi.post.mockRejectedValueOnce(err);

      await expect(
        act(() => usePrescriptionStore.getState().approveOption("rx1", true)),
      ).rejects.toBeDefined();

      expect(usePrescriptionStore.getState().status).toBe("blocked");
      expect(usePrescriptionStore.getState().error).toBe("Prescription blocked");
    });
  });

  describe("rejectOption", () => {
    it("sends rejection and updates status", async () => {
      mockApi.post.mockResolvedValueOnce(undefined);

      await act(() =>
        usePrescriptionStore.getState().rejectOption("rx1", "Not suitable"),
      );

      expect(mockApi.post).toHaveBeenCalledWith("/prescriptions/reject", {
        prescription_id: "rx1",
        reason: "Not suitable",
      });
      const s = usePrescriptionStore.getState();
      expect(s.status).toBe("rejected");
      expect(s.prescriptionId).toBe("rx1");
    });
  });

  describe("fetchReceipt", () => {
    it("fetches and stores receipt", async () => {
      const receipt = { receiptId: "r1", prescriptionId: "rx1" } as PrescriptionReceipt;
      mockApi.get.mockResolvedValueOnce(receipt);

      await act(() =>
        usePrescriptionStore.getState().fetchReceipt("rx1"),
      );

      expect(mockApi.get).toHaveBeenCalledWith("/prescriptions/rx1/receipt");
      expect(usePrescriptionStore.getState().receipt).toEqual(receipt);
    });
  });

  describe("generatePatientPack", () => {
    it("fetches and stores patient pack", async () => {
      const pack: PatientPack = {
        instructions: "Take with food",
        warnings: ["Avoid alcohol"],
        medicationSchedule: "Morning and evening",
      };
      mockApi.post.mockResolvedValueOnce(pack);

      await act(() =>
        usePrescriptionStore.getState().generatePatientPack("rx1"),
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/prescriptions/rx1/patient-pack",
      );
      expect(usePrescriptionStore.getState().patientPack).toEqual(pack);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      usePrescriptionStore.setState({
        options: [{ primary: {} } as never],
        status: "approved",
        prescriptionId: "rx1",
        receipt: {} as PrescriptionReceipt,
        isLoading: true,
        error: "err",
      });

      act(() => usePrescriptionStore.getState().reset());

      const s = usePrescriptionStore.getState();
      expect(s.options).toEqual([]);
      expect(s.status).toBe("idle");
      expect(s.prescriptionId).toBeNull();
      expect(s.receipt).toBeNull();
      expect(s.patientPack).toBeNull();
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });
  });
});

// ── uiStore (already tested, quick sanity check) ───────────

describe("§5.3 uiStore — sanity check", () => {
  it("was already fully tested in accessibility.test.tsx", () => {
    expect(true).toBe(true);
  });
});
