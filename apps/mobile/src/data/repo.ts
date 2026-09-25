// Reads from SQLite (02 §2 "Local data"). Money leaves this file only as Minor (D-028).
import type { Ledger } from '@toli/engine';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, t } from './db.ts';
import { fromDb, type Minor } from './money-codec.ts';

export type TripRow = typeof t.trips.$inferSelect;
export type MemberRow = typeof t.trip_members.$inferSelect;
export type CategoryRow = typeof t.trip_categories.$inferSelect;
export type RevisionRow = typeof t.expense_revisions.$inferSelect;

export type Expense = {
  readonly id: string;
  readonly revision: RevisionRow;
  readonly amount: Minor;
  readonly baseAmount: Minor;
  readonly payers: readonly {
    readonly memberId: string;
    readonly amount: Minor;
    readonly base: Minor;
  }[];
  readonly shares: readonly {
    readonly memberId: string;
    readonly share: Minor;
    readonly base: Minor;
  }[];
  readonly pending: boolean;
  readonly createdByMemberId: string;
};

export type Settlement = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly amount: Minor;
  readonly method: string;
  readonly note: string | null;
  readonly recordedAt: string;
  readonly recordedByUser: string;
  readonly voided: boolean;
  readonly voidReason: string | null;
  readonly voidedByUser: string | null;
  readonly pending: boolean;
  readonly opId: string;
};

export type Contribution = {
  readonly id: string;
  readonly memberId: string;
  readonly amount: Minor;
  readonly recordedAt: string;
  readonly voided: boolean;
  readonly pending: boolean;
  readonly opId: string;
};

export type Handover = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly remaining: Minor;
  readonly opId: string;
};

export type TripData = {
  readonly trip: TripRow;
  readonly members: readonly MemberRow[];
  readonly categories: readonly CategoryRow[];
  readonly expenses: readonly Expense[];
  readonly settlements: readonly Settlement[];
  readonly contributions: readonly Contribution[];
  readonly handovers: readonly Handover[];
  readonly pendingOps: number;
  readonly rejectedOps: number;
  /** A trip.close / reopen request waiting in the outbox. */
  readonly pendingClose: boolean;
  readonly pendingReopen: boolean;
};

export function listTrips(): TripRow[] {
  return db
    .select()
    .from(t.trips)
    .where(isNull(t.trips.deleted_at))
    .orderBy(desc(t.trips.created_at))
    .all();
}

