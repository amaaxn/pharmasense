/**
 * API request/response types — aligned with backend ApiResponse envelope.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  error_code: string | null;
  meta: Record<string, unknown> | null;
}

export interface ErrorDetail {
  error: string;
  error_code: string;
  details: Record<string, unknown> | null;
}
