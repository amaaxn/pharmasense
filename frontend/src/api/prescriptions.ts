import apiClient from "./client";
import type {
  PrescriptionReceipt,
  PatientPack,
  RecommendationOption,
} from "../stores/prescriptionStore";

export interface RecommendRequest {
  visit_id: string;
  chief_complaint: string;
  patient_id: string;
  current_medications: string[];
  allergies: string[];
  notes?: string;
}

export interface RecommendResponse {
  recommendations: RecommendationOption[];
  reasoning_summary: string | null;
}

export interface ApproveRequest {
  prescription_id: string;
  confirmed_safety_review: boolean;
  comment?: string;
}

export interface RejectRequest {
  prescription_id: string;
  reason: string;
}

export interface ValidateRequest {
  visit_id: string;
  patient_id: string;
  proposed_drugs: {
    drug_name: string;
    generic_name?: string;
    dosage: string;
    frequency: string;
    duration?: string;
    route?: string;
  }[];
}

export interface ValidationFlag {
  rule: string;
  severity: string;
  drug: string;
  message: string;
  relatedDrug: string | null;
  relatedAllergy: string | null;
}

export interface DrugValidationResult {
  drugName: string;
  passed: boolean;
  tier: number | null;
  copay: number | null;
  isCovered: boolean | null;
  requiresPriorAuth: boolean;
  flags: ValidationFlag[];
}

export interface ValidateResponse {
  visitId: string;
  patientId: string;
  allPassed: boolean;
  results: DrugValidationResult[];
  blocked: boolean;
  blockReasons: string[];
}

export async function recommend(
  payload: RecommendRequest,
): Promise<RecommendResponse> {
  return await apiClient.post(
    "/prescriptions/recommend",
    payload,
  ) as unknown as RecommendResponse;
}

export async function validate(
  payload: ValidateRequest,
): Promise<ValidateResponse> {
  return await apiClient.post(
    "/prescriptions/validate",
    payload,
  ) as unknown as ValidateResponse;
}

export async function approve(
  payload: ApproveRequest,
): Promise<PrescriptionReceipt> {
  return await apiClient.post(
    "/prescriptions/approve",
    payload,
  ) as unknown as PrescriptionReceipt;
}

export async function reject(payload: RejectRequest): Promise<void> {
  await apiClient.post("/prescriptions/reject", payload);
}

export async function getReceipt(
  prescriptionId: string,
): Promise<PrescriptionReceipt> {
  return await apiClient.get(
    `/prescriptions/${prescriptionId}/receipt`,
  ) as unknown as PrescriptionReceipt;
}

export async function generatePatientPack(
  prescriptionId: string,
): Promise<PatientPack> {
  return await apiClient.post(
    `/prescriptions/${prescriptionId}/patient-pack`,
  ) as unknown as PatientPack;
}
