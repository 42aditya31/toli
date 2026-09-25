// The only place where money crosses between SQLite numbers and Minor bigints (D-028).
import type { Minor } from '@toli/engine';

export type { Minor };

const MAX = BigInt(Number.MAX_SAFE_INTEGER);

export function fromDb(value: number): Minor;
export function fromDb(value: number | null): Minor | null;
export function fromDb(value: number | null): Minor | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value))
    throw new RangeError(`unsafe money value from SQLite: ${value}`);
  return BigInt(value) as Minor;
}

export function toDb(value: bigint): number {
  if (value > MAX || value < -MAX) throw new RangeError(`unsafe money value for SQLite: ${value}`);
  return Number(value);
}
