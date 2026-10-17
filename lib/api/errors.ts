import { AxiosError } from "axios";

/**
 * Every non-2xx response (and network failure) is normalized into this shape
 * before it reaches TanStack Query / form code. `status === 0` means the
 * request never got a response (network down, CORS failure, API offline).
 */
export class ApiError extends Error {
  readonly status: number;
  /** Laravel validation bag from 422 responses: { field: ["message", ...] } */
  readonly errors?: Record<string, string[]>;
  /** Machine-readable code some services attach to 422s (e.g. callback_time_busy). */
  readonly reason?: string;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>,
    reason?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.reason = reason;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: "Your session has expired. Please log in again.",
  402: "An active subscription is required.",
  403: "You are not allowed to do that.",
  404: "Not found.",
  410: "This link is no longer valid.",
  419: "Your session token expired. Please try again.",
  422: "The given data was invalid.",
  429: "Too many attempts. Please wait a minute and try again.",
};

function fallbackMessage(status: number): string {
  if (FALLBACK_MESSAGES[status]) return FALLBACK_MESSAGES[status];
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "Something went wrong. Please try again.";
}

export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError(0, "Network error — please check your connection.");
    }

    const { status, data } = error.response;
    // data can be an HTML error page or empty — only trust object bodies.
    const body = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    const message =
      typeof body.message === "string" && body.message.length > 0 && status !== 429
        ? body.message
        : fallbackMessage(status);
    const errors =
      typeof body.errors === "object" && body.errors !== null
        ? (body.errors as Record<string, string[]>)
        : undefined;
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    return new ApiError(status, message, errors, reason);
  }

  return new ApiError(0, error instanceof Error ? error.message : "Something went wrong.");
}
