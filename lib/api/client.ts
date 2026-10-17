import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ensureCsrfCookie } from "./csrf";
import { normalizeApiError } from "./errors";
import { API_URL } from "./endpoints";

const MUTATING_METHODS = ["post", "put", "patch", "delete"];

/** Matches /b/{uuid} and /b/{uuid}/... — capture group 1 is the business uuid. */
const BUSINESS_PATH = /^\/b\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

/** Routes where a 401 must never trigger a hard redirect (loop-breaker). */
const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
  // The customer-facing quote page — viewers are anonymous by design.
  "/q",
];

type RetriableConfig = InternalAxiosRequestConfig & { __csrfRetried?: boolean };

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use(async (config) => {
  // Client components are also evaluated during SSR — never touch browser
  // APIs outside this guard.
  if (typeof window === "undefined") return config;

  const method = (config.method ?? "get").toLowerCase();
  if (MUTATING_METHODS.includes(method)) {
    await ensureCsrfCookie();
  }

  if (!config.headers.has("X-Business-Identifier")) {
    const match = window.location.pathname.match(BUSINESS_PATH);
    if (match) {
      config.headers.set("X-Business-Identifier", match[1]);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (typeof window === "undefined") {
      throw normalizeApiError(error);
    }

    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Blob requests (CSV export) receive Blob error bodies — hydrate JSON
    // ones so normalizeApiError sees the real Laravel message.
    const body = error.response?.data;
    if (typeof Blob !== "undefined" && body instanceof Blob && body.type.includes("json")) {
      try {
        error.response!.data = JSON.parse(await body.text());
      } catch {
        // Keep the Blob; normalizeApiError falls back to a generic message.
      }
    }

    // Stale CSRF token: refresh the cookie and retry the request exactly once.
    if (status === 419 && config && !config.__csrfRetried) {
      config.__csrfRetried = true;
      await ensureCsrfCookie(true);
      return api(config);
    }

    if (status === 401) {
      const url = config?.url ?? "";
      // /me and auth/* 401s are expected states the guards interpret;
      // and while already on a public auth route a redirect would loop.
      const requestExempt = url === "me" || url.startsWith("auth/");
      const pathname = window.location.pathname;
      const onPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      if (!requestExempt && !onPublicAuthRoute) {
        const returnTo = pathname + window.location.search;
        window.location.assign(`/login?return=${encodeURIComponent(returnTo)}`);
      }
    }

    // 402 = no usable subscription. Everything outside the plans/billing
    // route group throws it — land the user on the billing hub, which routes
    // onwards itself (no subscription at all → plans page).
    if (status === 402) {
      const match = window.location.pathname.match(BUSINESS_PATH);
      if (match) {
        const billingPath = `/b/${match[1]}/settings/billing`;
        const plansPath = `/b/${match[1]}/plans`;
        const { pathname } = window.location;
        // Already on a billing surface: stray 402s (e.g. the layout's modules
        // query) must not re-trigger navigation — that would loop.
        if (!pathname.startsWith(billingPath) && !pathname.startsWith(plansPath)) {
          window.location.assign(billingPath);
        }
      }
    }

    throw normalizeApiError(error);
  }
);
