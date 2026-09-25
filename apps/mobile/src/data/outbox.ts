// The outbox (06 §3.1): every change is a row write + an op, in ONE SQLite transaction.
// The sync engine (M5, needs the backend) drains it; until then ops wait here, safe.
import { type OpPayload, type OpType, parsePayload } from '@toli/schema';
import type { Tx } from './db.ts';
import { t } from './db.ts';
import { uuidv7 } from './ids.ts';

export function enqueue<T extends OpType>(
  tx: Tx,
  tripId: string,
  type: T,
  entityId: string,
  payload: OpPayload<T>,
  opId: string = uuidv7(),
): string {
  const valid = parsePayload(type, payload);
  tx.insert(t.outbox)
    .values({
      op_id: opId,
      trip_id: tripId,
      type,
      entity_id: entityId,
      payload: JSON.stringify(valid),
      created_at: new Date().toISOString(),
      state: 'queued',
    })
    .run();
  return opId;
}
