import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findMoneyNumbers } from './check-money-types.mjs';

const fx = (p) => fileURLToPath(new URL(`./fixtures/${p}`, import.meta.url));

describe('check-money-types', () => {
  it('flags every money-named declaration typed number', () => {
    const hits = findMoneyNumbers([fx('bad.ts')])
      .map((h) => h.name)
      .sort();
    expect(hits).toEqual(['amountMinor', 'amount_minor', 'balance', 'shareMinor', 'totalAmount']);
  });
  it('accepts bigint money and non-money numbers', () => {
    expect(findMoneyNumbers([fx('good.ts')])).toEqual([]);
  });
  it('exempts data/money-codec.ts', () => {
    expect(findMoneyNumbers([fx('data/money-codec.ts')])).toEqual([]);
  });
});
