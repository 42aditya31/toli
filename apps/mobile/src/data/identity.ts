// Who "I" am on this phone. Until auth lands (M6, D-007: anonymous Supabase user on first open),
// the phone keeps a local user ID in kv; M6 replaces it with the anonymous user's ID before any
// op is pushed, so no local row ever carries a fake ID to the server.
import { eq } from 'drizzle-orm';
import { db, t } from './db.ts';
import { uuidv7 } from './ids.ts';

export function kvGet(key: string): string | null {
  return db.select().from(t.kv).where(eq(t.kv.key, key)).get()?.value ?? null;
}

export function kvSet(key: string, value: string): void {
  db.insert(t.kv)
    .values({ key, value })
    .onConflictDoUpdate({ target: t.kv.key, set: { value } })
    .run();
}

export function myUserId(): string {
  const existing = kvGet('user_id');
  if (existing) return existing;
  const id = uuidv7();
  kvSet('user_id', id);
  return id;
}

export function deviceId(): string {
  const existing = kvGet('device_id');
  if (existing) return existing;
  const id = uuidv7();
  kvSet('device_id', id);
  return id;
}
