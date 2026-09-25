import { allocate } from '../allocate/allocate.ts';
import { computeBalances } from '../balance/balances.ts';
import type { Ledger } from '../balance/ledger.ts';
import { currencyExponent, pow10 } from '../money/currency.ts';

/**
 * Implied refunds (07 §6): leftover × c_i / C, through allocate(). These are explanation lines
 * ("→ refund"); the money itself moves through the normal settle-up.
 */
export function kittyRefunds(ledger: Ledger): Record<string, bigint> {
  const remaining = computeBalances(ledger).kittyCash;
  const per: Record<string, bigint> = {};
  for (const c of ledger.contributions) per[c.memberId] = (per[c.memberId] ?? 0n) + c.amount;
  const ids = Object.keys(per).sort();
  if (remaining <= 0n || ids.length === 0) return {};
  const parts = allocate(
    remaining,
    ids.map((id) => per[id] as bigint),
    ids,
    'kitty-refund',
  );
  return Object.fromEntries(ids.map((id, i) => [id, parts[i] as bigint]));
}

/** Low when remaining ≤ threshold_bp × put in / 10000 (default 20%, 07 §6). */
export function isKittyLow(kittyIn: bigint, remaining: bigint, thresholdBp = 2000n): boolean {
  return remaining * 10000n <= thresholdBp * kittyIn;
}

/**
 * Per-person top-up to last the rest of the trip at today's pace (07 §6, R1b UI):
 * need = spent × days_left ÷ days_elapsed − remaining, per member, rounded up to 50 major units.
 */
export function topUpSuggestion(input: {
  readonly kittySpent: bigint;
  readonly daysElapsed: bigint;
  readonly daysLeft: bigint;
  readonly remaining: bigint;
  readonly members: bigint;
  readonly currency: string;
}): bigint {
  const elapsed = input.daysElapsed > 1n ? input.daysElapsed : 1n;
  const needScaled = input.kittySpent * input.daysLeft - input.remaining * elapsed;
  if (needScaled <= 0n || input.members <= 0n) return 0n;
  const denominator = elapsed * input.members;
  const each = (needScaled + denominator - 1n) / denominator;
  const step = 50n * pow10(currencyExponent(input.currency));
  return ((each + step - 1n) / step) * step;
}
