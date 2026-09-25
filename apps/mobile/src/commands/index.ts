// Commands (02 §2): validate → compute with @toli/engine → rows + outbox op in ONE transaction.
// No UI, no network. Every money value is a bigint; SQLite gets numbers only via the codec.
import { CATEGORY_LABELS, LIMITS, TEMPLATE_CATEGORIES, type TemplateKey } from '@toli/config';
import {
  computeShares,
  ENGINE_VERSION,
  IDENTITY_RATE,
  type SplitSpec,
  toBase,
  validatePayers,
} from '@toli/engine';
import { and, eq } from 'drizzle-orm';
import { dayIn, deviceTimeZone, nowIso } from '../data/clock.ts';
import { db, t } from '../data/db.ts';
import { myUserId } from '../data/identity.ts';
import { uuidv7 } from '../data/ids.ts';
import { toDb } from '../data/money-codec.ts';
import { enqueue } from '../data/outbox.ts';
import type { TripData } from '../data/repo.ts';

export class CommandError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const initials = (name: string) => name.trim().slice(0, 1).toUpperCase();

export { initials };

/* ───────────── Trips ───────────── */

export type NewTrip = {
  readonly name: string;
  readonly template: TemplateKey;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly baseCurrency: string;
  readonly myName: string;
  readonly ghosts: readonly string[];
};

export function createTrip(input: NewTrip): string {
  const name = input.name.trim();
  if (!name) throw new CommandError('name_required', 'Give the trip a name');
  const me = myUserId();
  const now = nowIso();
  const tz = deviceTimeZone();
  const tripId = uuidv7();
  const today = dayIn(tz);
  const status = input.startDate && input.startDate > today ? 'planning' : 'active';
  const organiser = {
    id: uuidv7(),
    display_name: input.myName.trim() || 'You',
    role: 'organiser' as const,
    joined_from: null,
  };
  const ghosts = input.ghosts.map((g) => ({
    id: uuidv7(),
    display_name: g.trim(),
    role: 'member' as const,
    joined_from: null,
  }));
  const categories = TEMPLATE_CATEGORIES[input.template].map((key, i) => ({
    id: uuidv7(),
    key,
    label: CATEGORY_LABELS[key],
    position: i,
  }));
  db.transaction((tx) => {
    tx.insert(t.trips)
      .values({
        id: tripId,
        name,
        start_date: input.startDate,
        end_date: input.endDate,
        base_currency: input.baseCurrency,
        time_zone: tz,
        template: input.template,
        status,
        created_by_user: me,
        created_at: now,
        updated_at: now,
      })
      .run();
    for (const m of [organiser, ...ghosts]) {
      tx.insert(t.trip_members)
        .values({
          id: m.id,
          trip_id: tripId,
          user_id: m.role === 'organiser' ? me : null,
          display_name: m.display_name,
          role: m.role,
          joined_from: null,
          claimed_at: m.role === 'organiser' ? now : null,
          claimed_via: m.role === 'organiser' ? 'app' : null,
          created_by_user: me,
          created_at: now,
          updated_at: now,
        })
        .run();
    }
    for (const c of categories) {
      tx.insert(t.trip_categories)
        .values({ ...c, trip_id: tripId, is_default: true })
        .run();
    }
    tx.insert(t.sync_cursors).values({ trip_id: tripId, last_seq: '0' }).run();
    enqueue(tx, tripId, 'trip.create', tripId, {
      name,
      start_date: input.startDate,
      end_date: input.endDate,
      base_currency: input.baseCurrency,
      time_zone: tz,
      template: input.template,
      status,
      organiser_member_id: organiser.id,
      members: [organiser, ...ghosts],
      categories,
    });
  });
  return tripId;
}

export type TripPatch = {
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
  destination_name?: string | null;
  base_currency?: string;
  kitty_enabled?: boolean;
  kitty_low_bp?: number;
  kitty_holder_member_id?: string;
};

export function updateTrip(d: TripData, patch: TripPatch): void {
  if (patch.base_currency && d.expenses.length > 0) {
    throw new CommandError('currency_locked', 'Locked after the first expense');
  }
  if (
    patch.kitty_enabled === true &&
    !patch.kitty_holder_member_id &&
    !d.trip.kitty_holder_member_id
  ) {
    throw new CommandError('holder_required', 'Who holds the cash?');
  }
  db.transaction((tx) => {
    tx.update(t.trips)
      .set({ ...patch, updated_at: nowIso(), local_state: 'pending' })
      .where(eq(t.trips.id, d.trip.id))
      .run();
    enqueue(tx, d.trip.id, 'trip.update', d.trip.id, patch);
  });
}

