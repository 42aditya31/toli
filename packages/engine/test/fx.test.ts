import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { convertToBase, crossRate, IDENTITY_RATE, parseRate } from '../src/index.ts';

describe('parseRate (07 §4.2)', () => {
  it('turns a decimal string into an exact fraction', () => {
    expect(parseRate('0.0053')).toEqual({ num: 53n, den: 10000n });
    expect(parseRate('83.12')).toEqual({ num: 8312n, den: 100n });
    expect(parseRate('1')).toEqual({ num: 1n, den: 1n });
    expect(IDENTITY_RATE).toEqual({ num: 1n, den: 1n });
  });
  it('rejects anything that is not a positive plain decimal', () => {
    for (const bad of ['', '0', '0.000', '-1', 'abc', '1e5', '.5', '1.']) {
      expect(() => parseRate(bad)).toThrow('invalid_rate');
    }
  });
});

describe('convertToBase', () => {
  it('rounds half up', () => {
    expect(convertToBase(100000000n, parseRate('0.0053'))).toBe(530000n);
    expect(convertToBase(15n, parseRate('0.5'))).toBe(8n);
    expect(convertToBase(14n, parseRate('0.5'))).toBe(7n);
    expect(convertToBase(1n, parseRate('0.4'))).toBe(0n);
    expect(convertToBase(123n, IDENTITY_RATE)).toBe(123n);
  });
});

describe('crossRate (07 §4.3), 12 significant digits, half up', () => {
  it('computes minor-unit rates through the pivot', () => {
    expect(crossRate('90', '17000', 'INR', 'IDR')).toBe('0.00529411764706');
    expect(crossRate('90', '160', 'INR', 'JPY')).toBe('56.25');
    expect(crossRate('90', '1.08', 'INR', 'USD')).toBe('83.3333333333');
    expect(crossRate('90', '0.33', 'INR', 'KWD')).toBe('27.2727272727');
    expect(crossRate('1', '1', 'INR', 'INR')).toBe('1');
    expect(crossRate('160', '1', 'JPY', 'EUR')).toBe('1.6');
    expect(crossRate('123456789012345', '1', 'INR', 'USD')).toBe('123456789012000');
  });
  it('carries when rounding reaches the next power of ten', () => {
    expect(crossRate('9999999999999', '10000000000000', 'INR', 'USD')).toBe('1');
  });
  it('always yields a rate parseRate accepts, with ≤ 12 significant digits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 ** 9 }),
        fc.integer({ min: 1, max: 10 ** 9 }),
        (a, b) => {
          const r = crossRate(`${a}.5`, `${b}`, 'INR', 'JPY');
          expect(() => parseRate(r)).not.toThrow();
          expect(
            r.replace('.', '').replace(/^0+/, '').replace(/0+$/, '').length,
          ).toBeLessThanOrEqual(12);
        },
      ),
      { numRuns: Number(process.env.FC_RUNS ?? 200) },
    );
  });
});
