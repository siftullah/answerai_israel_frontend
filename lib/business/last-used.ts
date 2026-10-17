const STORAGE_KEY = "answerai.last-business";

export function getLastUsedBusiness(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastUsedBusiness(uuid: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, uuid);
  } catch {
    // Storage unavailable (private mode etc.) — the chooser still works.
  }
}

export function clearLastUsedBusiness(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
