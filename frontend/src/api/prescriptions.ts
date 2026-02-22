import apiClient from "./client";

// ── Shared types (canonical definitions) ──────────────────

export interface RecommendedDrug {
  drugName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  rationale: string;
  tier: number | null;
  estimatedCopay: number | null;
  isCovered: boolean | null;
  requiresPriorAuth: boolean | null;
}

export interface AlternativeDrug {
  drugName: string;
  genericName: string;
  dosage: string;
  reason: string;
  tier: number | null;
  estimatedCopay: number | null;
}

export interface SafetyCheck {
  checkType: string;
  passed: boolean;
  severity: string | null;
  message: string;
}

export type RecommendationLabel =
  | "BEST_COVERED"
  | "CHEAPEST"
  | "CLINICAL_BACKUP";

export type CoverageStatus =
  | "COVERED"
  | "NOT_COVERED"
  | "PRIOR_AUTH_REQUIRED"
  | "UNKNOWN";

export interface RecommendationOption {
  label?: RecommendationLabel;
  primary: RecommendedDrug;
  alternatives: AlternativeDrug[];
  warnings: string[];
  safetyChecks?: SafetyCheck[];
  blocked?: boolean;
  blockReason?: string;
  rationale?: string;
}

export interface ReceiptDrugItem {
  drugName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  tier: number | null;
  copay: number | null;
  isCovered: boolean;
  requiresPriorAuth: boolean;
}

export interface PrescriptionReceipt {
  receiptId: string;
  prescriptionId: string;
  visitId: string;
  patientId: string;
  clinicianId: string;
  patientName: string;
  clinicianName: string;
  issuedAt: string;
  status: string;
  drugs: ReceiptDrugItem[];
  safety: {
    allPassed: boolean;
    checks: SafetyCheck[];
    allergyFlags: string[];
    interactionFlags: string[];
    doseRangeFlags: string[];
  };
  coverage: {
    planName: string;
    memberId: string;
    totalCopay: number;
    itemsCovered: number;
    itemsNotCovered: number;
    priorAuthRequired: string[];
  };
  notes: string | null;
}

export interface PatientPack {
  instructions: string;
  warnings: string[];
  medicationSchedule: string | null;
}

// ── Request / response types ──────────────────────────────

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

export interface PrescriptionSummary {
  prescriptionId: string;
  drugName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: string;
  isCovered: boolean | null;
  estimatedCopay: number | null;
  tier: number | null;
}

// ── API functions ─────────────────────────────────────────

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

export async function listPrescriptionsByVisit(
  visitId: string,
): Promise<PrescriptionSummary[]> {
  return await apiClient.get(
    `/visits/${visitId}/prescriptions`,
  ) as unknown as PrescriptionSummary[];
}
