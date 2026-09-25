import { describe, expect, it } from 'vitest';
import { formatMoney, parseMajor, spokenMoney } from '../src/index.ts';

describe('formatMoney (07 §12)', () => {
  it('uses Indian grouping and hides .00 for whole INR', () => {
    expect(formatMoney(340000n, 'INR')).toBe('₹3,400');
    expect(formatMoney(12345600n, 'INR')).toBe('₹1,23,456');
    expect(formatMoney(12345678n, 'INR')).toBe('₹1,23,456.78');
    expect(formatMoney(99999999900n, 'INR')).toBe('₹99,99,99,999');
    expect(formatMoney(33334n, 'INR')).toBe('₹333.34');
    expect(formatMoney(5n, 'INR')).toBe('₹0.05');
    expect(formatMoney(0n, 'INR')).toBe('₹0');
    expect(formatMoney(99900n, 'INR')).toBe('₹999');
  });
  it('signs with + and a true minus (U+2212), never on zero', () => {
    expect(formatMoney(340000n, 'INR', { signed: true })).toBe('+₹3,400');
    expect(formatMoney(-120000n, 'INR', { signed: true })).toBe('−₹1,200');
    expect(formatMoney(0n, 'INR', { signed: true })).toBe('₹0');
    expect(formatMoney(-120000n, 'INR')).toBe('₹1,200');
  });
  it('handles other exponents and symbols with western grouping', () => {
    expect(formatMoney(123456789n, 'USD')).toBe('$1,234,567.89');
    expect(formatMoney(100n, 'USD')).toBe('$1.00');
    expect(formatMoney(1234567n, 'JPY')).toBe('¥1,234,567');
    expect(formatMoney(1234n, 'KWD')).toBe('KWD 1.234');
    expect(formatMoney(150n, 'EUR')).toBe('€1.50');
    expect(formatMoney(100n, 'GBP')).toBe('£1.00');
    expect(formatMoney(530000000n, 'IDR')).toBe('Rp5,300,000');
    expect(formatMoney(12n, 'IDR')).toBe('Rp0.12');
  });
});

describe('spokenMoney (13 §10 screen-reader labels)', () => {
  it('reads INR in Indian words', () => {
    expect(spokenMoney(120000n, 'INR')).toBe('one thousand two hundred rupees');
    expect(spokenMoney(33334n, 'INR')).toBe(
      'three hundred thirty three rupees and thirty four paise',
    );
    expect(spokenMoney(14000000n, 'INR')).toBe('one lakh forty thousand rupees');
    expect(spokenMoney(1234567800n, 'INR')).toBe(
      'one crore twenty three lakh forty five thousand six hundred seventy eight rupees',
    );
    expect(spokenMoney(100n, 'INR')).toBe('one rupee');
    expect(spokenMoney(1n, 'INR')).toBe('one paisa');
    expect(spokenMoney(0n, 'INR')).toBe('zero rupees');
    expect(spokenMoney(-100000n, 'INR')).toBe('minus one thousand rupees');
    expect(spokenMoney(1500000000000n, 'INR')).toBe('one thousand five hundred crore rupees');
    expect(spokenMoney(1011n, 'INR')).toBe('ten rupees and eleven paise');
  });
  it('reads other currencies in western words', () => {
    expect(spokenMoney(123456789n, 'USD')).toBe(
      'one million two hundred thirty four thousand five hundred sixty seven dollars and eighty nine cents',
    );
    expect(spokenMoney(100n, 'USD')).toBe('one dollar');
    expect(spokenMoney(1n, 'USD')).toBe('one cent');
    expect(spokenMoney(2000n, 'JPY')).toBe('two thousand yen');
    expect(spokenMoney(1000000000000n, 'EUR')).toBe('ten billion euros');
    expect(spokenMoney(200000000000000n, 'USD')).toBe('two thousand billion dollars');
    expect(spokenMoney(250n, 'GBP')).toBe('two pounds and fifty pence');
    expect(spokenMoney(1234n, 'KWD')).toBe('one KWD and two hundred thirty four thousandths');
  });
});

describe('parseMajor', () => {
  it('parses whole and decimal input into minor units', () => {
    expect(parseMajor('1200', 'INR')).toBe(120000n);
    expect(parseMajor('1,200.5', 'INR')).toBe(120050n);
    expect(parseMajor(' 0.05 ', 'INR')).toBe(5n);
    expect(parseMajor('12.', 'USD')).toBe(1200n);
    expect(parseMajor('500', 'JPY')).toBe(500n);
    expect(parseMajor('1.234', 'KWD')).toBe(1234n);
  });
  it('rejects junk, negatives and too many decimals', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1e3', '.', '1..2']) {
      expect(parseMajor(bad, 'INR')).toBeNull();
    }
    expect(parseMajor('1.5', 'JPY')).toBeNull();
  });
});
