import apiClient from "./client";

export interface UserProfile {
  userId: string;
  email: string;
  role: "patient" | "clinician";
}

export async function getProfile(): Promise<UserProfile> {
  return await apiClient.get("/auth/profile") as unknown as UserProfile;
}

export async function updateProfile(
  data: Partial<Pick<UserProfile, "email">>,
): Promise<UserProfile> {
  return await apiClient.put("/auth/profile", data) as unknown as UserProfile;
}
