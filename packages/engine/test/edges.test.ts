import { describe, expect, it } from 'vitest';
import {
  checkRemovedMembers,
  computeBalances,
  directPayments,
  ENGINE_VERSION,
  explainBalance,
  isKittyLow,
  kittyRefunds,
  northWestPairs,
  simplify,
  topUpSuggestion,
  whyLines,
} from '../src/index.ts';
import { contribution, equal, expense, handover, ledger, rupees, settlement } from './helpers.ts';

describe('ledger validation', () => {
  it('rejects members the ledger does not know', () => {
    const bad = [
      ledger({ members: ['A'], expenses: [expense('x', 100n, { B: 100n }, equal('A'))] }),
      ledger({ members: ['A'], expenses: [expense('x', 100n, { A: 100n }, equal('B'))] }),
      ledger({ members: ['A'], settlements: [settlement('A', 'B', 1n)] }),
      ledger({ members: ['A'], settlements: [settlement('B', 'A', 1n)] }),
      ledger({ members: ['A'], contributions: [contribution('B', 1n)], holder: 'A' }),
      ledger({ members: ['A'], holder: 'B' }),
      ledger({ members: ['A'], holder: 'A', handovers: [handover('A', 'B')] }),
      ledger({ members: ['A'], holder: 'A', handovers: [handover('B', 'A')] }),
    ];
    for (const l of bad) expect(() => computeBalances(l)).toThrow('unknown_member');
  });

  it('requires a kitty holder once the kitty has any activity', () => {
    const l = ledger({ members: ['A'], contributions: [contribution('A', 100n)] });
    expect(() => computeBalances(l)).toThrow('kitty_holder_required');
    expect(computeBalances(ledger({ members: ['A'] })).kittyHolder).toBeNull();
  });

  it('rejects a hand-over from someone who is not holding the cash, or to themselves', () => {
    const wrongFrom = ledger({
      members: ['A', 'B', 'C'],
      holder: 'A',
      handovers: [handover('B', 'C')],
    });
    expect(() => computeBalances(wrongFrom)).toThrow('invalid_handover');
    const toSelf = ledger({ members: ['A', 'B'], holder: 'A', handovers: [handover('A', 'A')] });
    expect(() => computeBalances(toSelf)).toThrow('invalid_handover');
  });

  it('orders entries with the same order key by id', () => {
    const a = { ...expense('b-exp', 100n, { A: 100n }, equal('A', 'B')), order: 'same' };
    const b = { ...expense('a-exp', 100n, { B: 100n }, equal('A', 'B')), order: 'same' };
    const lines = explainBalance(ledger({ members: ['A', 'B'], expenses: [a, b] }), 'A', 'trip');
    expect(lines.map((x) => ('expenseId' in x ? x.expenseId : '')).slice(0, 1)).toEqual(['a-exp']);
  });

  it('exposes the engine version', () => {
    expect(ENGINE_VERSION).toBe(1);
  });
});

describe('trace lines', () => {
  it('carries settlement methods and refund kinds', () => {
    const l = ledger({
      members: ['A', 'B'],
      expenses: [
        expense('hotel', rupees(400), { A: rupees(400) }, equal('A', 'B')),
        expense('back', rupees(100), { A: rupees(100) }, equal('A', 'B'), { isRefund: true }),
      ],
      settlements: [settlement('B', 'A', rupees(50), 'upi'), settlement('B', 'A', rupees(10))],
    });
    const a = explainBalance(l, 'A', 'trip');
    expect(a.map((x) => x.kind)).toEqual([
      'paid',
      'share',
      'refund_paid',
      'refund_share',
      'settlement_received',
      'settlement_received',
    ]);
    expect(a[4]).toMatchObject({ method: 'upi', counterparty: 'B', amount: rupees(-50) });
    expect(a[5]).not.toHaveProperty('method');
    const b = explainBalance(l, 'B', 'trip');
    expect(b.filter((x) => x.kind === 'settlement_paid')).toHaveLength(2);
    expect(b.reduce((s, x) => s + x.amount, 0n)).toBe(computeBalances(l).trip.B);
  });

  it('shows the kitty only in the settle view', () => {
    const l = ledger({
      members: ['A', 'B'],
      holder: 'A',
      contributions: [contribution('B', rupees(100))],
    });
    expect(explainBalance(l, 'A', 'trip')).toEqual([]);
    expect(explainBalance(l, 'A', 'settle')).toEqual([
      { kind: 'kitty_holding', amount: rupees(-100) },
    ]);
    expect(explainBalance(l, 'B', 'settle')).toEqual([
      { kind: 'kitty_contribution', contributionId: l.contributions[0]?.id, amount: rupees(100) },
    ]);
  });
});

describe('removed members', () => {
  it('treats a member missing before the change as 0', () => {
    const before = ledger({ members: ['A'] });
    const after = ledger({ members: ['A', 'Z'], removed: ['Z'] });
    expect(checkRemovedMembers(before, after)).toEqual({ ok: true });
  });
});

