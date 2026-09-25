/**
 * What the engine needs to compute balances (07 §6-7). Callers pass only current, non-deleted
 * expense revisions and non-voided, confirmed settlements, contributions and hand-overs, all in
 * base-currency minor units. `order` is a sortable string (a UUID v7 or a seq) used to replay the
 * kitty hand-overs deterministically.
 */
export type LedgerExpense = {
  readonly id: string;
  readonly order: string;
  readonly baseAmount: bigint;
  readonly shares: Readonly<Record<string, bigint>>;
  readonly payers: Readonly<Record<string, bigint>> | 'kitty';
  readonly isRefund?: boolean;
};

export type LedgerSettlement = {
  readonly id: string;
  readonly order: string;
  readonly from: string;
  readonly to: string;
  readonly amount: bigint;
  readonly method?: 'upi' | 'cash' | 'bank' | 'other' | 'rounding';
};

export type LedgerContribution = {
  readonly id: string;
  readonly order: string;
  readonly memberId: string;
  readonly amount: bigint;
};

export type LedgerHandover = {
  readonly id: string;
  readonly order: string;
  readonly from: string;
  readonly to: string;
};

export type Ledger = {
  readonly members: readonly { readonly id: string; readonly removed?: boolean }[];
  readonly expenses: readonly LedgerExpense[];
  readonly settlements: readonly LedgerSettlement[];
  readonly contributions: readonly LedgerContribution[];
  readonly kitty: {
    readonly initialHolder: string | null;
    readonly handovers: readonly LedgerHandover[];
  };
};

export const byOrder = <T extends { readonly order: string; readonly id: string }>(
  a: T,
  b: T,
): number => (a.order !== b.order ? (a.order < b.order ? -1 : 1) : a.id < b.id ? -1 : 1);

/** +1 for a normal expense, −1 for a refund (D-029: same maths, direction flipped). */
export const signOf = (e: LedgerExpense): bigint => (e.isRefund ? -1n : 1n);

export function assertMembers(ledger: Ledger): Set<string> {
  const ids = new Set(ledger.members.map((m) => m.id));
  const check = (id: string) => {
    if (!ids.has(id)) throw new Error(`unknown_member: ${id}`);
  };
  for (const e of ledger.expenses) {
    for (const id of Object.keys(e.shares)) check(id);
    if (e.payers !== 'kitty') for (const id of Object.keys(e.payers)) check(id);
  }
  for (const s of ledger.settlements) {
    check(s.from);
    check(s.to);
  }
  for (const c of ledger.contributions) check(c.memberId);
  if (ledger.kitty.initialHolder !== null) check(ledger.kitty.initialHolder);
  for (const h of ledger.kitty.handovers) {
    check(h.from);
    check(h.to);
  }
  return ids;
}
