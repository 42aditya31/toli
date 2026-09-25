// Spike 3 only: a trimmed copy of two documented tables (03 §5.2, §10). Deleted after the spike.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const expense_revisions = sqliteTable('expense_revisions', {
  id: text('id').primaryKey(),
  expense_id: text('expense_id').notNull(),
  amount_minor: integer('amount_minor').notNull(),
  base_amount_minor: integer('base_amount_minor').notNull(),
  local_state: text('local_state').notNull(),
});

export const outbox = sqliteTable('outbox', {
  op_id: text('op_id').primaryKey(),
  trip_id: text('trip_id').notNull(),
  type: text('type').notNull(),
  entity_id: text('entity_id').notNull(),
  payload: text('payload').notNull(),
  created_at: text('created_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  state: text('state').notNull(),
});
