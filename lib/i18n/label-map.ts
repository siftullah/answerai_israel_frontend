import { rt } from "./runtime";

/**
 * A `Record<key, string>` whose values are translated lazily on access, so
 * static label maps (status badges, catalog copy) keep their shape while the
 * text follows the active locale. `Object.entries`/`keys` still work — the
 * getters are enumerable.
 *
 *   const STATUS_LABELS = labelMap("lib.appointmentStatus", ["scheduled", "confirmed"]);
 *   STATUS_LABELS.scheduled // → rt("lib.appointmentStatus.scheduled")
 */
export function labelMap<K extends string>(prefix: string, keys: readonly K[]): Record<K, string> {
  const map = {} as Record<K, string>;
  for (const key of keys) {
    Object.defineProperty(map, key, {
      enumerable: true,
      get: () => rt(`${prefix}.${key}`),
    });
  }
  return map;
}
