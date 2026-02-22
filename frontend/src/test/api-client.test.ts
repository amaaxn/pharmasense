import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Hoist mock functions so vi.mock factory can reference them ─

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
  },
}));

import * as authApi from "../api/auth";
import * as visitsApi from "../api/visits";
import * as prescriptionsApi from "../api/prescriptions";
import * as patientsApi from "../api/patients";
import * as ocrApi from "../api/ocr";
import * as chatApi from "../api/chat";
import * as voiceApi from "../api/voice";
import * as analyticsApi from "../api/analytics";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── §6.1 API Client (interceptor behaviour tested via stores) ───

describe("§6.1 API client module", () => {
  it("re-exports from api/client.ts without error", async () => {
    const { apiClient } = await import("../api/index");
    expect(apiClient).toBeDefined();
  });

  it("barrel index exports all API namespaces", async () => {
    const barrel = await import("../api/index");
    expect(barrel.authApi).toBeDefined();
    expect(barrel.visitsApi).toBeDefined();
    expect(barrel.prescriptionsApi).toBeDefined();
    expect(barrel.patientsApi).toBeDefined();
    expect(barrel.ocrApi).toBeDefined();
    expect(barrel.chatApi).toBeDefined();
    expect(barrel.voiceApi).toBeDefined();
    expect(barrel.analyticsApi).toBeDefined();
  });
});

// ── §6.2 auth.ts ────────────────────────────────────────────

describe("§6.2 api/auth.ts", () => {
  it("getProfile calls GET /auth/profile", async () => {
    const profile = { userId: "u1", email: "a@b.com", role: "clinician" };
    mockGet.mockResolvedValueOnce(profile);

    const result = await authApi.getProfile();

    expect(mockGet).toHaveBeenCalledWith("/auth/profile");
    expect(result).toEqual(profile);
  });

  it("updateProfile calls PUT /auth/profile", async () => {
    const profile = { userId: "u1", email: "new@b.com", role: "clinician" };
    mockPut.mockResolvedValueOnce(profile);

    const result = await authApi.updateProfile({ email: "new@b.com" });

    expect(mockPut).toHaveBeenCalledWith("/auth/profile", { email: "new@b.com" });
    expect(result).toEqual(profile);
  });
});

// ── §6.2 visits.ts ──────────────────────────────────────────

describe("§6.2 api/visits.ts", () => {
  it("listVisits calls GET /visits", async () => {
    mockGet.mockResolvedValueOnce([]);
    const result = await visitsApi.listVisits();
    expect(mockGet).toHaveBeenCalledWith("/visits");
    expect(result).toEqual([]);
  });

  it("getVisit calls GET /visits/:id", async () => {
    const visit = { id: "v1" };
    mockGet.mockResolvedValueOnce(visit);
    const result = await visitsApi.getVisit("v1");
    expect(mockGet).toHaveBeenCalledWith("/visits/v1");
    expect(result).toEqual(visit);
  });

  it("createVisit calls POST /visits with payload", async () => {
    const payload: visitsApi.CreateVisitPayload = {
      patient_id: "p1",
      notes: "headache",
      chief_complaint: "headache",
      current_medications: [],
      allergies: [],
      diagnosis: "",
    };
    const created = { id: "v-new" };
    mockPost.mockResolvedValueOnce(created);

    const result = await visitsApi.createVisit(payload);
    expect(mockPost).toHaveBeenCalledWith("/visits", payload);
    expect(result).toEqual(created);
  });

  it("updateVisit calls PUT /visits/:id", async () => {
    mockPut.mockResolvedValueOnce({ id: "v1", status: "completed" });
    const result = await visitsApi.updateVisit("v1", { status: "completed" } as never);
    expect(mockPut).toHaveBeenCalledWith("/visits/v1", { status: "completed" });
    expect(result.status).toBe("completed");
  });

  it("extractVisitData calls POST /visits/:id/extract", async () => {
    const extracted = {
      chiefComplaint: "migraine",
      currentMedications: [],
      allergies: [],
      diagnosis: "migraine",
    };
    mockPost.mockResolvedValueOnce(extracted);

    const result = await visitsApi.extractVisitData("v1");
    expect(mockPost).toHaveBeenCalledWith("/visits/v1/extract");
    expect(result).toEqual(extracted);
  });
});

