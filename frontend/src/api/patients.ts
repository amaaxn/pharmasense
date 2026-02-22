import apiClient from "./client";

export interface Patient {
  patientId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  insurancePlan: string | null;
}

function normalizePatient(raw: unknown): Patient {
  const p = raw as Record<string, unknown>;
  return {
    ...p,
    allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
  } as Patient;
}

export async function listPatients(params?: { search?: string }): Promise<Patient[]> {
  const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  const raw = await apiClient.get(`/patients${query}`) as unknown as unknown[];
  return Array.isArray(raw) ? raw.map(normalizePatient) : [];
}

export async function searchPatients(query: string): Promise<Patient[]> {
  return listPatients({ search: query });
}

export async function getPatient(patientId: string): Promise<Patient> {
  const raw = await apiClient.get(`/patients/${patientId}`);
  return normalizePatient(raw);
}

export async function updatePatient(
  patientId: string,
  data: Partial<Patient>,
): Promise<Patient> {
  const raw = await apiClient.put(`/patients/${patientId}`, data);
  return normalizePatient(raw);
}
