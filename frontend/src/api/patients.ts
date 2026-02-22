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

export async function listPatients(params?: { search?: string }): Promise<Patient[]> {
  const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  return await apiClient.get(`/patients${query}`) as unknown as Patient[];
}

export async function searchPatients(query: string): Promise<Patient[]> {
  return listPatients({ search: query });
}

export async function getPatient(patientId: string): Promise<Patient> {
  return await apiClient.get(`/patients/${patientId}`) as unknown as Patient;
}

export async function updatePatient(
  patientId: string,
  data: Partial<Patient>,
): Promise<Patient> {
  return await apiClient.put(
    `/patients/${patientId}`,
    data,
  ) as unknown as Patient;
}
