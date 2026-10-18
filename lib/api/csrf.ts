import axios from "axios";
import { API_URL } from "./endpoints";

let inflight: Promise<void> | null = null;

/**
 * Ensures the XSRF-TOKEN cookie exists before a mutating request. Sanctum
 * sets it on `.answerai.co.il.test` (not HttpOnly), so JS on the app
 * subdomain can check for it directly. Concurrent callers share a single
 * in-flight request. The fast-path can pass with an expired token — the
 * client's 419 retry (with force=true) is the designed recovery for that.
 */
export function ensureCsrfCookie(force = false): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!force && document.cookie.includes("XSRF-TOKEN=")) return Promise.resolve();

  // Bare axios, not the shared instance — avoids interceptor recursion.
  // The endpoint lives at the API root, outside /api/v1.
  inflight ??= axios
    .get(`${API_URL}/sanctum/csrf-cookie`, {
      withCredentials: true,
      headers: { Accept: "application/json" },
    })
    .then(() => undefined)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
