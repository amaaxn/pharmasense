import apiClient from "./client";

export interface ChatMessage {
  sender: string;
  text: string;
}

export interface ChatRequest {
  visit_id: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  visitId: string;
}

export async function sendMessage(
  payload: ChatRequest,
): Promise<ChatResponse> {
  return await apiClient.post("/chat", payload) as unknown as ChatResponse;
}
