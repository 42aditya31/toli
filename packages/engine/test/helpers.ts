import type {
  Ledger,
  LedgerContribution,
  LedgerExpense,
  LedgerHandover,
  LedgerSettlement,
} from '../src/index.ts';
import { computeShares, type SplitSpec } from '../src/index.ts';

export const rupees = (n: number) => BigInt(Math.round(n * 100));

let counter = 0;
const nextOrder = () => `o${String(++counter).padStart(6, '0')}`;

/** Same-currency expense (rate 1/1, so base values equal the entered ones). */
export function expense(
  id: string,
  amount: bigint,
  payers: Record<string, bigint> | 'kitty',
  spec: SplitSpec,
  extra: Partial<Pick<LedgerExpense, 'isRefund' | 'order'>> = {},
): LedgerExpense {
  const r = computeShares(id, amount, spec);
  if (!r.ok) throw new Error(`bad fixture ${id}: ${r.error}`);
  return {
    id,
    order: extra.order ?? nextOrder(),
    baseAmount: amount,
    shares: r.shares,
    payers,
    ...(extra.isRefund ? { isRefund: true } : {}),
  };
}

export const equal = (...participants: string[]): SplitSpec => ({ mode: 'equal', participants });

export function settlement(
  from: string,
  to: string,
  amount: bigint,
  method?: LedgerSettlement['method'],
): LedgerSettlement {
  return {
    id: `s-${from}-${to}-${nextOrder()}`,
    order: nextOrder(),
    from,
    to,
    amount,
    ...(method ? { method } : {}),
  };
}

export function contribution(memberId: string, amount: bigint): LedgerContribution {
  return { id: `c-${memberId}-${nextOrder()}`, order: nextOrder(), memberId, amount };
}

export function handover(from: string, to: string): LedgerHandover {
  return { id: `h-${from}-${to}`, order: nextOrder(), from, to };
}

export function ledger(parts: {
  members: string[];
  removed?: string[];
  expenses?: LedgerExpense[];
  settlements?: LedgerSettlement[];
  contributions?: LedgerContribution[];
  holder?: string | null;
  handovers?: LedgerHandover[];
}): Ledger {
  const removed = new Set(parts.removed ?? []);
  return {
    members: parts.members.map((id) => (removed.has(id) ? { id, removed: true } : { id })),
    expenses: parts.expenses ?? [],
    settlements: parts.settlements ?? [],
    contributions: parts.contributions ?? [],
    kitty: { initialHolder: parts.holder ?? null, handovers: parts.handovers ?? [] },
  };
}

export const total = (r: Readonly<Record<string, bigint>>) =>
  Object.values(r).reduce((a, b) => a + b, 0n);
