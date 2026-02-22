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

export async function listPatients(): Promise<Patient[]> {
  return await apiClient.get("/patients") as unknown as Patient[];
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
