import apiClient from "./client";

// ── Shared types (canonical definitions) ──────────────────

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
  patientName?: string;
  reason?: string;
  prescriptionCount?: number;
}

export interface CreateVisitPayload {
  patient_id: string;
  notes: string;
  chief_complaint: string;
  current_medications: string[];
  allergies: string[];
  diagnosis: string;
}

// ── API functions ─────────────────────────────────────────

export async function listVisits(params?: { limit?: number; patientId?: string }): Promise<Visit[]> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.patientId) qs.set("patient_id", params.patientId);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return await apiClient.get(`/visits${query}`) as unknown as Visit[];
}

export async function getVisit(visitId: string): Promise<Visit> {
  return await apiClient.get(`/visits/${visitId}`) as unknown as Visit;
}

export async function createVisit(payload: CreateVisitPayload): Promise<Visit> {
  return await apiClient.post("/visits", payload) as unknown as Visit;
}

export async function updateVisit(
  visitId: string,
  payload: Partial<Visit>,
): Promise<Visit> {
  return await apiClient.put(`/visits/${visitId}`, payload) as unknown as Visit;
}

export async function extractVisitData(
  visitId: string,
): Promise<ExtractedData> {
  return await apiClient.post(`/visits/${visitId}/extract`) as unknown as ExtractedData;
}

export async function finalizeVisit(visitId: string): Promise<Visit> {
  return await apiClient.put(`/visits/${visitId}`, {
    status: "COMPLETED",
  }) as unknown as Visit;
}

export async function downloadVisitPdf(visitId: string): Promise<Blob> {
  const resp = await apiClient.post(`/visits/${visitId}/pdf`, {}, {
    responseType: "blob",
  });
  return resp as unknown as Blob;
}