// ── §6.2 prescriptions.ts ───────────────────────────────────

describe("§6.2 api/prescriptions.ts", () => {
  it("recommend calls POST /prescriptions/recommend", async () => {
    const payload: prescriptionsApi.RecommendRequest = {
      visit_id: "v1",
      chief_complaint: "headache",
      patient_id: "p1",
      current_medications: [],
      allergies: [],
    };
    const response = { recommendations: [], reasoning_summary: null };
    mockPost.mockResolvedValueOnce(response);

    const result = await prescriptionsApi.recommend(payload);
    expect(mockPost).toHaveBeenCalledWith("/prescriptions/recommend", payload);
    expect(result).toEqual(response);
  });

  it("validate calls POST /prescriptions/validate", async () => {
    const payload: prescriptionsApi.ValidateRequest = {
      visit_id: "v1",
      patient_id: "p1",
      proposed_drugs: [{ drug_name: "Aspirin", dosage: "100mg", frequency: "daily" }],
    };
    const response = { allPassed: true, results: [], blocked: false, blockReasons: [] };
    mockPost.mockResolvedValueOnce(response);

    const result = await prescriptionsApi.validate(payload);
    expect(mockPost).toHaveBeenCalledWith("/prescriptions/validate", payload);
    expect(result.allPassed).toBe(true);
  });

  it("approve calls POST /prescriptions/approve", async () => {
    const payload: prescriptionsApi.ApproveRequest = {
      prescription_id: "rx1",
      confirmed_safety_review: true,
      comment: "OK",
    };
    const receipt = { receiptId: "r1", prescriptionId: "rx1" };
    mockPost.mockResolvedValueOnce(receipt);

    const result = await prescriptionsApi.approve(payload);
    expect(mockPost).toHaveBeenCalledWith("/prescriptions/approve", payload);
    expect(result).toEqual(receipt);
  });

  it("reject calls POST /prescriptions/reject", async () => {
    const payload: prescriptionsApi.RejectRequest = {
      prescription_id: "rx1",
      reason: "Not appropriate",
    };
    mockPost.mockResolvedValueOnce(undefined);

    await prescriptionsApi.reject(payload);
    expect(mockPost).toHaveBeenCalledWith("/prescriptions/reject", payload);
  });

  it("getReceipt calls GET /prescriptions/:id/receipt", async () => {
    const receipt = { receiptId: "r1" };
    mockGet.mockResolvedValueOnce(receipt);

    const result = await prescriptionsApi.getReceipt("rx1");
    expect(mockGet).toHaveBeenCalledWith("/prescriptions/rx1/receipt");
    expect(result).toEqual(receipt);
  });

  it("generatePatientPack calls POST /prescriptions/:id/patient-pack", async () => {
    const pack = { instructions: "Take with food", warnings: [], medicationSchedule: null };
    mockPost.mockResolvedValueOnce(pack);

    const result = await prescriptionsApi.generatePatientPack("rx1");
    expect(mockPost).toHaveBeenCalledWith("/prescriptions/rx1/patient-pack");
    expect(result).toEqual(pack);
  });
});

// ── §6.2 patients.ts ────────────────────────────────────────

describe("§6.2 api/patients.ts", () => {
  it("listPatients calls GET /patients", async () => {
    mockGet.mockResolvedValueOnce([]);
    const result = await patientsApi.listPatients();
    expect(mockGet).toHaveBeenCalledWith("/patients");
    expect(result).toEqual([]);
  });

  it("getPatient calls GET /patients/:id", async () => {
    const patient = { patientId: "p1", email: "p@test.com" };
    mockGet.mockResolvedValueOnce(patient);

    const result = await patientsApi.getPatient("p1");
    expect(mockGet).toHaveBeenCalledWith("/patients/p1");
    expect(result).toEqual(patient);
  });

  it("updatePatient calls PUT /patients/:id", async () => {
    const updated = { patientId: "p1" };
    mockPut.mockResolvedValueOnce(updated);

    const result = await patientsApi.updatePatient("p1", { allergies: ["Penicillin"] } as never);
    expect(mockPut).toHaveBeenCalledWith("/patients/p1", { allergies: ["Penicillin"] });
    expect(result).toEqual(updated);
  });
});