export function loadTrip(tripId: string): TripData | null {
  const trip = db.select().from(t.trips).where(eq(t.trips.id, tripId)).get();
  if (!trip || trip.deleted_at) return null;
  const members = db.select().from(t.trip_members).where(eq(t.trip_members.trip_id, tripId)).all();
  const categories = db
    .select()
    .from(t.trip_categories)
    .where(and(eq(t.trip_categories.trip_id, tripId), isNull(t.trip_categories.deleted_at)))
    .orderBy(t.trip_categories.position)
    .all();

  const headers = db
    .select()
    .from(t.expenses)
    .where(and(eq(t.expenses.trip_id, tripId), eq(t.expenses.is_deleted, false)))
    .all();
  const revIds = headers.map((h) => h.current_revision_id);
  const revs = revIds.length
    ? db.select().from(t.expense_revisions).where(inArray(t.expense_revisions.id, revIds)).all()
    : [];
  const payers = revIds.length
    ? db.select().from(t.expense_payers).where(inArray(t.expense_payers.revision_id, revIds)).all()
    : [];
  const shares = revIds.length
    ? db.select().from(t.expense_shares).where(inArray(t.expense_shares.revision_id, revIds)).all()
    : [];
  const revById = new Map(revs.map((r) => [r.id, r]));
  const expenses: Expense[] = headers.flatMap((h) => {
    const r = revById.get(h.current_revision_id);
    if (!r) return [];
    return [
      {
        id: h.id,
        revision: r,
        amount: fromDb(r.amount_minor),
        baseAmount: fromDb(r.base_amount_minor),
        payers: payers
          .filter((p) => p.revision_id === r.id)
          .map((p) => ({
            memberId: p.member_id,
            amount: fromDb(p.amount_minor),
            base: fromDb(p.base_minor),
          })),
        shares: shares
          .filter((s) => s.revision_id === r.id)
          .map((s) => ({
            memberId: s.member_id,
            share: fromDb(s.share_minor),
            base: fromDb(s.base_minor),
          })),
        pending: h.local_state !== 'synced',
        createdByMemberId: h.created_by_member_id,
      },
    ];
  });
  expenses.sort((a, b) =>
    a.revision.spent_at < b.revision.spent_at
      ? 1
      : a.revision.spent_at > b.revision.spent_at
        ? -1
        : 0,
  );

  const settlements = db
    .select()
    .from(t.settlements)
    .where(eq(t.settlements.trip_id, tripId))
    .orderBy(desc(t.settlements.recorded_at))
    .all()
    .map(
      (s): Settlement => ({
        id: s.id,
        from: s.from_member_id,
        to: s.to_member_id,
        amount: fromDb(s.amount_minor),
        method: s.method,
        note: s.note,
        recordedAt: s.recorded_at,
        recordedByUser: s.recorded_by_user,
        voided: s.voided_at !== null,
        voidReason: s.void_reason,
        voidedByUser: s.voided_by_user,
        pending: s.local_state !== 'synced',
        opId: s.op_id,
      }),
    );
  const contributions = db
    .select()
    .from(t.kitty_contributions)
    .where(eq(t.kitty_contributions.trip_id, tripId))
    .orderBy(t.kitty_contributions.recorded_at)
    .all()
    .map(
      (c): Contribution => ({
        id: c.id,
        memberId: c.member_id,
        amount: fromDb(c.amount_minor),
        recordedAt: c.recorded_at,
        voided: c.voided_at !== null,
        pending: c.local_state !== 'synced',
        opId: c.op_id,
      }),
    );
  const handovers = db
    .select()
    .from(t.kitty_handovers)
    .where(and(eq(t.kitty_handovers.trip_id, tripId), isNull(t.kitty_handovers.voided_at)))
    .orderBy(t.kitty_handovers.op_id)
    .all()
    .map(
      (h): Handover => ({
        id: h.id,
        from: h.from_member_id,
        to: h.to_member_id,
        remaining: fromDb(h.remaining_minor),
        opId: h.op_id,
      }),
    );

  const ops = db
    .select({ state: t.outbox.state, type: t.outbox.type })
    .from(t.outbox)
    .where(eq(t.outbox.trip_id, tripId))
    .all();
  return {
    trip,
    members,
    categories,
    expenses,
    settlements,
    contributions,
    handovers,
    pendingOps: ops.filter((o) => o.state !== 'rejected').length,
    rejectedOps: ops.filter((o) => o.state === 'rejected').length,
    pendingClose: ops.some((o) => o.type === 'trip.close' && o.state !== 'rejected'),
    pendingReopen: ops.some(
      (o) =>
        (o.type === 'trip.request_reopen' || o.type === 'trip.transition') &&
        o.state !== 'rejected',
    ),
  };
}

/**
 * The engine's input (07 §6–7): current revisions, non-voided settlements and contributions,
 * hand-overs, all in base minor units. `order` is the op_id (UUID v7, time-ordered).
 */
export function toLedger(d: TripData): Ledger {
  const firstHolder = d.handovers[0]?.from ?? d.trip.kitty_holder_member_id;
  return {
    members: d.members.map((m) => (m.removed_at ? { id: m.id, removed: true } : { id: m.id })),
    expenses: d.expenses.map((e) => ({
      id: e.id,
      order: e.revision.op_id,
      baseAmount: e.baseAmount,
      shares: Object.fromEntries(e.shares.map((s) => [s.memberId, s.base as bigint])),
      payers: e.revision.paid_from_kitty
        ? ('kitty' as const)
        : Object.fromEntries(e.payers.map((p) => [p.memberId, p.base as bigint])),
      ...(e.revision.is_refund ? { isRefund: true } : {}),
    })),
    settlements: d.settlements
      .filter((s) => !s.voided)
      .map((s) => ({
        id: s.id,
        order: s.opId,
        from: s.from,
        to: s.to,
        amount: s.amount,
        method: s.method as 'upi' | 'cash' | 'bank' | 'other' | 'rounding',
      })),
    contributions: d.contributions
      .filter((c) => !c.voided)
      .map((c) => ({ id: c.id, order: c.opId, memberId: c.memberId, amount: c.amount })),
    kitty: {
      initialHolder:
        d.trip.kitty_enabled || d.contributions.length > 0 ? (firstHolder ?? null) : null,
      handovers: d.handovers.map((h) => ({ id: h.id, order: h.opId, from: h.from, to: h.to })),
    },
  };
}

export function outboxRows(tripId: string) {
  return db
    .select()
    .from(t.outbox)
    .where(eq(t.outbox.trip_id, tripId))
    .orderBy(t.outbox.created_at)
    .all();
}

export function otherMembers(d: TripData, me: string | undefined) {
  return d.members.filter((m) => m.id !== me && !m.removed_at);
}
