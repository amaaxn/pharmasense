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

export interface HandwritingExtractionOutput {
  transcribedText: string;
  structuredFields?: {
    allergies?: string[];
    currentMedications?: string[];
    chiefComplaint?: string;
    diagnosis?: string;
  };
}

export async function processOcr(payload: OcrRequest): Promise<OcrResponse> {
  return (await apiClient.post("/ocr", payload)) as unknown as OcrResponse;
}

export async function processHandwritingOcr(
  base64Data: string,
  mimeType = "image/png",
): Promise<HandwritingExtractionOutput> {
  const resp = await apiClient.post("/ocr", {
    base64_data: base64Data,
    mime_type: mimeType,
    source_type: "HANDWRITING",
  });
  const data = resp as unknown as OcrResponse;
  const result = data.result as unknown as HandwritingExtractionOutput;
  return {
    transcribedText: result.transcribedText ?? "",
    structuredFields: result.structuredFields,
  };
}