/** Close trip (06 §4): the server applies the dust rule and settles; the phone only asks. */
export function closeTrip(d: TripData): void {
  db.transaction((tx) => {
    enqueue(tx, d.trip.id, 'trip.close', d.trip.id, {});
  });
}

export function requestReopen(d: TripData, note: string): void {
  db.transaction((tx) => {
    enqueue(tx, d.trip.id, 'trip.request_reopen', d.trip.id, note ? { note } : {});
  });
}

export function reopenTrip(d: TripData): void {
  db.transaction((tx) => {
    enqueue(tx, d.trip.id, 'trip.transition', d.trip.id, { to: 'reopen' });
  });
}

/* ───────────── Members ───────────── */

export function addMember(
  d: TripData,
  displayName: string,
  joinedFrom: string | null = null,
): string {
  const name = displayName.trim();
  if (!name) throw new CommandError('name_required', 'Type a name');
  const active = d.members.filter((m) => !m.removed_at);
  if (active.length >= LIMITS.membersPerTrip) {
    throw new CommandError('member_limit', `Trips can have up to ${LIMITS.membersPerTrip} people`);
  }
  if (active.some((m) => m.display_name.toLowerCase() === name.toLowerCase())) {
    throw new CommandError('duplicate_name', `${name} is already on this trip`);
  }
  const id = uuidv7();
  const now = nowIso();
  db.transaction((tx) => {
    tx.insert(t.trip_members)
      .values({
        id,
        trip_id: d.trip.id,
        display_name: name,
        role: 'member',
        joined_from: joinedFrom,
        created_by_user: myUserId(),
        created_at: now,
        updated_at: now,
      })
      .run();
    enqueue(tx, d.trip.id, 'member.add', id, {
      id,
      display_name: name,
      role: 'member',
      joined_from: joinedFrom,
    });
  });
  return id;
}

export function updateMember(
  d: TripData,
  memberId: string,
  patch: { display_name?: string; joined_from?: string | null },
): void {
  const clean = {
    ...patch,
    ...(patch.display_name ? { display_name: patch.display_name.trim() } : {}),
  };
  if (
    clean.display_name &&
    d.members.some(
      (m) =>
        m.id !== memberId &&
        !m.removed_at &&
        m.display_name.toLowerCase() === clean.display_name?.toLowerCase(),
    )
  ) {
    throw new CommandError('duplicate_name', `${clean.display_name} is already on this trip`);
  }
  db.transaction((tx) => {
    tx.update(t.trip_members)
      .set({ ...clean, updated_at: nowIso(), local_state: 'pending' })
      .where(eq(t.trip_members.id, memberId))
      .run();
    enqueue(tx, d.trip.id, 'member.update', memberId, clean);
  });
}

/** Remove a member (balance must be 0; checked by the caller against the engine and again by the server). */
export function removeMember(d: TripData, memberId: string): void {
  db.transaction((tx) => {
    tx.update(t.trip_members)
      .set({ removed_at: nowIso(), local_state: 'pending' })
      .where(eq(t.trip_members.id, memberId))
      .run();
    enqueue(tx, d.trip.id, 'member.remove', memberId, {});
  });
}

export function setRole(d: TripData, memberId: string, role: 'organiser' | 'member'): void {
  db.transaction((tx) => {
    tx.update(t.trip_members)
      .set({ role, local_state: 'pending' })
      .where(eq(t.trip_members.id, memberId))
      .run();
    enqueue(tx, d.trip.id, 'member.set_role', memberId, { role });
  });
}

/* ───────────── Expenses ───────────── */

/** The Add expense / Split editor draft (screens/add-expense, split-editor). */
export type ExpenseDraft = {
  readonly amount: bigint;
  readonly currency: string;
  readonly description: string;
  readonly categoryId: string | null;
  readonly spentAt: string;
  /** Member → amount paid, or the kitty. */
  readonly payers: Readonly<Record<string, bigint>> | 'kitty';
  readonly split: SplitSpec;
};

const MODE_NAME = {
  equal: 'equal',
  selected: 'equal',
  exact: 'exact',
  percent: 'percent',
  shares: 'shares',
  adjustment: 'adjust',
  itemised: 'itemised',
} as const;

