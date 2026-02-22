import apiClient from "./client";

// ---------------------------------------------------------------------------
// Types matching backend AnalyticsDashboardResponse (Part 6 §2.7)
// ---------------------------------------------------------------------------

export interface CopaySavingsSummary {
  total_copay_saved: number;
  average_copay: number;
  total_prescriptions: number;
}

export interface CopayByStatus {
  coverage_status: string;
  count: number;
  total_copay: number;
}

export interface SafetyBlockReason {
  block_type: string;
  count: number;
  percentage: number;
}

export interface VisitEfficiency {
  total_visits: number;
  avg_duration_minutes: number;
  total_prescriptions: number;
}

export interface AdherenceRisk {
  medication: string;
  copay: number;
  tier: number | null;
  coverage_status: string;
  risk_level: string;
}

export interface AnalyticsDashboardResponse {
  copay_savings: CopaySavingsSummary;
  copay_by_status: CopayByStatus[];
  safety_blocks: SafetyBlockReason[];
  visit_efficiency: VisitEfficiency;
  adherence_risks: AdherenceRisk[];
  data_source: string;
  last_synced_at: string | null;
}

export interface EventCountByType {
  event_type: string;
  count: number;
}

export interface SyncResult {
  synced_count: number;
  failed_count: number;
  message: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function getSummary(): Promise<AnalyticsDashboardResponse> {
  return (await apiClient.get("/analytics/summary")) as unknown as AnalyticsDashboardResponse;
}

export async function getCopaySavings(): Promise<{
  copay_savings: CopaySavingsSummary;
  copay_by_status: CopayByStatus[];
  data_source: string;
}> {
  return (await apiClient.get("/analytics/copay-savings")) as unknown as {
    copay_savings: CopaySavingsSummary;
    copay_by_status: CopayByStatus[];
    data_source: string;
  };
}

export async function getSafetyBlocks(): Promise<{
  safety_blocks: SafetyBlockReason[];
  data_source: string;
}> {
  return (await apiClient.get("/analytics/safety-blocks")) as unknown as {
    safety_blocks: SafetyBlockReason[];
    data_source: string;
  };
}

export async function getTimeSaved(): Promise<{
  visit_efficiency: VisitEfficiency;
  data_source: string;
}> {
  return (await apiClient.get("/analytics/time-saved")) as unknown as {
    visit_efficiency: VisitEfficiency;
    data_source: string;
  };
}

export async function getAdherenceRisk(): Promise<{
  adherence_risks: AdherenceRisk[];
  data_source: string;
}> {
  return (await apiClient.get("/analytics/adherence-risk")) as unknown as {
    adherence_risks: AdherenceRisk[];
    data_source: string;
  };
}

export async function getEventCounts(): Promise<EventCountByType[]> {
  return (await apiClient.get("/analytics/event-counts")) as unknown as EventCountByType[];
}

export async function syncToSnowflake(): Promise<SyncResult> {
  return (await apiClient.post("/analytics/sync")) as unknown as SyncResult;
}
