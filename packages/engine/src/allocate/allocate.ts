import { fnv1a32 } from './fnv1a32.ts';

/**
 * The one function allowed to divide money (07 §3, D-005).
 * Floors each share, then hands the leftover minor units out one each:
 * largest remainder first, then lowest fnv1a32(seed|key), then lowest key.
 */
export function allocate(
  total: bigint,
  weights: readonly bigint[],
  keys: readonly string[],
  seed: string,
): bigint[] {
  if (total < 0n || weights.length === 0 || weights.length !== keys.length) {
    throw new Error('invalid_allocation');
  }
  let sum = 0n;
  for (const w of weights) {
    if (w < 0n) throw new Error('invalid_allocation');
    sum += w;
  }
  if (sum === 0n) throw new Error('invalid_allocation');

  const parts: bigint[] = [];
  let given = 0n;
  const candidates: { i: number; rem: bigint; hash: number; key: string }[] = [];
  weights.forEach((w, i) => {
    const product = total * w;
    const floor = product / sum;
    parts.push(floor);
    given += floor;
    const key = keys[i] as string;
    if (w > 0n) candidates.push({ i, rem: product % sum, hash: fnv1a32(`${seed}|${key}`), key });
  });

  candidates.sort((a, b) => {
    if (a.rem !== b.rem) return a.rem > b.rem ? -1 : 1;
    if (a.hash !== b.hash) return a.hash - b.hash;
    if (a.key !== b.key) return a.key < b.key ? -1 : 1;
    return a.i - b.i;
  });
  const leftover = Number(total - given); // always < number of weighted recipients
  for (let k = 0; k < leftover; k++) {
    const c = candidates[k] as (typeof candidates)[number];
    parts[c.i] = (parts[c.i] as bigint) + 1n;
  }
  return parts;
}
