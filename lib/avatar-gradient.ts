/**
 * Deterministic per-entity gradient for initial-letter avatar tiles: hashes a
 * stable seed (uuid) into a fixed palette, so each business always keeps its
 * color while different businesses get visibly different ones.
 * Full literal class strings — Tailwind's scanner needs them intact.
 */
// Deliberately avoids the brand hues (blue/cyan/teal and neighbors like
// sky/indigo/emerald) so tiles never read as "brand" and stay distinct.
const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-fuchsia-500 to-pink-500",
  "from-rose-500 to-red-500",
  "from-orange-500 to-amber-500",
  "from-lime-500 to-green-600",
  "from-red-500 to-orange-600",
] as const;

export function avatarGradientClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
