import { allocate } from '../allocate/allocate.ts';
import { convertToBase, type Rate } from '../fx/rate.ts';

type Values = Readonly<Record<string, bigint>>;

export type ExtraKind = 'tax' | 'service' | 'tip' | 'discount' | 'round_off';

export type SplitSpec =
  | { readonly mode: 'equal' | 'selected'; readonly participants: readonly string[] }
  | { readonly mode: 'exact'; readonly values: Values }
  | { readonly mode: 'percent'; readonly values: Values }
  | { readonly mode: 'shares'; readonly values: Values }
  | { readonly mode: 'adjustment'; readonly values: Values }
  | {
      readonly mode: 'itemised';
      readonly items: readonly {
        readonly id: string;
        readonly amount: bigint;
        readonly assignees: readonly string[];
      }[];
      readonly extras: readonly { readonly kind: ExtraKind; readonly amount: bigint }[];
    };

export type SplitError =
  | 'zero_amount'
  | 'no_participants'
  | 'unassigned'
  | 'too_much'
  | 'invalid_value'
  | 'items_mismatch';

export type SplitResult =
  | { readonly ok: true; readonly shares: Record<string, bigint> }
  | { readonly ok: false; readonly error: SplitError; readonly diff?: bigint };

const fail = (error: SplitError, diff?: bigint): SplitResult =>
  diff === undefined ? { ok: false, error } : { ok: false, error, diff };

const sumOf = (xs: Iterable<bigint>) => {
  let s = 0n;
  for (const x of xs) s += x;
  return s;
};

/** Sorted, de-duplicated keys; duplicates are a caller bug. */
function sortedKeys(keys: readonly string[]): string[] | null {
  const sorted = [...keys].sort();
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1]) return null;
  return sorted;
}

/** allocate() over named recipients, returning only non-zero entries. */
function allocateNamed(total: bigint, weights: Values, seed: string): Record<string, bigint> {
  const keys = Object.keys(weights).sort();
  const parts = allocate(
    total,
    keys.map((k) => weights[k] as bigint),
    keys,
    seed,
  );
  const out: Record<string, bigint> = {};
  keys.forEach((k, i) => {
    const v = parts[i] as bigint;
    if (v !== 0n) out[k] = v;
  });
  return out;
}

const ones = (keys: readonly string[]): Record<string, bigint> =>
  Object.fromEntries(keys.map((k) => [k, 1n]));

function nonZero(values: Values): Record<string, bigint> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== 0n));
}

function hasNegative(values: Values): boolean {
  return Object.values(values).some((v) => v < 0n);
}

function itemised(
  expenseId: string,
  amount: bigint,
  spec: Extract<SplitSpec, { mode: 'itemised' }>,
): SplitResult {
  if (spec.items.length === 0) return fail('no_participants');
  const subtotal: Record<string, bigint> = {};
  for (const item of spec.items) {
    const who = sortedKeys(item.assignees);
    if (!who || who.length === 0 || item.amount <= 0n) return fail('invalid_value');
    const pieces = allocateNamed(item.amount, ones(who), `${expenseId}:item:${item.id}`);
    for (const [k, v] of Object.entries(pieces)) subtotal[k] = (subtotal[k] ?? 0n) + v;
  }
  let positive = 0n;
  let negative = 0n;
  for (const extra of spec.extras) {
    if (extra.kind === 'round_off') {
      if (extra.amount >= 0n) positive += extra.amount;
      else negative -= extra.amount;
    } else if (extra.amount < 0n) {
      return fail('invalid_value');
    } else if (extra.kind === 'discount') {
      negative += extra.amount;
    } else {
      positive += extra.amount;
    }
  }
  const computed = sumOf(Object.values(subtotal)) + positive - negative;
  if (computed !== amount) return fail('items_mismatch', amount - computed);

  const add = positive > 0n ? allocateNamed(positive, subtotal, `${expenseId}:extras`) : {};
  const sub = negative > 0n ? allocateNamed(negative, subtotal, `${expenseId}:discounts`) : {};
  const shares: Record<string, bigint> = {};
  for (const k of Object.keys(subtotal)) {
    shares[k] = (subtotal[k] as bigint) + (add[k] ?? 0n) - (sub[k] ?? 0n);
  }
  if (hasNegative(shares)) return fail('invalid_value');
  return { ok: true, shares: nonZero(shares) };
}