// ── §6.2 ocr.ts ─────────────────────────────────────────────

describe("§6.2 api/ocr.ts", () => {
  it("processOcr calls POST /ocr with base64 payload", async () => {
    const payload: ocrApi.OcrRequest = {
      base64_data: "abc123==",
      mime_type: "image/png",
      source_type: "HANDWRITING",
    };
    const response = { sourceType: "HANDWRITING", result: { raw_text: "hello" } };
    mockPost.mockResolvedValueOnce(response);

    const result = await ocrApi.processOcr(payload);
    expect(mockPost).toHaveBeenCalledWith("/ocr", payload);
    expect(result.sourceType).toBe("HANDWRITING");
  });
});

// ── §6.2 chat.ts ────────────────────────────────────────────

describe("§6.2 api/chat.ts", () => {
  it("sendMessage calls POST /chat with history", async () => {
    const payload: chatApi.ChatRequest = {
      visit_id: "v1",
      message: "What are the side effects?",
      history: [{ sender: "user", text: "Hello" }],
    };
    const response = { reply: "The common side effects are...", visitId: "v1" };
    mockPost.mockResolvedValueOnce(response);

    const result = await chatApi.sendMessage(payload);
    expect(mockPost).toHaveBeenCalledWith("/chat", payload);
    expect(result.reply).toContain("side effects");
  });
});

// ── §6.2 voice.ts ───────────────────────────────────────────

describe("§6.2 api/voice.ts", () => {
  it("generateVoicePack calls POST /voice/generate", async () => {
    const payload: voiceApi.VoiceGenerateRequest = {
      prescriptionId: "rx1",
      language: "en",
    };
    const pack = { voiceId: "vp1", audioUrl: "/audio/vp1.mp3", language: "en" };
    mockPost.mockResolvedValueOnce(pack);

    const result = await voiceApi.generateVoicePack(payload);
    expect(mockPost).toHaveBeenCalledWith("/voice/generate", payload);
    expect(result.voiceId).toBe("vp1");
  });

  it("getVoicePack calls GET /voice/:id", async () => {
    const pack = { voiceId: "vp1", audioUrl: "/audio/vp1.mp3", language: "en" };
    mockGet.mockResolvedValueOnce(pack);

    const result = await voiceApi.getVoicePack("vp1");
    expect(mockGet).toHaveBeenCalledWith("/voice/vp1");
    expect(result).toEqual(pack);
  });
});

// ── §6.2 analytics.ts ──────────────────────────────────────

describe("§6.2 api/analytics.ts", () => {
  it("getSummary calls GET /analytics/summary", async () => {
    const summary = { totalVisits: 50, totalPrescriptions: 40, avgCopay: 12.5, safetyBlockRate: 0.05 };
    mockGet.mockResolvedValueOnce(summary);

    const result = await analyticsApi.getSummary();
    expect(mockGet).toHaveBeenCalledWith("/analytics/summary");
    expect(result).toEqual(summary);
  });

  it("getCopaySavings calls GET /analytics/copay-savings", async () => {
    const data = { totalSaved: 500, averageSavedPerPrescription: 12, comparisons: [] };
    mockGet.mockResolvedValueOnce(data);

    const result = await analyticsApi.getCopaySavings();
    expect(mockGet).toHaveBeenCalledWith("/analytics/copay-savings");
    expect(result).toEqual(data);
  });

  it("getSafetyBlocks calls GET /analytics/safety-blocks", async () => {
    const data = { totalBlocked: 3, byReason: [] };
    mockGet.mockResolvedValueOnce(data);

    const result = await analyticsApi.getSafetyBlocks();
    expect(mockGet).toHaveBeenCalledWith("/analytics/safety-blocks");
    expect(result).toEqual(data);
  });

  it("getTimeSaved calls GET /analytics/time-saved", async () => {
    const data = { avgMinutesSaved: 15, totalVisits: 50, estimatedTotalMinutes: 750 };
    mockGet.mockResolvedValueOnce(data);

    const result = await analyticsApi.getTimeSaved();
    expect(mockGet).toHaveBeenCalledWith("/analytics/time-saved");
    expect(result).toEqual(data);
  });
});