function splitInput(spec: SplitSpec): Record<string, unknown> {
  const s = (v: Readonly<Record<string, bigint>>) =>
    Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.toString()]));
  switch (spec.mode) {
    case 'equal':
    case 'selected':
      return { participants: [...spec.participants] };
    case 'exact':
      return { amounts: s(spec.values) };
    case 'percent':
      return { bp: s(spec.values) };
    case 'shares':
      return { weights: s(spec.values) };
    case 'adjustment':
      return { participants: Object.keys(spec.values), add: s(spec.values) };
    case 'itemised':
      return {
        items: spec.items.map((i) => ({
          id: i.id,
          amount: i.amount.toString(),
          assignees: [...i.assignees],
        })),
        extras: spec.extras.map((e) => ({ kind: e.kind, amount: e.amount.toString() })),
      };
  }
}

/** Shares + base conversion for a draft; throws a CommandError with the documented copy. */
export function computeDraft(expenseId: string, draft: ExpenseDraft) {
  if (draft.amount <= 0n) throw new CommandError('zero_amount', 'Type an amount first');
  const split = computeShares(expenseId, draft.amount, draft.split);
  if (!split.ok) throw new CommandError(split.error, split.error);
  if (draft.payers !== 'kitty') {
    const pv = validatePayers(draft.amount, draft.payers);
    if (!pv.ok) throw new CommandError(`payers_${pv.error}`, pv.error);
  }
  const base = toBase(expenseId, draft.amount, IDENTITY_RATE, split.shares, draft.payers);
  if (!base.ok) throw new CommandError('amount_too_small', 'This is less than ₹0.01');
  return { shares: split.shares, ...base };
}

function writeRevision(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  d: TripData,
  expenseId: string,
  revisionId: string,
  revisionNo: number,
  kind: 'create' | 'edit',
  opId: string,
  draft: ExpenseDraft,
  c: ReturnType<typeof computeDraft>,
) {
  const now = nowIso();
  tx.insert(t.expense_revisions)
    .values({
      id: revisionId,
      expense_id: expenseId,
      trip_id: d.trip.id,
      revision_no: revisionNo,
      kind,
      amount_minor: toDb(draft.amount),
      currency: draft.currency,
      fx_rate: '1',
      engine_version: String(ENGINE_VERSION),
      fx_source: 'same',
      base_amount_minor: toDb(c.baseAmount),
      spent_at: draft.spentAt,
      category_id: draft.categoryId,
      description: draft.description.trim() || null,
      split_mode: MODE_NAME[draft.split.mode],
      split_input: JSON.stringify(splitInput(draft.split)),
      paid_from_kitty: draft.payers === 'kitty',
      op_id: opId,
      created_by_user: myUserId(),
      created_at: now,
    })
    .run();
  if (draft.payers !== 'kitty' && c.basePayers !== 'kitty') {
    for (const [memberId, amount] of Object.entries(draft.payers)) {
      tx.insert(t.expense_payers)
        .values({
          revision_id: revisionId,
          member_id: memberId,
          amount_minor: toDb(amount),
          base_minor: toDb(c.basePayers[memberId] ?? 0n),
        })
        .run();
    }
  }
  for (const [memberId, share] of Object.entries(c.shares)) {
    tx.insert(t.expense_shares)
      .values({
        revision_id: revisionId,
        member_id: memberId,
        share_minor: toDb(share),
        base_minor: toDb(c.baseShares[memberId] ?? 0n),
      })
      .run();
  }
}

function revisionPayload(
  revisionId: string,
  d: TripData,
  draft: ExpenseDraft,
  c: ReturnType<typeof computeDraft>,
) {
  const cat = d.categories.find((x) => x.id === draft.categoryId);
  return {
    revision_id: revisionId,
    amount_minor: draft.amount.toString(),
    currency: draft.currency,
    fx: { rate: '1', source: 'same' as const, date: null },
    base_amount_minor: c.baseAmount.toString(),
    is_refund: false,
    spent_at: draft.spentAt,
    category_key: cat?.key ?? null,
    description: draft.description.trim() || null,
    split_mode: MODE_NAME[draft.split.mode],
    split_input: splitInput(draft.split),
    paid_from_kitty: draft.payers === 'kitty',
    payers:
      draft.payers === 'kitty' || c.basePayers === 'kitty'
        ? []
        : Object.entries(draft.payers).map(([member_id, amount]) => ({
            member_id,
            amount_minor: amount.toString(),
            base_minor: ((c.basePayers as Record<string, bigint>)[member_id] ?? 0n).toString(),
          })),
    shares: Object.entries(c.shares).map(([member_id, share]) => ({
      member_id,
      share_minor: share.toString(),
      base_minor: (c.baseShares[member_id] ?? 0n).toString(),
    })),
    engine_version: String(ENGINE_VERSION),
  };
}

