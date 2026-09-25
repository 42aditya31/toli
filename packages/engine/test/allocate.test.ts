import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { allocate, fnv1a32 } from '../src/index.ts';

const RUNS = Number(process.env.FC_RUNS ?? 200);

describe('fnv1a32 (07 §3)', () => {
  it('matches the reference FNV-1a 32-bit values', () => {
    expect(fnv1a32('')).toBe(2166136261);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });
  it('hashes UTF-8 bytes, not UTF-16 code units', () => {
    // '₹' is E2 82 B9 in UTF-8; U+1F600 is a surrogate pair (F0 9F 98 80).
    const manual = (bytes: number[]) => {
      let h = 2166136261;
      for (const b of bytes) h = Math.imul(h ^ b, 16777619) >>> 0;
      return h;
    };
    expect(fnv1a32('₹')).toBe(manual([0xe2, 0x82, 0xb9]));
    expect(fnv1a32('é')).toBe(manual([0xc3, 0xa9]));
    expect(fnv1a32('\u{1F600}')).toBe(manual([0xf0, 0x9f, 0x98, 0x80]));
  });
});

describe('allocate (07 §3)', () => {
  it('G2: ₹1,000 ÷ 3 gives 33334/33333/33333, deterministic', () => {
    const r = allocate(100000n, [1n, 1n, 1n], ['a', 'r', 'n'], 'exp-1');
    expect(r.reduce((x, y) => x + y, 0n)).toBe(100000n);
    expect([...r].sort()).toEqual([33333n, 33333n, 33334n]);
    expect(allocate(100000n, [1n, 1n, 1n], ['a', 'r', 'n'], 'exp-1')).toEqual(r);
  });
  it('the extra paisa goes to the lowest hash of seed|key', () => {
    const keys = ['a', 'r', 'n'];
    const r = allocate(100000n, [1n, 1n, 1n], keys, 'exp-1');
    const winner = [...keys].sort((x, y) => fnv1a32(`exp-1|${x}`) - fnv1a32(`exp-1|${y}`))[0];
    expect(r[keys.indexOf(winner as string)]).toBe(33334n);
  });
  it('largest remainder beats the hash', () => {
    // 10 × (2,1)/3 → exact 6.67 / 3.33 → floors 6/3, R=1, remainders 2 vs 1 → first gets it.
    expect(allocate(10n, [2n, 1n], ['x', 'y'], 's')).toEqual([7n, 3n]);
  });
  it('breaks a real hash collision by key, whatever the input order', () => {
    // fnv1a32('s|k439599') === fnv1a32('s|k622382'): found by brute force.
    expect(fnv1a32('s|k439599')).toBe(fnv1a32('s|k622382'));
    expect(allocate(1n, [1n, 1n], ['k622382', 'k439599'], 's')).toEqual([0n, 1n]);
    expect(allocate(1n, [1n, 1n], ['k439599', 'k622382'], 's')).toEqual([1n, 0n]);
  });
  it('breaks equal hashes by key', () => {
    // identical key strings hash equally; order is then by key compare, stable
    expect(allocate(1n, [1n, 1n], ['k', 'k'], 's')).toEqual([1n, 0n]);
  });
  it('gives weight 0 exactly 0 and handles total 0', () => {
    expect(allocate(5n, [0n, 1n], ['a', 'b'], 's')).toEqual([0n, 5n]);
    expect(allocate(0n, [1n, 1n], ['a', 'b'], 's')).toEqual([0n, 0n]);
  });
  it('rejects bad input', () => {
    expect(() => allocate(-1n, [1n], ['a'], 's')).toThrow('invalid_allocation');
    expect(() => allocate(1n, [0n], ['a'], 's')).toThrow('invalid_allocation');
    expect(() => allocate(1n, [-1n, 2n], ['a', 'b'], 's')).toThrow('invalid_allocation');
    expect(() => allocate(1n, [1n], ['a', 'b'], 's')).toThrow('invalid_allocation');
    expect(() => allocate(1n, [], [], 's')).toThrow('invalid_allocation');
  });
  it('invariant 2: sums to total, parts ≥ 0, within 1 of exact, order independent', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 12n }),
        fc.array(fc.bigInt({ min: 0n, max: 10000n }), { minLength: 1, maxLength: 12 }),
        fc.string(),
        (total, rawWeights, seed) => {
          const weights = rawWeights.some((w) => w > 0n) ? rawWeights : [1n, ...rawWeights];
          const keys = weights.map((_, i) => `m${i}`);
          const parts = allocate(total, weights, keys, seed);
          const W = weights.reduce((a, b) => a + b, 0n);
          expect(parts.reduce((a, b) => a + b, 0n)).toBe(total);
          parts.forEach((p, i) => {
            const w = weights[i] as bigint;
            expect(p >= 0n).toBe(true);
            if (w === 0n) expect(p).toBe(0n);
            // |p − total·w/W| < 1  ⇔  |p·W − total·w| < W
            const diff = p * W - total * w;
            expect(diff < W && -diff < W).toBe(true);
          });
          const rev = allocate(total, [...weights].reverse(), [...keys].reverse(), seed);
          expect([...rev].reverse()).toEqual(parts);
        },
      ),
      { numRuns: RUNS },
    );
  });
});
