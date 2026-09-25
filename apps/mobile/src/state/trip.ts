// The trip as the screens see it: every number from @toli/engine, in the views of D-022.
import {
  type Balances,
  computeBalances,
  directPayments,
  formatMoney,
  isKittyLow,
  kittyRefunds,
  type Payment,
  simplify,
  whyLines,
} from '@toli/engine';
import { dayIn, tripDay } from '../data/clock.ts';
import { myUserId } from '../data/identity.ts';
import { loadTrip, type MemberRow, type TripData, toLedger } from '../data/repo.ts';
import { useLive } from './live.ts';

export type TripView = TripData & {
  readonly ledger: ReturnType<typeof toLedger>;
  readonly balances: Balances;
  readonly payments: readonly Payment[];
  readonly directCount: number;
  readonly me: MemberRow | undefined;
  readonly active: readonly MemberRow[];
  readonly name: (memberId: string) => string;
  readonly initialsOf: (memberId: string) => string;
  readonly isOrganiser: boolean;
  readonly settled: boolean;
  readonly today: string;
  readonly day: { day: number; of: number } | null;
  readonly spent: bigint;
  readonly kitty: {
    readonly on: boolean;
    readonly holder: MemberRow | undefined;
    readonly cash: bigint;
    readonly putIn: bigint;
    readonly spent: bigint;
    readonly low: boolean;
    readonly refunds: Record<string, bigint>;
  };
  readonly why: (memberId: string) => string;
  readonly categoryLabel: (categoryId: string | null) => string;
  readonly categoryKey: (categoryId: string | null) => string;
};

export function buildTripView(d: TripData): TripView {
  const ledger = toLedger(d);
  const balances = computeBalances(ledger);
  const payments = simplify(balances.settle);
  const uid = myUserId();
  const me = d.members.find((m) => m.user_id === uid);
  const byId = new Map(d.members.map((m) => [m.id, m]));
  const name = (id: string) => byId.get(id)?.display_name ?? 'Former member';
  const initialsOf = (id: string) => name(id).slice(0, 1).toUpperCase();
  const today = dayIn(d.trip.time_zone);
  const catById = new Map(d.categories.map((c) => [c.id, c]));
  const holder = balances.kittyHolder ? byId.get(balances.kittyHolder) : undefined;
  const view: TripView = {
    ...d,
    ledger,
    balances,
    payments,
    directCount: directPayments(ledger).length,
    me,
    active: d.members.filter((m) => !m.removed_at),
    name,
    initialsOf,
    isOrganiser: me?.role === 'organiser',
    settled: d.trip.status === 'settled' || d.trip.status === 'archived',
    today,
    day: tripDay(d.trip.start_date, d.trip.end_date, today),
    spent: d.expenses.reduce((a, e) => a + e.baseAmount, 0n),
    kitty: {
      on: d.trip.kitty_enabled,
      holder,
      cash: balances.kittyCash,
      putIn: balances.kittyIn,
      spent: balances.kittySpent,
      low:
        d.trip.kitty_enabled &&
        isKittyLow(balances.kittyIn, balances.kittyCash, BigInt(d.trip.kitty_low_bp)),
      refunds: kittyRefunds(ledger),
    },
    why: (memberId) => {
      const lines = whyLines(ledger, memberId, 2);
      return lines
        .map((l) => {
          const e = d.expenses.find((x) => x.id === l.expenseId);
          const title = e
            ? titleOf(e.revision.description, catById.get(e.revision.category_id ?? '')?.label)
            : '';
          return `${title.split(' ·')[0]} ${formatInr(l.amount, d.trip.base_currency)}`;
        })
        .join(' + ');
    },
    categoryLabel: (id) => catById.get(id ?? '')?.label ?? 'Misc',
    categoryKey: (id) => catById.get(id ?? '')?.key ?? 'misc',
  };
  return view;
}

const formatInr = (v: bigint, ccy: string) => formatMoney(v, ccy);

/** An expense's title: its description, else its category label, else "Misc" (OQ-P15). */
export function titleOf(description: string | null, categoryLabel: string | undefined): string {
  return description?.trim() || categoryLabel || 'Misc';
}

/** Live view of one trip; re-computes when SQLite changes. */
export function useTrip(tripId: string | undefined): TripView | null {
  return useLive(() => {
    if (!tripId) return null;
    const d = loadTrip(tripId);
    return d ? buildTripView(d) : null;
  }, [tripId]);
}