function assertOpen(d: TripData) {
  if (d.trip.status === 'settled' || d.trip.status === 'archived') {
    throw new CommandError('trip_settled', 'This trip is settled. Reopen to edit.');
  }
}

export function addExpense(
  d: TripData,
  myMemberId: string,
  draft: ExpenseDraft,
  expenseId: string = uuidv7(),
): string {
  assertOpen(d);
  const c = computeDraft(expenseId, draft);
  const revisionId = uuidv7();
  const opId = uuidv7();
  db.transaction((tx) => {
    tx.insert(t.expenses)
      .values({
        id: expenseId,
        trip_id: d.trip.id,
        current_revision_id: revisionId,
        created_by_user: myUserId(),
        created_by_member_id: myMemberId,
        created_at: nowIso(),
      })
      .run();
    writeRevision(tx, d, expenseId, revisionId, 1, 'create', opId, draft, c);
    enqueue(
      tx,
      d.trip.id,
      'expense.create',
      expenseId,
      revisionPayload(revisionId, d, draft, c),
      opId,
    );
  });
  return expenseId;
}

/** Edit replaces the whole money group (D-019); only the current revision is kept on the phone (03 §10). */
export function editExpense(d: TripData, expenseId: string, draft: ExpenseDraft): void {
  assertOpen(d);
  const e = d.expenses.find((x) => x.id === expenseId);
  if (!e) throw new CommandError('entity_deleted', 'This expense was deleted');
  const c = computeDraft(expenseId, draft);
  const revisionId = uuidv7();
  const opId = uuidv7();
  const old = e.revision.id;
  db.transaction((tx) => {
    writeRevision(tx, d, expenseId, revisionId, e.revision.revision_no + 1, 'edit', opId, draft, c);
    tx.update(t.expenses)
      .set({ current_revision_id: revisionId, local_state: 'pending' })
      .where(eq(t.expenses.id, expenseId))
      .run();
    tx.delete(t.expense_payers).where(eq(t.expense_payers.revision_id, old)).run();
    tx.delete(t.expense_shares).where(eq(t.expense_shares.revision_id, old)).run();
    tx.delete(t.expense_revisions).where(eq(t.expense_revisions.id, old)).run();
    enqueue(
      tx,
      d.trip.id,
      'expense.edit',
      expenseId,
      { ...revisionPayload(revisionId, d, draft, c), base_revision_id: old },
      opId,
    );
  });
}

export function deleteExpense(d: TripData, expenseId: string): void {
  assertOpen(d);
  const e = d.expenses.find((x) => x.id === expenseId);
  if (!e) return;
  db.transaction((tx) => {
    tx.update(t.expenses)
      .set({ is_deleted: true, local_state: 'pending' })
      .where(eq(t.expenses.id, expenseId))
      .run();
    enqueue(tx, d.trip.id, 'expense.delete', expenseId, {
      base_revision_id: e.revision.id,
      revision_id: uuidv7(),
    });
  });
}

/* ───────────── Settlements ───────────── */

export function recordSettlement(
  d: TripData,
  p: {
    from: string;
    to: string;
    amount: bigint;
    method: 'upi' | 'cash' | 'bank' | 'other';
    note: string | null;
  },
): string {
  assertOpen(d);
  if (p.amount <= 0n) throw new CommandError('zero_amount', 'Type an amount first');
  if (p.from === p.to) throw new CommandError('same_person', 'Pick two different people');
  const id = uuidv7();
  const opId = uuidv7();
  db.transaction((tx) => {
    tx.insert(t.settlements)
      .values({
        id,
        trip_id: d.trip.id,
        from_member_id: p.from,
        to_member_id: p.to,
        amount_minor: toDb(p.amount),
        method: p.method,
        note: p.note,
        recorded_by_user: myUserId(),
        recorded_at: nowIso(),
        op_id: opId,
      })
      .run();
    enqueue(
      tx,
      d.trip.id,
      'settlement.create',
      id,
      {
        from_member_id: p.from,
        to_member_id: p.to,
        amount_minor: p.amount.toString(),
        method: p.method,
        note: p.note,
      },
      opId,
    );
  });
  return id;
}

