import apiClient from "./client";

export interface VoiceGenerateRequest {
  prescriptionId: string;
  text?: string;
  language?: "en" | "es";
}

export interface VoiceResponse {
  audioUrl: string;
  prescriptionId: string;
}

export async function generateVoicePack(
  payload: VoiceGenerateRequest,
): Promise<VoiceResponse> {
  return (await apiClient.post(
    "/voice/generate",
    payload,
  )) as unknown as VoiceResponse;
}

export async function getVoicePack(voiceId: string): Promise<VoiceResponse> {
  return (await apiClient.get(
    `/voice/${voiceId}`,
  )) as unknown as VoiceResponse;
}
