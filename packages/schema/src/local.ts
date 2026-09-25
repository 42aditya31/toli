/**
 * The phone's SQLite schema (03 §10): the same table and column names as Postgres (03 §4–§5)
 * for the R1a trip tables, plus the local-only tables. Money columns are INTEGER and are read
 * only through apps/mobile/src/data/money-codec.ts (D-028). R2/R3 tables are added by later
 * migrations, never here ahead of time.
 */
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** synced · pending · failed (03 §10). */
const localState = () => text('local_state').notNull().default('pending');

export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  destination_name: text('destination_name'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  base_currency: text('base_currency').notNull(),
  time_zone: text('time_zone').notNull(),
  template: text('template').notNull(),
  status: text('status').notNull(),
  settle_mode: text('settle_mode').notNull().default('simplified'),
  kitty_enabled: integer('kitty_enabled', { mode: 'boolean' }).notNull().default(false),
  kitty_holder_member_id: text('kitty_holder_member_id'),
  closed_at: text('closed_at'),
  kitty_target_minor: integer('kitty_target_minor'),
  kitty_low_bp: integer('kitty_low_bp').notNull().default(2000),
  is_pro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
  last_seq: text('last_seq').notNull().default('0'),
  created_by_user: text('created_by_user').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  deleted_at: text('deleted_at'),
  local_state: localState(),
});

export const trip_members = sqliteTable(
  'trip_members',
  {
    id: text('id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    user_id: text('user_id'),
    display_name: text('display_name').notNull(),
    role: text('role').notNull(),
    joined_from: text('joined_from'),
    claimed_at: text('claimed_at'),
    claimed_via: text('claimed_via'),
    removed_at: text('removed_at'),
    last_seq: text('last_seq').notNull().default('0'),
    created_by_user: text('created_by_user').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
    local_state: localState(),
  },
  (t) => [index('trip_members_trip').on(t.trip_id)],
);

export const trip_categories = sqliteTable(
  'trip_categories',
  {
    id: text('id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    position: integer('position').notNull(),
    is_default: integer('is_default', { mode: 'boolean' }).notNull().default(true),
    deleted_at: text('deleted_at'),
    last_seq: text('last_seq').notNull().default('0'),
  },
  (t) => [index('trip_categories_trip').on(t.trip_id)],
);

export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    current_revision_id: text('current_revision_id').notNull(),
    is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
    created_by_user: text('created_by_user').notNull(),
    created_by_member_id: text('created_by_member_id').notNull(),
    created_at: text('created_at').notNull(),
    last_seq: text('last_seq').notNull().default('0'),
    local_state: localState(),
  },
  (t) => [index('expenses_trip').on(t.trip_id, t.is_deleted)],
);

/** Only the current revision is stored on the phone (03 §10). */
export const expense_revisions = sqliteTable(
  'expense_revisions',
  {
    id: text('id').primaryKey(),
    expense_id: text('expense_id').notNull(),
    trip_id: text('trip_id').notNull(),
    revision_no: integer('revision_no').notNull(),
    kind: text('kind').notNull(),
    amount_minor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    fx_rate: text('fx_rate').notNull(),
    is_refund: integer('is_refund', { mode: 'boolean' }).notNull().default(false),
    engine_version: text('engine_version').notNull(),
    fx_source: text('fx_source').notNull(),
    fx_rate_date: text('fx_rate_date'),
    base_amount_minor: integer('base_amount_minor').notNull(),
    spent_at: text('spent_at').notNull(),
    category_id: text('category_id'),
    description: text('description'),
    split_mode: text('split_mode').notNull(),
    split_input: text('split_input').notNull(),
    paid_from_kitty: integer('paid_from_kitty', { mode: 'boolean' }).notNull().default(false),
    is_committed: integer('is_committed', { mode: 'boolean' }).notNull().default(false),
    op_id: text('op_id').notNull(),
    created_by_user: text('created_by_user').notNull(),
    created_at: text('created_at').notNull(),
  },
  (t) => [index('expense_revisions_expense').on(t.expense_id, t.revision_no)],
);

