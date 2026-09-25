import { replayKitty } from '../balance/kitty-periods.ts';
import { assertMembers, type Ledger, signOf } from '../balance/ledger.ts';
import { currencyExponent, pow10 } from '../money/currency.ts';

export type Payment = { readonly from: string; readonly to: string; readonly amount: bigint };

type Side = { id: string; left: bigint };
const bySize = (a: Side, b: Side) =>
  a.left !== b.left ? (a.left > b.left ? -1 : 1) : a.id < b.id ? -1 : 1;

/**
 * Simplified mode (07 §8.1): the largest debtor pays the largest creditor, repeatedly.
 * At most n − 1 payments; nobody both pays and receives; balances are unchanged.
 */
export function simplify(balances: Readonly<Record<string, bigint>>): Payment[] {
  const creditors: Side[] = [];
  const debtors: Side[] = [];
  for (const [id, v] of Object.entries(balances)) {
    if (v > 0n) creditors.push({ id, left: v });
    else if (v < 0n) debtors.push({ id, left: -v });
  }
  const out: Payment[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(bySize);
    debtors.sort(bySize);
    const c = creditors[0] as Side;
    const d = debtors[0] as Side;
    const amount = c.left < d.left ? c.left : d.left;
    out.push({ from: d.id, to: c.id, amount });
    c.left -= amount;
    d.left -= amount;
    if (c.left === 0n) creditors.shift();
    if (d.left === 0n) debtors.shift();
  }
  return out;
}

/**
 * North-west-corner fill for one expense revision (D-020): exact, so each participant's pieces
 * sum to their share and each payer's pieces sum to what they paid. Self-pairs are included.
 */
export function northWestPairs(
  shares: Readonly<Record<string, bigint>>,
  payers: Readonly<Record<string, bigint>>,
): Payment[] {
  const rows = Object.entries(shares).sort(([a], [b]) => (a < b ? -1 : 1));
  const cols = Object.entries(payers).sort(([a], [b]) => (a < b ? -1 : 1));
  const out: Payment[] = [];
  let i = 0;
  let j = 0;
  let rowLeft = rows[0]?.[1] ?? 0n;
  let colLeft = cols[0]?.[1] ?? 0n;
  while (i < rows.length && j < cols.length) {
    const amount = rowLeft < colLeft ? rowLeft : colLeft;
    if (amount > 0n) {
      out.push({
        from: (rows[i] as [string, bigint])[0],
        to: (cols[j] as [string, bigint])[0],
        amount,
      });
    }
    rowLeft -= amount;
    colLeft -= amount;
    if (rowLeft === 0n) rowLeft = rows[++i]?.[1] ?? 0n;
    if (colLeft === 0n) colLeft = cols[++j]?.[1] ?? 0n;
  }
  return out;
}

/**
 * Direct mode (07 §8.2, R1b UI): payments only between people who actually owe each other.
 * Kitty lines pair with the current holder, so the nets equal the settle-view balances.
 */
export function directPayments(ledger: Ledger): Payment[] {
  assertMembers(ledger);
  const holder = replayKitty(ledger).holder;
  const owes = new Map<string, bigint>();
  const owe = (from: string, to: string, amount: bigint) => {
    if (from === to) return;
    const key = `${from}\u0000${to}`;
    owes.set(key, (owes.get(key) ?? 0n) + amount);
  };
  for (const e of ledger.expenses) {
    const refund = signOf(e) < 0n;
    if (e.payers === 'kitty') {
      for (const [p, share] of Object.entries(e.shares)) {
        if (refund) owe(holder as string, p, share);
        else owe(p, holder as string, share);
      }
      continue;
    }
    for (const piece of northWestPairs(e.shares, e.payers)) {
      if (refund) owe(piece.to, piece.from, piece.amount);
      else owe(piece.from, piece.to, piece.amount);
    }
  }
  for (const c of ledger.contributions) owe(holder as string, c.memberId, c.amount);
  for (const s of ledger.settlements) owe(s.from, s.to, -s.amount);

  const pairs = new Set<string>();
  for (const key of owes.keys()) {
    const [a, b] = key.split('\u0000') as [string, string];
    pairs.add(a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
  }
  const out: Payment[] = [];
  for (const key of [...pairs].sort()) {
    const [a, b] = key.split('\u0000') as [string, string];
    const x = (owes.get(`${a}\u0000${b}`) ?? 0n) - (owes.get(`${b}\u0000${a}`) ?? 0n);
    if (x > 0n) out.push({ from: a, to: b, amount: x });
    else if (x < 0n) out.push({ from: b, to: a, amount: -x });
  }
  return out;
}

/**
 * The dust rule (07 §8.4, D-021): when every remaining payment is below 1 major unit, these
 * become `method = 'rounding'` settlements on Close trip. Otherwise null.
 */
export function roundingAdjustments(
  payments: readonly Payment[],
  currency: string,
): Payment[] | null {
  const unit = pow10(currencyExponent(currency));
  return payments.every((p) => p.amount < unit) ? payments.map((p) => ({ ...p })) : null;
}

/** UPI links of at most ₹1,00,000 each (07 §8.5); display only. */
export function splitForUpi(amount: bigint, currency: string): bigint[] {
  if (amount <= 0n) return [];
  if (currency !== 'INR') return [amount];
  const limit = 100_000n * pow10(currencyExponent('INR'));
  const out: bigint[] = [];
  let left = amount;
  while (left > limit) {
    out.push(limit);
    left -= limit;
  }
  out.push(left);
  return out;
}

/** The "why" line on a payment card (07 §9): the debtor's largest shares of others' expenses. */
export function whyLines(
  ledger: Ledger,
  debtorId: string,
  limit = 2,
): { readonly expenseId: string; readonly amount: bigint }[] {
  return ledger.expenses
    .filter((e) => !e.isRefund)
    .filter((e) => e.payers === 'kitty' || e.payers[debtorId] === undefined)
    .flatMap((e) => {
      const share = e.shares[debtorId];
      return share === undefined ? [] : [{ expenseId: e.id, amount: share }];
    })
    .sort((a, b) =>
      a.amount !== b.amount ? (a.amount > b.amount ? -1 : 1) : a.expenseId < b.expenseId ? -1 : 1,
    )
    .slice(0, limit);
}
