// Spike 3 only (docs/spikes/03-sqlite-money.md). Deleted after the spike, with its inline styles.
import { allocate, computeBalances, formatMoney } from '@toli/engine';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import migrations from '../../drizzle/migrations';
import { fromDb, toDb } from '../data/money-codec.ts';
import { expense_revisions, outbox } from './schema.ts';

const sqlite = openDatabaseSync('spike.db');
const db = drizzle(sqlite);
const VALUES = [1n, 33334n, 100_000_000_000n, 9_007_199_254_740_991n, -100_000_000_000n];

function runChecks(): string[] {
  const out: string[] = [];
  const check = (name: string, ok: boolean, extra = '') =>
    out.push(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);

  db.delete(outbox).run();
  db.delete(expense_revisions).run();

  check('hermes bigint', 2n ** 60n === 1152921504606846976n);
  const g2 = allocate(100000n, [1n, 1n, 1n], ['a', 'r', 'n'], 'exp-1');
  check('engine allocate (G2)', g2.reduce((x, y) => x + y, 0n) === 100000n, g2.join('/'));
  const g1 = computeBalances({
    members: [{ id: 'A' }, { id: 'R' }],
    expenses: [
      { id: 'x', order: '1', baseAmount: 340000n, shares: { R: 340000n }, payers: { A: 340000n } },
    ],
    settlements: [],
    contributions: [],
    kitty: { initialHolder: null, handovers: [] },
  });
  check('engine format', formatMoney(g1.trip.A ?? 0n, 'INR', { signed: true }) === '+₹3,400');

  VALUES.forEach((v, i) => {
    db.insert(expense_revisions)
      .values({
        id: `r${i}`,
        expense_id: `e${i}`,
        amount_minor: toDb(v),
        base_amount_minor: toDb(v),
        local_state: 'pending',
      })
      .run();
  });
  const rows = db.select().from(expense_revisions).orderBy(expense_revisions.id).all();
  check(
    'round-trip',
    rows.length === VALUES.length && rows.every((r, i) => fromDb(r.amount_minor) === VALUES[i]),
  );
  const sum = rows.reduce((a, r) => a + fromDb(r.base_amount_minor), 0n);
  check('bigint sum', sum === VALUES.reduce((a, v) => a + v, 0n), String(sum));

  try {
    db.transaction((tx) => {
      tx.insert(expense_revisions)
        .values({
          id: 'rb',
          expense_id: 'eb',
          amount_minor: 5,
          base_amount_minor: 5,
          local_state: 'pending',
        })
        .run();
      tx.insert(outbox)
        .values({
          op_id: 'ob',
          trip_id: 't',
          type: 'expense.create',
          entity_id: 'eb',
          payload: '{}',
          created_at: 'now',
          state: 'queued',
        })
        .run();
      throw new Error('kill mid-save');
    });
  } catch {
    // expected: the transaction must roll back
  }
  const leaked =
    db.select().from(outbox).all().length +
    db
      .select()
      .from(expense_revisions)
      .all()
      .filter((r) => r.id === 'rb').length;
  check('atomic rollback', leaked === 0, `leaked=${leaked}`);

  const t0 = Date.now();
  db.transaction((tx) => {
    tx.insert(expense_revisions)
      .values({
        id: 'rt',
        expense_id: 'et',
        amount_minor: 120000,
        base_amount_minor: 120000,
        local_state: 'pending',
      })
      .run();
    for (let k = 0; k < 4; k++) {
      tx.insert(outbox)
        .values({
          op_id: `o${k}`,
          trip_id: 't',
          type: 'expense.create',
          entity_id: 'et',
          payload: '{"x":1}',
          created_at: 'now',
          state: 'queued',
        })
        .run();
    }
  });
  const ms = Date.now() - t0;
  check('save < 100 ms', ms < 100, `${ms} ms`);
  return out;
}

export function SqliteMoneySpike() {
  const { success, error } = useMigrations(db, migrations);
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (success) setLines(runChecks());
  }, [success]);
  const text = error ? `FAIL  migrations ${error.message}` : lines.join('\n') || 'running…';
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 16 }}>{`SPIKE 3 · SQLITE + MONEY\n\n${text}`}</Text>
    </ScrollView>
  );
}
