import apiClient from "./client";

export interface VoiceGenerateRequest {
  prescriptionId: string;
  language?: string;
}

export interface VoicePack {
  voiceId: string;
  audioUrl: string;
  language: string;
}

export async function generateVoicePack(
  payload: VoiceGenerateRequest,
): Promise<VoicePack> {
  return await apiClient.post(
    "/voice/generate",
    payload,
  ) as unknown as VoicePack;
}

export async function getVoicePack(voiceId: string): Promise<VoicePack> {
  return await apiClient.get(
    `/voice/${voiceId}`,
  ) as unknown as VoicePack;
}
