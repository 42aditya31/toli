import { describe, expect, it } from 'vitest';
import {
  checkRemovedMembers,
  computeBalances,
  computeShares,
  directPayments,
  explainBalance,
  formatMoney,
  kittyRefunds,
  northWestPairs,
  parseRate,
  roundingAdjustments,
  simplify,
  splitForUpi,
  toBase,
} from '../src/index.ts';
import {
  contribution,
  equal,
  expense,
  handover,
  ledger,
  rupees,
  settlement,
  total,
} from './helpers.ts';

const sortPays = <T extends { from: string; to: string }>(ps: T[]) =>
  [...ps].sort((a, b) => (a.from + a.to < b.from + b.to ? -1 : 1));

describe('golden fixtures (07 §14)', () => {
  const g1 = ledger({
    members: ['A', 'R', 'N', 'J'],
    expenses: [
      expense('hotel', rupees(4000), { A: rupees(4000) }, equal('A', 'R', 'N', 'J')),
      expense('dinner', rupees(1200), { A: rupees(1200) }, equal('A', 'R')),
      expense('cab', rupees(800), { R: rupees(800) }, equal('A', 'R', 'N', 'J')),
    ],
  });

  it('G1: PRD Appendix A balances and payments; direct nets to the same balances', () => {
    const b = computeBalances(g1);
    expect(b.trip).toEqual({
      A: rupees(3400),
      R: rupees(-1000),
      N: rupees(-1200),
      J: rupees(-1200),
    });
    expect(b.settle).toEqual(b.trip);
    expect(simplify(b.settle)).toEqual([
      { from: 'J', to: 'A', amount: rupees(1200) },
      { from: 'N', to: 'A', amount: rupees(1200) },
      { from: 'R', to: 'A', amount: rupees(1000) },
    ]);
    // Rahul paid the cab, so Neha and Jay owe him ₹200 each directly: 5 direct payments, not 3.
    // (07 §14 G1 and PRD Appendix A said "identical"; corrected in 07, reported to the founder.)
    expect(sortPays(directPayments(g1))).toEqual([
      { from: 'J', to: 'A', amount: rupees(1000) },
      { from: 'J', to: 'R', amount: rupees(200) },
      { from: 'N', to: 'A', amount: rupees(1000) },
      { from: 'N', to: 'R', amount: rupees(200) },
      { from: 'R', to: 'A', amount: rupees(1400) },
    ]);
    const nets: Record<string, bigint> = { A: 0n, R: 0n, N: 0n, J: 0n };
    for (const p of directPayments(g1)) {
      nets[p.from] = (nets[p.from] as bigint) - p.amount;
      nets[p.to] = (nets[p.to] as bigint) + p.amount;
    }
    expect(nets).toEqual(b.settle);
  });

  it('G2: ₹1,000 ÷ 3 is 333.34 / 333.33 / 333.33', () => {
    const r = computeShares('g2', rupees(1000), equal('A', 'R', 'N'));
    if (!r.ok) throw new Error('bad');
    expect(Object.values(r.shares).sort()).toEqual([33333n, 33333n, 33334n]);
    expect(
      Object.values(r.shares)
        .map((v) => formatMoney(v, 'INR'))
        .sort(),
    ).toEqual(['₹333.33', '₹333.33', '₹333.34']);
  });

  it('G3: multiple payers, equal 4 ways', () => {
    const l = ledger({
      members: ['A', 'R', 'N', 'J'],
      expenses: [
        expense(
          'g3',
          rupees(3000),
          { A: rupees(2000), N: rupees(1000) },
          equal('A', 'R', 'N', 'J'),
        ),
      ],
    });
    expect(computeBalances(l).trip).toEqual({
      A: rupees(1250),
      N: rupees(250),
      R: rupees(-750),
      J: rupees(-750),
    });
  });

  it('G4: late joiner, night-1 room split 3 ways, later expenses 4 ways', () => {
    const l = ledger({
      members: ['A', 'R', 'N', 'J'],
      expenses: [
        expense('room-n1', rupees(3000), { A: rupees(3000) }, equal('A', 'R', 'N')),
        expense('cab-d2', rupees(800), { R: rupees(800) }, equal('A', 'R', 'N', 'J')),
      ],
    });
    expect(computeBalances(l).trip).toEqual({
      A: rupees(1800),
      R: rupees(-400),
      N: rupees(-1200),
      J: rupees(-200),
    });
  });

  // PRD A.2 #4 with mixed participant sets (hand-computed in the M2 plan).
  const kittyTrip = () =>
    ledger({
      members: ['A', 'R', 'N', 'J'],
      holder: 'R',
      contributions: [
        contribution('A', rupees(5000)),
        contribution('R', rupees(5000)),
        contribution('N', rupees(3000)),
        contribution('J', rupees(2000)),
      ],
      expenses: [
        expense('fuel', rupees(4200), 'kitty', equal('A', 'R', 'N', 'J')),
        expense('toll', rupees(800), 'kitty', equal('A', 'R')),
        expense('breakfast', rupees(2400), 'kitty', equal('A', 'R', 'N')),
        expense('scooters', rupees(4600), 'kitty', equal('A', 'R', 'N', 'J')),
      ],
    });

  it('G5: kitty, proportional implied refunds, both views sum to 0', () => {
    const l = kittyTrip();
    const b = computeBalances(l);
    expect(b.kittyIn).toBe(rupees(15000));
    expect(b.kittySpent).toBe(rupees(12000));
    expect(b.kittyCash).toBe(rupees(3000));
    expect(b.kittyBalance).toBe(rupees(-3000));
    expect(b.kittyHolder).toBe('R');
    expect(b.trip).toEqual({ A: rupees(1600), R: rupees(1600), N: 0n, J: rupees(-200) });
    expect(total(b.trip) + b.kittyBalance).toBe(0n);
    expect(b.settle).toEqual({ A: rupees(1600), R: rupees(-1400), N: 0n, J: rupees(-200) });
    expect(total(b.settle)).toBe(0n);
    expect(kittyRefunds(l)).toEqual({
      A: rupees(1000),
      R: rupees(1000),
      N: rupees(600),
      J: rupees(400),
    });
    expect(simplify(b.settle)).toEqual([
      { from: 'R', to: 'A', amount: rupees(1400) },
      { from: 'J', to: 'A', amount: rupees(200) },
    ]);
    expect(sortPays(directPayments(l)).reduce((a, p) => a + p.amount, 0n) > 0n).toBe(true);
  });

  it('G6: IDR on an INR trip, frozen rate, balances unchanged when rates move', () => {
    const frozen = parseRate('0.0053');
    const conv = toBase(
      'bali',
      100000000n,
      frozen,
      { A: 50000000n, R: 50000000n },
      { A: 100000000n },
    );
    if (!conv.ok || conv.basePayers === 'kitty') throw new Error('bad');
    const l = ledger({
      members: ['A', 'R'],
      expenses: [
        {
          id: 'bali',
          order: 'o1',
          baseAmount: conv.baseAmount,
          shares: conv.baseShares,
          payers: conv.basePayers,
        },
      ],
    });
    const before = computeBalances(l);
    // The daily rate moves; nothing re-reads it, because the ledger holds the frozen base values.
    const moved = parseRate('0.0061');
    expect(moved).not.toEqual(frozen);
    expect(computeBalances(l)).toEqual(before);
    expect(before.trip).toEqual({ A: 265000n, R: -265000n });
  });

  it('G7: deleting a mid-trip expense restores every balance exactly', () => {
    const before = computeBalances(g1).trip;
    const withExtra = ledger({
      members: ['A', 'R', 'N', 'J'],
      expenses: [...g1.expenses, expense('mid', 99999n, { N: 99999n }, equal('A', 'R', 'N', 'J'))],
    });
    expect(computeBalances(withExtra).trip).not.toEqual(before);
    const deleted = { ...withExtra, expenses: withExtra.expenses.filter((e) => e.id !== 'mid') };
    expect(computeBalances(deleted).trip).toEqual(before);
  });

  it('G10: JPY (exponent 0) and KWD (exponent 3) make no decimal assumptions', () => {
    const jpy = computeShares('g10j', 1000n, equal('A', 'B', 'C'));
    const kwd = computeShares('g10k', 1000n, equal('A', 'B', 'C'));
    if (!jpy.ok || !kwd.ok) throw new Error('bad');
    expect(
      Object.values(jpy.shares)
        .map((v) => formatMoney(v, 'JPY'))
        .sort(),
    ).toEqual(['¥333', '¥333', '¥334']);
    expect(
      Object.values(kwd.shares)
        .map((v) => formatMoney(v, 'KWD'))
        .sort(),
    ).toEqual(['KWD 0.333', 'KWD 0.333', 'KWD 0.334']);
    expect(roundingAdjustments([{ from: 'B', to: 'A', amount: 1n }], 'JPY')).toBeNull();
    expect(roundingAdjustments([{ from: 'B', to: 'A', amount: 999n }], 'KWD')).toEqual([
      { from: 'B', to: 'A', amount: 999n },
    ]);
  });

  it('G11: ₹1.00 paid 50/50, split 3 ways, direct pieces are exact', () => {
    const e = expense('g11', 100n, { A: 50n, B: 50n }, equal('A', 'B', 'C'));
    const pieces = northWestPairs(e.shares, e.payers as Record<string, bigint>);
    const rows: Record<string, bigint> = {};
    const cols: Record<string, bigint> = {};
    for (const p of pieces) {
      rows[p.from] = (rows[p.from] ?? 0n) + p.amount;
      cols[p.to] = (cols[p.to] ?? 0n) + p.amount;
    }
    expect(rows).toEqual(e.shares);
    expect(cols).toEqual({ A: 50n, B: 50n });
    const l = ledger({ members: ['A', 'B', 'C'], expenses: [e] });
    const nets: Record<string, bigint> = { A: 0n, B: 0n, C: 0n };
    for (const p of directPayments(l)) {
      nets[p.from] = (nets[p.from] as bigint) - p.amount;
      nets[p.to] = (nets[p.to] as bigint) + p.amount;
    }
    expect(nets).toEqual(computeBalances(l).settle);
  });

  it('G12: whole-rupee payments leave dust; Close trip writes rounding settlements', () => {
    const dinner = expense('g12', rupees(3700), { A: rupees(3700) }, equal('A', 'B', 'C'));
    const paid = [settlement('B', 'A', rupees(1233)), settlement('C', 'A', rupees(1233))];
    const l = ledger({ members: ['A', 'B', 'C'], expenses: [dinner], settlements: paid });
    const left = simplify(computeBalances(l).settle);
    expect(left.length).toBeGreaterThan(0);
    expect(left.every((p) => p.amount < 100n)).toBe(true);
    const dust = roundingAdjustments(left, 'INR');
    if (!dust) throw new Error('expected dust');
    const closed = {
      ...l,
      settlements: [...paid, ...dust.map((p) => settlement(p.from, p.to, p.amount, 'rounding'))],
    };
    expect(Object.values(computeBalances(closed).settle).every((v) => v === 0n)).toBe(true);
    expect(roundingAdjustments([{ from: 'B', to: 'A', amount: 100n }], 'INR')).toBeNull();
    expect(roundingAdjustments([], 'INR')).toEqual([]);
  });

  it('G13: kitty hand-over mid-trip, trace lines for both holders, Σ = 0', () => {
    const l = ledger({
      members: ['A', 'R', 'N'],
      holder: 'R',
      contributions: [contribution('A', rupees(5000)), contribution('R', rupees(5000))],
      expenses: [expense('k1', rupees(4000), 'kitty', equal('A', 'R', 'N'))],
    });
    const h = handover('R', 'N');
    const later = expense('k2', rupees(2000), 'kitty', equal('A', 'R', 'N'));
    const full = {
      ...l,
      expenses: [...l.expenses, later],
      kitty: { initialHolder: 'R', handovers: [h] },
    };
    const b = computeBalances(full);
    expect(b.kittyHolder).toBe('N');
    expect(b.kittyCash).toBe(rupees(4000));
    expect(total(b.settle)).toBe(0n);
    expect(b.settle.N).toBe((b.trip.N as bigint) - rupees(4000));
    expect(b.settle.R).toBe(b.trip.R);
    const rahul = explainBalance(full, 'R', 'settle');
    const neha = explainBalance(full, 'N', 'settle');
    expect(rahul).toContainEqual({
      kind: 'kitty_handover',
      handoverId: h.id,
      counterparty: 'N',
      amount: rupees(6000),
    });
    expect(neha).toContainEqual({
      kind: 'kitty_handover',
      handoverId: h.id,
      counterparty: 'R',
      amount: rupees(-6000),
    });
    expect(total(Object.fromEntries(rahul.map((x, i) => [String(i), x.amount])))).toBe(b.settle.R);
    expect(total(Object.fromEntries(neha.map((x, i) => [String(i), x.amount])))).toBe(b.settle.N);
  });

  it('G14: removing Jay at 0, then deleting an expense Jay was in, is rejected', () => {
    const e1 = expense('e1', rupees(200), { A: rupees(200) }, equal('A', 'J'));
    const e2 = expense('e2', rupees(200), { J: rupees(200) }, equal('A', 'J'));
    const before = ledger({ members: ['A', 'J'], removed: ['J'], expenses: [e1, e2] });
    expect(computeBalances(before).trip.J).toBe(0n);
    const after = { ...before, expenses: [e2] };
    expect(checkRemovedMembers(before, after)).toEqual({
      ok: false,
      error: 'removed_member_balance',
      memberId: 'J',
    });
    expect(checkRemovedMembers(before, before)).toEqual({ ok: true });
  });

  it('G15: a ₹2,000 refund on a ₹4,000 hotel split 4 ways', () => {
    const hotel = expense('hotel', rupees(4000), { A: rupees(4000) }, equal('A', 'R', 'N', 'J'));
    const refund = expense('refund', rupees(2000), { A: rupees(2000) }, equal('A', 'R', 'N', 'J'), {
      isRefund: true,
    });
    const before = computeBalances(
      ledger({ members: ['A', 'R', 'N', 'J'], expenses: [hotel] }),
    ).trip;
    const after = computeBalances(
      ledger({ members: ['A', 'R', 'N', 'J'], expenses: [hotel, refund] }),
    ).trip;
    for (const m of ['R', 'N', 'J'])
      expect((after[m] as bigint) - (before[m] as bigint)).toBe(rupees(500));
    // A's share also goes down by ₹500, while what A paid goes down by ₹2,000.
    expect((after.A as bigint) - (before.A as bigint)).toBe(rupees(500) - rupees(2000));
  });

  it('G16: ₹1,40,000 becomes two UPI links', () => {
    expect(splitForUpi(rupees(140000), 'INR')).toEqual([rupees(100000), rupees(40000)]);
    expect(splitForUpi(rupees(100000), 'INR')).toEqual([rupees(100000)]);
    expect(splitForUpi(rupees(250000), 'INR')).toEqual([
      rupees(100000),
      rupees(100000),
      rupees(50000),
    ]);
    expect(splitForUpi(50000n, 'USD')).toEqual([50000n]);
    expect(splitForUpi(0n, 'INR')).toEqual([]);
  });
});
