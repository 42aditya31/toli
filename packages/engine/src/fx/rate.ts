import { currencyExponent, pow10 } from '../money/currency.ts';

/** Base-currency minor units per 1 expense-currency minor unit, as an exact fraction (07 §4.2). */
export type Rate = { readonly num: bigint; readonly den: bigint };

export const IDENTITY_RATE: Rate = { num: 1n, den: 1n };

const SIGNIFICANT_DIGITS = 12;

type Fraction = { num: bigint; den: bigint };

function parseDecimal(decimal: string): Fraction {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(decimal);
  if (!m) throw new Error(`invalid_rate: ${decimal}`);
  const fraction = m[2] ?? '';
  const num = BigInt((m[1] as string) + fraction);
  const den = pow10(fraction.length);
  if (num === 0n) throw new Error(`invalid_rate: ${decimal}`);
  return { num, den };
}

export function parseRate(decimal: string): Rate {
  return parseDecimal(decimal);
}

/** Half-up rounding of num/den for num ≥ 0, den > 0. */
export function roundHalfUp(num: bigint, den: bigint): bigint {
  return (2n * num + den) / (2n * den);
}

export function convertToBase(amount: bigint, rate: Rate): bigint {
  return roundHalfUp(amount * rate.num, rate.den);
}

/** Rounds num/den half up to 12 significant digits and prints it as a plain decimal string. */
function toSignificantDecimal(num: bigint, den: bigint): string {
  const limit = pow10(SIGNIFICANT_DIGITS);
  // Find k with 10^11 ≤ num·10^k/den < 10^12.
  let k = 0;
  const scaled = (kk: number) => (kk >= 0 ? (num * pow10(kk)) / den : num / (den * pow10(-kk)));
  while (scaled(k) >= limit) k--;
  while (scaled(k) < limit / 10n) k++;
  let q = k >= 0 ? roundHalfUp(num * pow10(k), den) : roundHalfUp(num, den * pow10(-k));
  if (q === limit) {
    q /= 10n;
    k--;
  }
  if (k <= 0) return (q * pow10(-k)).toString();
  const digits = q.toString().padStart(k + 1, '0');
  const whole = digits.slice(0, digits.length - k);
  const frac = digits.slice(digits.length - k).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

/**
 * Cross rate through the pivot currency (07 §4.3): (base per pivot) / (expense per pivot),
 * adjusted to minor units by 10^(exp_base − exp_expense), rounded to 12 significant digits.
 */
export function crossRate(
  basePerPivot: string,
  expPerPivot: string,
  baseCcy: string,
  expCcy: string,
): string {
  const b = parseDecimal(basePerPivot);
  const x = parseDecimal(expPerPivot);
  const shift = currencyExponent(baseCcy) - currencyExponent(expCcy);
  let num = b.num * x.den;
  let den = b.den * x.num;
  if (shift >= 0) num *= pow10(shift);
  else den *= pow10(-shift);
  return toSignificantDecimal(num, den);
}