export const expense_payers = sqliteTable(
  'expense_payers',
  {
    revision_id: text('revision_id').notNull(),
    member_id: text('member_id').notNull(),
    amount_minor: integer('amount_minor').notNull(),
    base_minor: integer('base_minor').notNull(),
  },
  (t) => [primaryKey({ columns: [t.revision_id, t.member_id] })],
);

export const expense_shares = sqliteTable(
  'expense_shares',
  {
    revision_id: text('revision_id').notNull(),
    member_id: text('member_id').notNull(),
    share_minor: integer('share_minor').notNull(),
    base_minor: integer('base_minor').notNull(),
  },
  (t) => [primaryKey({ columns: [t.revision_id, t.member_id] })],
);

export const settlements = sqliteTable(
  'settlements',
  {
    id: text('id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    from_member_id: text('from_member_id').notNull(),
    to_member_id: text('to_member_id').notNull(),
    amount_minor: integer('amount_minor').notNull(),
    method: text('method').notNull(),
    pending_confirmation: integer('pending_confirmation', { mode: 'boolean' })
      .notNull()
      .default(false),
    confirmed_at: text('confirmed_at'),
    note: text('note'),
    recorded_by_user: text('recorded_by_user').notNull(),
    recorded_at: text('recorded_at').notNull(),
    voided_at: text('voided_at'),
    voided_by_user: text('voided_by_user'),
    void_reason: text('void_reason'),
    op_id: text('op_id').notNull(),
    last_seq: text('last_seq').notNull().default('0'),
    local_state: localState(),
  },
  (t) => [index('settlements_trip').on(t.trip_id)],
);

export const kitty_contributions = sqliteTable(
  'kitty_contributions',
  {
    id: text('id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    member_id: text('member_id').notNull(),
    amount_minor: integer('amount_minor').notNull(),
    recorded_by_user: text('recorded_by_user').notNull(),
    recorded_at: text('recorded_at').notNull(),
    voided_at: text('voided_at'),
    voided_by_user: text('voided_by_user'),
    op_id: text('op_id').notNull(),
    last_seq: text('last_seq').notNull().default('0'),
    local_state: localState(),
  },
  (t) => [index('kitty_contributions_trip').on(t.trip_id)],
);

export const kitty_handovers = sqliteTable(
  'kitty_handovers',
  {
    id: text('id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    from_member_id: text('from_member_id').notNull(),
    to_member_id: text('to_member_id').notNull(),
    remaining_minor: integer('remaining_minor').notNull(),
    recorded_by_user: text('recorded_by_user').notNull(),
    recorded_at: text('recorded_at').notNull(),
    voided_at: text('voided_at'),
    voided_by_user: text('voided_by_user'),
    op_id: text('op_id').notNull(),
    last_seq: text('last_seq').notNull().default('0'),
    local_state: localState(),
  },
  (t) => [index('kitty_handovers_trip').on(t.trip_id)],
);

/* ───────────── Local-only tables (03 §10) ───────────── */

export const outbox = sqliteTable(
  'outbox',
  {
    op_id: text('op_id').primaryKey(),
    trip_id: text('trip_id').notNull(),
    type: text('type').notNull(),
    entity_id: text('entity_id').notNull(),
    payload: text('payload').notNull(),
    created_at: text('created_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    next_attempt_at: text('next_attempt_at'),
    /** queued · sending · retrying · rejected */
    state: text('state').notNull().default('queued'),
    reject_code: text('reject_code'),
    last_error: text('last_error'),
  },
  (t) => [index('outbox_trip').on(t.trip_id, t.state)],
);

export const activity = sqliteTable(
  'activity',
  {
    trip_id: text('trip_id').notNull(),
    seq: text('seq').notNull(),
    type: text('type').notNull(),
    entity_id: text('entity_id').notNull(),
    actor_member_id: text('actor_member_id'),
    summary: text('summary').notNull(),
    server_ts: text('server_ts').notNull(),
  },
  (t) => [primaryKey({ columns: [t.trip_id, t.seq] })],
);

export const sync_cursors = sqliteTable('sync_cursors', {
  trip_id: text('trip_id').primaryKey(),
  last_seq: text('last_seq').notNull().default('0'),
  last_pulled_at: text('last_pulled_at'),
});

export const kv = sqliteTable('kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
