import apiClient from "./client";

export interface ResetDemoResult {
  message: string;
  seeded_files: string[];
}

export async function resetDemoData(): Promise<ResetDemoResult> {
  return (await apiClient.post("/admin/reset-demo")) as unknown as ResetDemoResult;
}