/** Void (append-only undo). Allowed on a settled trip (06 §5). */
export function voidSettlement(d: TripData, settlementId: string, reason: string | null): void {
  db.transaction((tx) => {
    tx.update(t.settlements)
      .set({
        voided_at: nowIso(),
        voided_by_user: myUserId(),
        void_reason: reason,
        local_state: 'pending',
      })
      .where(and(eq(t.settlements.id, settlementId)))
      .run();
    enqueue(tx, d.trip.id, 'settlement.void', settlementId, { reason });
  });
}

/* ───────────── Kitty ───────────── */

export function startKitty(d: TripData, holderId: string, contributeEach: bigint | null): void {
  assertOpen(d);
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(t.trips)
      .set({
        kitty_enabled: true,
        kitty_holder_member_id: holderId,
        updated_at: now,
        local_state: 'pending',
      })
      .where(eq(t.trips.id, d.trip.id))
      .run();
    enqueue(tx, d.trip.id, 'trip.update', d.trip.id, {
      kitty_enabled: true,
      kitty_holder_member_id: holderId,
    });
    if (contributeEach && contributeEach > 0n) {
      for (const m of d.members.filter((x) => !x.removed_at)) {
        const id = uuidv7();
        const opId = uuidv7();
        tx.insert(t.kitty_contributions)
          .values({
            id,
            trip_id: d.trip.id,
            member_id: m.id,
            amount_minor: toDb(contributeEach),
            recorded_by_user: myUserId(),
            recorded_at: now,
            op_id: opId,
          })
          .run();
        enqueue(
          tx,
          d.trip.id,
          'kitty.contribute',
          id,
          { member_id: m.id, amount_minor: contributeEach.toString() },
          opId,
        );
      }
    }
  });
}

export function contribute(
  d: TripData,
  entries: readonly { memberId: string; amount: bigint }[],
): void {
  assertOpen(d);
  const now = nowIso();
  db.transaction((tx) => {
    for (const e of entries) {
      if (e.amount <= 0n) continue;
      const id = uuidv7();
      const opId = uuidv7();
      tx.insert(t.kitty_contributions)
        .values({
          id,
          trip_id: d.trip.id,
          member_id: e.memberId,
          amount_minor: toDb(e.amount),
          recorded_by_user: myUserId(),
          recorded_at: now,
          op_id: opId,
        })
        .run();
      enqueue(
        tx,
        d.trip.id,
        'kitty.contribute',
        id,
        { member_id: e.memberId, amount_minor: e.amount.toString() },
        opId,
      );
    }
  });
}

export function voidContribution(d: TripData, id: string): void {
  db.transaction((tx) => {
    tx.update(t.kitty_contributions)
      .set({ voided_at: nowIso(), voided_by_user: myUserId(), local_state: 'pending' })
      .where(eq(t.kitty_contributions.id, id))
      .run();
    enqueue(tx, d.trip.id, 'kitty.void', id, {});
  });
}

export function handoverKitty(d: TripData, from: string, to: string, remaining: bigint): void {
  assertOpen(d);
  const id = uuidv7();
  const opId = uuidv7();
  db.transaction((tx) => {
    tx.insert(t.kitty_handovers)
      .values({
        id,
        trip_id: d.trip.id,
        from_member_id: from,
        to_member_id: to,
        remaining_minor: toDb(remaining),
        recorded_by_user: myUserId(),
        recorded_at: nowIso(),
        op_id: opId,
      })
      .run();
    tx.update(t.trips)
      .set({ kitty_holder_member_id: to, local_state: 'pending' })
      .where(eq(t.trips.id, d.trip.id))
      .run();
    enqueue(
      tx,
      d.trip.id,
      'kitty.handover',
      id,
      { from_member_id: from, to_member_id: to, remaining_minor: remaining.toString() },
      opId,
    );
  });
}

/* ───────────── Unresolved ───────────── */

export function dismissRejected(opId: string): void {
  db.delete(t.outbox)
    .where(and(eq(t.outbox.op_id, opId), eq(t.outbox.state, 'rejected')))
    .run();
}
