import { currencyExponent, pow10 } from './currency.ts';

// Display only (07 §12). Deliberately independent of Intl, which differs between Android and iOS.
const SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  IDR: 'Rp',
};
/** Currencies whose whole amounts are shown without decimals (07 §4.1, §12). */
const HIDE_WHOLE_DECIMALS = new Set(['INR', 'IDR']);
const MINUS = '−';

function groupWestern(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export function formatMoney(
  amount: bigint,
  currency: string,
  opts: { readonly signed?: boolean } = {},
): string {
  const e = currencyExponent(currency);
  const abs = amount < 0n ? -amount : amount;
  const unit = pow10(e);
  const major = abs / unit;
  const frac = abs % unit;
  const grouped =
    currency === 'INR' ? groupIndian(major.toString()) : groupWestern(major.toString());
  const showDecimals = e > 0 && !(frac === 0n && HIDE_WHOLE_DECIMALS.has(currency));
  const number = showDecimals ? `${grouped}.${frac.toString().padStart(e, '0')}` : grouped;
  const symbol = SYMBOL[currency] ?? `${currency} `;
  const sign = opts.signed && amount !== 0n ? (amount > 0n ? '+' : MINUS) : '';
  return `${sign}${symbol}${number}`;
}

export function parseMajor(input: string, currency: string): bigint | null {
  const e = currencyExponent(currency);
  const m = /^(\d+)(?:\.(\d*))?$/.exec(input.trim().replace(/,/g, ''));
  if (!m) return null;
  const whole = m[1] as string;
  const fraction = m[2] ?? '';
  if (fraction.length > e) return null;
  return BigInt(whole) * pow10(e) + BigInt(fraction.padEnd(e, '0') || '0');
}
