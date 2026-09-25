import { describe, expect, it } from 'vitest';
import { currencyExponent, SUPPORTED_CURRENCIES } from '../src/index.ts';

describe('currency table (07 §4.1)', () => {
  it('knows the exponents the docs name', () => {
    expect(currencyExponent('INR')).toBe(2);
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(currencyExponent('IDR')).toBe(2);
    expect(currencyExponent('VND')).toBe(0);
    expect(currencyExponent('CLF')).toBe(4);
  });
  it('rejects unknown and lower-case codes', () => {
    expect(() => currencyExponent('XXX')).toThrow('unknown_currency');
    expect(() => currencyExponent('inr')).toThrow('unknown_currency');
  });
  it('lists INR first', () => {
    expect(SUPPORTED_CURRENCIES[0]).toBe('INR');
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(100);
  });
});
