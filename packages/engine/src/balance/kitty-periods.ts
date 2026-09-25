import { byOrder, type Ledger, signOf } from './ledger.ts';

export type KittyLine =
  | { readonly kind: 'kitty_holding'; readonly memberId: string; readonly amount: bigint }
  | {
      readonly kind: 'kitty_handover';
      readonly memberId: string;
      readonly handoverId: string;
      readonly counterparty: string;
      readonly amount: bigint;
    };

export type KittyReplay = {
  readonly kittyIn: bigint;
  readonly kittySpent: bigint;
  readonly holder: string | null;
  /** Settle-view lines (07 §6, D-022). They sum to −kittyCash across all members. */
  readonly lines: readonly KittyLine[];
};

type Event =
  | { readonly type: 'cash'; readonly id: string; readonly order: string; readonly delta: bigint }
  | {
      readonly type: 'handover';
      readonly id: string;
      readonly order: string;
      readonly from: string;
      readonly to: string;
    };

/**
 * Replays contributions, kitty-paid expenses and hand-overs in order. Each holding period ends
 * with a `kitty_holding` line of −(cash that came in during it); each hand-over gives +R to the
 * giver and −R to the receiver, R being the cash at that moment. Net effect: the current holder
 * is charged the final remaining cash, and every earlier holder nets to 0.
 */
export function replayKitty(ledger: Ledger): KittyReplay {
  const events: Event[] = [];
  let kittyIn = 0n;
  let kittySpent = 0n;
  for (const c of ledger.contributions) {
    kittyIn += c.amount;
    events.push({ type: 'cash', id: c.id, order: c.order, delta: c.amount });
  }
  for (const e of ledger.expenses) {
    if (e.payers !== 'kitty') continue;
    const spent = signOf(e) * e.baseAmount;
    kittySpent += spent;
    events.push({ type: 'cash', id: e.id, order: e.order, delta: -spent });
  }
  for (const h of ledger.kitty.handovers) {
    events.push({ type: 'handover', id: h.id, order: h.order, from: h.from, to: h.to });
  }
  events.sort(byOrder);

  let holder = ledger.kitty.initialHolder;
  if (holder === null) {
    if (events.length > 0) throw new Error('kitty_holder_required');
    return { kittyIn, kittySpent, holder, lines: [] };
  }
  const lines: KittyLine[] = [];
  let cash = 0n;
  let periodNet = 0n;
  const closePeriod = (memberId: string) => {
    if (periodNet !== 0n) lines.push({ kind: 'kitty_holding', memberId, amount: -periodNet });
    periodNet = 0n;
  };
  for (const ev of events) {
    if (ev.type === 'cash') {
      cash += ev.delta;
      periodNet += ev.delta;
      continue;
    }
    if (ev.from !== holder || ev.from === ev.to) throw new Error(`invalid_handover: ${ev.id}`);
    closePeriod(holder);
    lines.push({
      kind: 'kitty_handover',
      memberId: ev.from,
      handoverId: ev.id,
      counterparty: ev.to,
      amount: cash,
    });
    lines.push({
      kind: 'kitty_handover',
      memberId: ev.to,
      handoverId: ev.id,
      counterparty: ev.from,
      amount: -cash,
    });
    holder = ev.to;
  }
  closePeriod(holder);
  return { kittyIn, kittySpent, holder, lines };
}
