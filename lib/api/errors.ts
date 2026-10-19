import { AxiosError } from "axios";
import { rt } from "@/lib/i18n/runtime";

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

/** Resolved when the error is created, so the text follows the active UI language. */
const FALLBACK_MESSAGES: Record<number, () => string> = {
  401: () => rt("lib.apiErrors.sessionExpired"),
  402: () => rt("lib.apiErrors.subscriptionRequired"),
  403: () => rt("lib.apiErrors.forbidden"),
  404: () => rt("lib.apiErrors.notFound"),
  410: () => rt("lib.apiErrors.linkInvalid"),
  419: () => rt("lib.apiErrors.tokenExpired"),
  422: () => rt("lib.apiErrors.invalidData"),
  429: () => rt("lib.apiErrors.tooManyAttempts"),
};

function fallbackMessage(status: number): string {
  const fallback = FALLBACK_MESSAGES[status];
  if (fallback) return fallback();
  if (status >= 500) return rt("lib.apiErrors.server");
  return rt("lib.apiErrors.generic");
}

export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError(0, rt("lib.apiErrors.network"));
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

  return new ApiError(0, error instanceof Error ? error.message : rt("lib.apiErrors.unknown"));
}
