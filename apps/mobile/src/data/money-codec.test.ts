import { describe, expect, it } from 'vitest';
import { fromDb, toDb } from './money-codec.ts';

describe('money-codec', () => {
  it('round-trips the values Toli can hold', () => {
    for (const v of [
      0n,
      1n,
      -1n,
      33334n,
      100_000_000_000n,
      -100_000_000_000n,
      9_007_199_254_740_991n,
    ]) {
      expect(fromDb(toDb(v))).toBe(v);
    }
  });
  it('rejects unsafe or non-integer numbers from SQLite', () => {
    expect(() => fromDb(9_007_199_254_740_992)).toThrow('unsafe');
    expect(() => fromDb(1.5)).toThrow('unsafe');
    expect(() => fromDb(Number.NaN)).toThrow('unsafe');
  });
  it('rejects bigints that SQLite/JS numbers cannot carry exactly', () => {
    expect(() => toDb(9_007_199_254_740_992n)).toThrow('unsafe');
  });
  it('reads null as null', () => {
    expect(fromDb(null)).toBeNull();
  });
});
