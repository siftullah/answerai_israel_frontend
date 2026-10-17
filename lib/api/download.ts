import { api } from "./client";

/**
 * Fetch a business-scoped file endpoint and trigger a browser download.
 * A plain <a href> can't work here — the business id travels in the
 * X-Business-Identifier header — so the file comes down as an axios blob.
 * CORS doesn't expose Content-Disposition, so `fallbackName` applies unless
 * the header happens to be visible.
 */
export async function downloadFile(
  path: string,
  params: object,
  fallbackName: string
): Promise<void> {
  const response = await api.get<Blob>(path, { params, responseType: "blob" });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackName;

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
