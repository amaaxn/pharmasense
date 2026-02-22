import apiClient from "./client";
import type { Visit, ExtractedData } from "../stores/visitStore";

export interface CreateVisitPayload {
  patient_id: string;
  notes: string;
  chief_complaint: string;
  current_medications: string[];
  allergies: string[];
  diagnosis: string;
}

export async function listVisits(): Promise<Visit[]> {
  return await apiClient.get("/visits") as unknown as Visit[];
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
