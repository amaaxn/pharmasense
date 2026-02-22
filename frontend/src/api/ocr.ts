import apiClient from "./client";

export type OcrSourceType = "HANDWRITING" | "INSURANCE_CARD" | "FORMULARY_PDF";

export interface OcrRequest {
  base64_data: string;
  mime_type: string;
  source_type: OcrSourceType;
}

export interface OcrResponse {
  sourceType: string;
  result: Record<string, unknown>;
}

export async function processOcr(payload: OcrRequest): Promise<OcrResponse> {
  return await apiClient.post("/ocr", payload) as unknown as OcrResponse;
}
