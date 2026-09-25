import { replayKitty } from './kitty-periods.ts';
import { assertMembers, byOrder, type Ledger, signOf } from './ledger.ts';

export type Balances = {
  /** Trip view (Trip home, trace, kitty): members only; Σ trip + kittyBalance = 0. */
  readonly trip: Record<string, bigint>;
  /** Settle view (Settle up): the kitty folded into its holder(s); Σ settle = 0. */
  readonly settle: Record<string, bigint>;
  /** Cash in the pot, shown as "Kitty cash with Rahul: ₹3,000". Negative when overspent. */
  readonly kittyCash: bigint;
  /** The virtual member K's balance, = −kittyCash. */
  readonly kittyBalance: bigint;
  readonly kittyHolder: string | null;
  readonly kittyIn: bigint;
  readonly kittySpent: bigint;
};

export type TraceLine =
  | { readonly kind: 'paid' | 'refund_paid'; readonly expenseId: string; readonly amount: bigint }
  | { readonly kind: 'share' | 'refund_share'; readonly expenseId: string; readonly amount: bigint }
  | {
      readonly kind: 'settlement_paid' | 'settlement_received';
      readonly settlementId: string;
      readonly counterparty: string;
      readonly amount: bigint;
      readonly method?: string;
    }
  | {
      readonly kind: 'kitty_contribution';
      readonly contributionId: string;
      readonly amount: bigint;
    }
  | { readonly kind: 'kitty_holding'; readonly amount: bigint }
  | {
      readonly kind: 'kitty_handover';
      readonly handoverId: string;
      readonly counterparty: string;
      readonly amount: bigint;
    };

type Entry = { readonly order: string; readonly id: string; readonly line: TraceLine };

/** Every trip-view line for one member, in chronological order (07 §9). */
function tripLines(ledger: Ledger, memberId: string): TraceLine[] {
  const entries: Entry[] = [];
  for (const e of ledger.expenses) {
    const sign = signOf(e);
    const paid = e.payers === 'kitty' ? undefined : e.payers[memberId];
    if (paid !== undefined) {
      const line: TraceLine = e.isRefund
        ? { kind: 'refund_paid', expenseId: e.id, amount: -paid }
        : { kind: 'paid', expenseId: e.id, amount: paid };
      entries.push({ order: e.order, id: `${e.id}:1`, line });
    }
    const share = e.shares[memberId];
    if (share !== undefined) {
      const line: TraceLine = e.isRefund
        ? { kind: 'refund_share', expenseId: e.id, amount: share }
        : { kind: 'share', expenseId: e.id, amount: -sign * share };
      entries.push({ order: e.order, id: `${e.id}:2`, line });
    }
  }
  for (const s of ledger.settlements) {
    const method = s.method === undefined ? {} : { method: s.method };
    if (s.from === memberId) {
      const line: TraceLine = {
        kind: 'settlement_paid',
        settlementId: s.id,
        counterparty: s.to,
        amount: s.amount,
        ...method,
      };
      entries.push({ order: s.order, id: s.id, line });
    }
    if (s.to === memberId) {
      const line: TraceLine = {
        kind: 'settlement_received',
        settlementId: s.id,
        counterparty: s.from,
        amount: -s.amount,
        ...method,
      };
      entries.push({ order: s.order, id: s.id, line });
    }
  }
  for (const c of ledger.contributions) {
    if (c.memberId !== memberId) continue;
    const line: TraceLine = { kind: 'kitty_contribution', contributionId: c.id, amount: c.amount };
    entries.push({ order: c.order, id: c.id, line });
  }
  return entries.sort(byOrder).map((x) => x.line);
}

/**
 * The lines that add up exactly to a member's balance in the chosen view (07 §9). The settle
 * view appends the kitty holding and hand-over lines (07 §6, D-022).
 */
export function explainBalance(
  ledger: Ledger,
  memberId: string,
  view: 'trip' | 'settle',
): TraceLine[] {
  assertMembers(ledger);
  const lines = tripLines(ledger, memberId);
  if (view === 'trip') return lines;
  for (const k of replayKitty(ledger).lines) {
    if (k.memberId !== memberId) continue;
    lines.push(
      k.kind === 'kitty_holding'
        ? { kind: 'kitty_holding', amount: k.amount }
        : {
            kind: 'kitty_handover',
            handoverId: k.handoverId,
            counterparty: k.counterparty,
            amount: k.amount,
          },
    );
  }
  return lines;
}

/** Balances for every member (07 §7). Positive: the group owes them. Negative: they owe. */
export function computeBalances(ledger: Ledger): Balances {
  const ids = assertMembers(ledger);
  const trip: Record<string, bigint> = {};
  for (const id of ids) trip[id] = 0n;
  const add = (id: string, v: bigint) => {
    trip[id] = (trip[id] as bigint) + v;
  };
  for (const e of ledger.expenses) {
    const sign = signOf(e);
    if (e.payers !== 'kitty') for (const [id, v] of Object.entries(e.payers)) add(id, sign * v);
    for (const [id, v] of Object.entries(e.shares)) add(id, -sign * v);
  }
  for (const s of ledger.settlements) {
    add(s.from, s.amount);
    add(s.to, -s.amount);
  }
  for (const c of ledger.contributions) add(c.memberId, c.amount);

  const kitty = replayKitty(ledger);
  const settle = { ...trip };
  for (const k of kitty.lines) settle[k.memberId] = (settle[k.memberId] as bigint) + k.amount;
  const kittyCash = kitty.kittyIn - kitty.kittySpent;
  return {
    trip,
    settle,
    kittyCash,
    kittyBalance: -kittyCash,
    kittyHolder: kitty.holder,
    kittyIn: kitty.kittyIn,
    kittySpent: kitty.kittySpent,
  };
}

/** D-030 / invariant 12: no change may move a removed member's balance. */
export function checkRemovedMembers(
  before: Ledger,
  after: Ledger,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly error: 'removed_member_balance'; readonly memberId: string } {
  const was = computeBalances(before).trip;
  const now = computeBalances(after).trip;
  for (const m of after.members) {
    if (m.removed && (was[m.id] ?? 0n) !== now[m.id]) {
      return { ok: false, error: 'removed_member_balance', memberId: m.id };
    }
  }
  return { ok: true };
}
