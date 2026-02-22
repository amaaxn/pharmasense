import apiClient from "./client";

export interface AnalyticsSummary {
  totalVisits: number;
  totalPrescriptions: number;
  avgCopay: number;
  safetyBlockRate: number;
}

export interface CopaySavings {
  totalSaved: number;
  averageSavedPerPrescription: number;
  comparisons: { drugName: string; originalCopay: number; finalCopay: number }[];
}

export interface SafetyBlockStats {
  totalBlocked: number;
  byReason: { reason: string; count: number }[];
}

export interface TimeSavedStats {
  avgMinutesSaved: number;
  totalVisits: number;
  estimatedTotalMinutes: number;
}

export async function getSummary(): Promise<AnalyticsSummary> {
  return await apiClient.get("/analytics/summary") as unknown as AnalyticsSummary;
}

export async function getCopaySavings(): Promise<CopaySavings> {
  return await apiClient.get("/analytics/copay-savings") as unknown as CopaySavings;
}

export async function getSafetyBlocks(): Promise<SafetyBlockStats> {
  return await apiClient.get("/analytics/safety-blocks") as unknown as SafetyBlockStats;
}

export async function getTimeSaved(): Promise<TimeSavedStats> {
  return await apiClient.get("/analytics/time-saved") as unknown as TimeSavedStats;
}