describe('direct mode details', () => {
  it('reverses refunds and pairs kitty lines with the current holder', () => {
    const l = ledger({
      members: ['A', 'B', 'H'],
      holder: 'H',
      contributions: [contribution('A', rupees(300)), contribution('H', rupees(300))],
      expenses: [
        expense('fuel', rupees(300), 'kitty', equal('A', 'B', 'H')),
        expense('fuel-back', rupees(30), 'kitty', equal('A', 'B', 'H'), { isRefund: true }),
        expense('room', rupees(200), { A: rupees(200) }, equal('A', 'B')),
        expense('room-back', rupees(20), { A: rupees(20) }, equal('A', 'B'), { isRefund: true }),
      ],
    });
    const nets: Record<string, bigint> = { A: 0n, B: 0n, H: 0n };
    for (const p of directPayments(l)) {
      nets[p.from] = (nets[p.from] as bigint) - p.amount;
      nets[p.to] = (nets[p.to] as bigint) + p.amount;
    }
    expect(nets).toEqual(computeBalances(l).settle);
  });

  it('pairs in member-ID order whatever the input order, skipping zero entries', () => {
    expect(northWestPairs({ C: 1n, A: 2n, B: 0n }, { Z: 2n, Y: 1n })).toEqual([
      { from: 'A', to: 'Y', amount: 1n },
      { from: 'A', to: 'Z', amount: 1n },
      { from: 'C', to: 'Z', amount: 1n },
    ]);
  });

  it('handles empty inputs', () => {
    expect(northWestPairs({}, { A: 5n })).toEqual([]);
    expect(northWestPairs({ A: 5n }, {})).toEqual([]);
    expect(directPayments(ledger({ members: ['A'] }))).toEqual([]);
    expect(simplify({})).toEqual([]);
    expect(simplify({ A: 0n })).toEqual([]);
  });

  it('drops pairs that net to zero', () => {
    const l = ledger({
      members: ['A', 'B'],
      expenses: [expense('x', 200n, { A: 200n }, equal('A', 'B'))],
      settlements: [settlement('B', 'A', 100n)],
    });
    expect(directPayments(l)).toEqual([]);
  });

  it('simplify splits one creditor across several debtors and vice versa', () => {
    expect(simplify({ A: 300n, B: -100n, C: -200n })).toEqual([
      { from: 'C', to: 'A', amount: 200n },
      { from: 'B', to: 'A', amount: 100n },
    ]);
    expect(simplify({ A: -300n, B: 100n, C: 200n })).toEqual([
      { from: 'A', to: 'C', amount: 200n },
      { from: 'A', to: 'B', amount: 100n },
    ]);
  });
});

describe('why lines (07 §9)', () => {
  it("lists the debtor's largest shares of expenses paid by others", () => {
    const l = ledger({
      members: ['A', 'R', 'N'],
      holder: 'A',
      contributions: [contribution('A', rupees(900))],
      expenses: [
        expense('casa', rupees(3000), { A: rupees(3000) }, equal('A', 'R', 'N')),
        expense('cab', rupees(600), { A: rupees(600) }, equal('A', 'R', 'N')),
        expense('snack', rupees(300), 'kitty', equal('A', 'R', 'N')),
        expense('own', rupees(900), { R: rupees(900) }, equal('A', 'R', 'N')),
        expense('back', rupees(90), { A: rupees(90) }, equal('A', 'R', 'N'), { isRefund: true }),
        expense('tie', rupees(600), { N: rupees(600) }, equal('A', 'R', 'N')),
      ],
    });
    expect(whyLines(l, 'R')).toEqual([
      { expenseId: 'casa', amount: rupees(1000) },
      { expenseId: 'cab', amount: rupees(200) },
    ]);
    expect(whyLines(l, 'R', 5).map((x) => x.expenseId)).toEqual(['casa', 'cab', 'tie', 'snack']);
    expect(whyLines(l, 'Z')).toEqual([]);
    const ties = ledger({
      members: ['A', 'B'],
      expenses: ['z', 'm', 'a', 'q'].map((id) => expense(id, 200n, { A: 200n }, equal('A', 'B'))),
    });
    expect(whyLines(ties, 'B', 4).map((x) => x.expenseId)).toEqual(['a', 'm', 'q', 'z']);
  });
});

describe('kitty helpers (07 §6)', () => {
  it('has no refunds when nothing is left or nobody put in', () => {
    const overspent = ledger({
      members: ['A', 'B'],
      holder: 'A',
      contributions: [contribution('A', 100n)],
      expenses: [expense('x', 300n, 'kitty', equal('A', 'B'))],
    });
    expect(computeBalances(overspent).kittyCash).toBe(-200n);
    expect(kittyRefunds(overspent)).toEqual({});
    expect(kittyRefunds(ledger({ members: ['A'] }))).toEqual({});
    const twice = ledger({
      members: ['A'],
      holder: 'A',
      contributions: [contribution('A', 100n), contribution('A', 50n)],
    });
    expect(kittyRefunds(twice)).toEqual({ A: 150n });
  });

  it('flags LOW at or below 20% by default, or a custom threshold', () => {
    expect(isKittyLow(rupees(15000), rupees(3000))).toBe(true);
    expect(isKittyLow(rupees(15000), rupees(3001))).toBe(false);
    expect(isKittyLow(rupees(15000), rupees(-100))).toBe(true);
    expect(isKittyLow(rupees(1000), rupees(400), 5000n)).toBe(true);
  });

  it('suggests a top-up rounded up to ₹50 per person', () => {
    // ₹12,000 spent in 2 days, 2 days left, ₹3,000 left, 4 people → need ₹9,000 → ₹2,250 each.
    const base = {
      kittySpent: rupees(12000),
      daysElapsed: 2n,
      daysLeft: 2n,
      remaining: rupees(3000),
      members: 4n,
      currency: 'INR',
    };
    expect(topUpSuggestion(base)).toBe(rupees(2250));
    expect(topUpSuggestion({ ...base, members: 3n })).toBe(rupees(3000));
    expect(topUpSuggestion({ ...base, remaining: rupees(20000) })).toBe(0n);
    expect(topUpSuggestion({ ...base, members: 0n })).toBe(0n);
    expect(topUpSuggestion({ ...base, daysElapsed: 0n, daysLeft: 1n })).toBe(rupees(2250));
    expect(topUpSuggestion({ ...base, currency: 'JPY', kittySpent: 12001n, remaining: 0n })).toBe(
      3050n,
    );
  });
});
