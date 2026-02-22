/**
 * Core domain models — aligned with backend schemas.
 */

export interface UserProfile {
  userId: string;
  email: string;
  role: "patient" | "clinician";
}

export interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  insurancePlan: string | null;
}

export interface ExtractedData {
  chiefComplaint: string;
  currentMedications: string[];
  allergies: string[];
  diagnosis: string;
}

export type VisitStatus = "in_progress" | "completed" | "cancelled";

export interface Visit {
  id: string;
  patientId: string;
  clinicianId: string;
  status: VisitStatus;
  notes: string;
  extractedData: ExtractedData | null;
  createdAt: string;
  patientName?: string;
  reason?: string;
  prescriptionCount?: number;
}

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

export interface SafetyCheck {
  checkType: string;
  passed: boolean;
  severity: string | null;
  message: string;
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

export interface ReceiptAlternative {
  drugName: string;
  copay: number | null;
  coverageStatus: CoverageStatus;
  reason: string;
}

export interface ReceiptReasoning {
  clinicianSummary: string;
  patientExplanation: string;
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
  alternatives: ReceiptAlternative[];
  reasoning: ReceiptReasoning | null;
  notes: string | null;
}

export interface PatientPack {
  medicationName: string;
  purpose: string;
  howToTake: string;
  whatToAvoid: string[];
  sideEffects: string[];
  whenToSeekHelp: string[];
  storageInstructions: string;
  dailySchedule: string | null;
  language: string;
}