/** One integer share per participant, in the expense currency, summing to `amount` (07 §5). */
export function computeShares(expenseId: string, amount: bigint, spec: SplitSpec): SplitResult {
  if (amount <= 0n) return fail('zero_amount');
  switch (spec.mode) {
    case 'equal':
    case 'selected': {
      const who = sortedKeys(spec.participants);
      if (!who) return fail('invalid_value');
      if (who.length === 0) return fail('no_participants');
      return { ok: true, shares: allocateNamed(amount, ones(who), expenseId) };
    }
    case 'exact': {
      if (hasNegative(spec.values)) return fail('invalid_value');
      const shares = nonZero(spec.values);
      if (Object.keys(shares).length === 0) return fail('no_participants');
      const total = sumOf(Object.values(shares));
      if (total < amount) return fail('unassigned', amount - total);
      if (total > amount) return fail('too_much', total - amount);
      return { ok: true, shares };
    }
    case 'percent': {
      if (hasNegative(spec.values)) return fail('invalid_value');
      const bp = nonZero(spec.values);
      if (Object.keys(bp).length === 0) return fail('no_participants');
      const total = sumOf(Object.values(bp));
      if (total < 10000n) return fail('unassigned', 10000n - total);
      if (total > 10000n) return fail('too_much', total - 10000n);
      return { ok: true, shares: allocateNamed(amount, bp, expenseId) };
    }
    case 'shares': {
      if (Object.keys(spec.values).length === 0) return fail('no_participants');
      if (Object.values(spec.values).some((w) => w < 1n)) return fail('invalid_value');
      return { ok: true, shares: allocateNamed(amount, spec.values, expenseId) };
    }
    case 'adjustment': {
      const who = Object.keys(spec.values);
      if (who.length === 0) return fail('no_participants');
      if (hasNegative(spec.values)) return fail('invalid_value');
      const extra = sumOf(Object.values(spec.values));
      if (extra > amount) return fail('too_much', extra - amount);
      const base = amount > extra ? allocateNamed(amount - extra, ones(who), expenseId) : {};
      const shares: Record<string, bigint> = {};
      for (const k of who) shares[k] = (base[k] ?? 0n) + (spec.values[k] as bigint);
      return { ok: true, shares: nonZero(shares) };
    }
    case 'itemised':
      return itemised(expenseId, amount, spec);
  }
}

/** The one-tap "Distribute equally" fix (07 §5): spread `unassigned` over the ticked people. */
export function distributeRemainder(
  expenseId: string,
  unassigned: bigint,
  participants: readonly string[],
): Record<string, bigint> {
  if (participants.length === 0) return {};
  return allocateNamed(unassigned, ones(participants), `${expenseId}:distribute`);
}

export type PayersResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: 'no_payers' | 'unassigned' | 'too_much' | 'invalid_value';
      readonly diff: bigint;
    };

export function validatePayers(amount: bigint, payers: Values): PayersResult {
  const entries = Object.values(payers);
  if (entries.length === 0) return { ok: false, error: 'no_payers', diff: amount };
  if (entries.some((v) => v <= 0n)) return { ok: false, error: 'invalid_value', diff: 0n };
  const total = sumOf(entries);
  if (total < amount) return { ok: false, error: 'unassigned', diff: amount - total };
  if (total > amount) return { ok: false, error: 'too_much', diff: total - amount };
  return { ok: true };
}

export type BaseResult =
  | {
      readonly ok: true;
      readonly baseAmount: bigint;
      readonly baseShares: Record<string, bigint>;
      readonly basePayers: Record<string, bigint> | 'kitty';
    }
  | { readonly ok: false; readonly error: 'below_min_unit' };

/** Convert the whole vector to the trip currency once, at the end (07 §4.4). */
export function toBase(
  expenseId: string,
  amount: bigint,
  rate: Rate,
  shares: Values,
  payers: Values | 'kitty',
): BaseResult {
  const baseAmount = convertToBase(amount, rate);
  if (baseAmount === 0n) return { ok: false, error: 'below_min_unit' };
  return {
    ok: true,
    baseAmount,
    baseShares: allocateNamed(baseAmount, shares, expenseId),
    basePayers:
      payers === 'kitty' ? 'kitty' : allocateNamed(baseAmount, payers, `${expenseId}:payers`),
  };
}
