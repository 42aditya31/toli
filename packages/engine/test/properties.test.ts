import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  checkRemovedMembers,
  computeBalances,
  computeShares,
  convertToBase,
  directPayments,
  explainBalance,
  type Ledger,
  type LedgerExpense,
  northWestPairs,
  parseRate,
  roundingAdjustments,
  type SplitSpec,
  simplify,
  toBase,
} from '../src/index.ts';

const RUNS = Number(process.env.FC_RUNS ?? 200);
const sum = (xs: Iterable<bigint>) => [...xs].reduce((a, b) => a + b, 0n);

const MEMBERS = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5'];

type RawExpense = {
  amount: bigint;
  mode: 'equal' | 'exact' | 'percent' | 'shares' | 'adjustment';
  who: boolean[];
  weights: bigint[];
  payer: number;
  secondPayer: number;
  fromKitty: boolean;
  refund: boolean;
  rate: string;
};

const rawExpense: fc.Arbitrary<RawExpense> = fc.record({
  amount: fc.bigInt({ min: 1n, max: 5_000_000n }),
  mode: fc.constantFrom('equal', 'exact', 'percent', 'shares', 'adjustment'),
  who: fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
  weights: fc.array(fc.bigInt({ min: 1n, max: 9n }), { minLength: 6, maxLength: 6 }),
  payer: fc.nat(5),
  secondPayer: fc.integer({ min: -1, max: 5 }),
  fromKitty: fc.boolean(),
  refund: fc.boolean(),
  rate: fc.constantFrom('1', '0.0053', '83.12', '1.5'),
});

/** Builds a valid ledger expense through the real split + toBase pipeline. */
function buildExpense(
  id: string,
  order: string,
  raw: RawExpense,
  kittyOn: boolean,
): LedgerExpense | null {
  const who = MEMBERS.filter((_, i) => raw.who[i]);
  if (who.length === 0) who.push('m0');
  let spec: SplitSpec;
  if (raw.mode === 'equal') spec = { mode: 'equal', participants: who };
  else if (raw.mode === 'shares') {
    spec = {
      mode: 'shares',
      values: Object.fromEntries(who.map((m, i) => [m, raw.weights[i] as bigint])),
    };
  } else if (raw.mode === 'percent') {
    // Spread 10000 bp using the weights, the last person taking the remainder.
    const w = who.map((_, i) => raw.weights[i] as bigint);
    const W = sum(w);
    const bp = w.map((x) => (x * 10000n) / W);
    bp[bp.length - 1] = (bp[bp.length - 1] as bigint) + (10000n - sum(bp));
    spec = { mode: 'percent', values: Object.fromEntries(who.map((m, i) => [m, bp[i] as bigint])) };
  } else if (raw.mode === 'exact') {
    const eq = computeShares(id, raw.amount, { mode: 'equal', participants: who });
    if (!eq.ok) return null;
    spec = { mode: 'exact', values: eq.shares };
  } else {
    const add = raw.amount / 10n;
    spec = {
      mode: 'adjustment',
      values: Object.fromEntries(who.map((m, i) => [m, i === 0 ? add : 0n])),
    };
  }
  const split = computeShares(id, raw.amount, spec);
  if (!split.ok) throw new Error(`generator produced an invalid split: ${split.error}`);
  const p1 = MEMBERS[raw.payer] as string;
  const p2 = raw.secondPayer >= 0 ? (MEMBERS[raw.secondPayer] as string) : p1;
  const payers: Record<string, bigint> | 'kitty' =
    kittyOn && raw.fromKitty
      ? 'kitty'
      : p1 === p2
        ? { [p1]: raw.amount }
        : { [p1]: raw.amount - raw.amount / 3n, [p2]: raw.amount / 3n };
  if (payers !== 'kitty' && Object.values(payers).some((v) => v <= 0n)) return null;
  const base = toBase(id, raw.amount, parseRate(raw.rate), split.shares, payers);
  if (!base.ok) return null;
  return {
    id,
    order,
    baseAmount: base.baseAmount,
    shares: base.baseShares,
    payers: base.basePayers,
    ...(raw.refund ? { isRefund: true } : {}),
  };
}

const tripArb = fc
  .record({
    expenses: fc.array(rawExpense, { maxLength: 14 }),
    settlements: fc.array(
      fc.record({ from: fc.nat(5), to: fc.nat(5), amount: fc.bigInt({ min: 1n, max: 900_000n }) }),
      { maxLength: 5 },
    ),
    contributions: fc.array(
      fc.record({ m: fc.nat(5), amount: fc.bigInt({ min: 1n, max: 900_000n }) }),
      {
        maxLength: 5,
      },
    ),
    kittyOn: fc.boolean(),
    holder: fc.nat(5),
    handoverTo: fc.array(fc.nat(5), { maxLength: 3 }),
  })
  .map((t): Ledger => {
    let n = 0;
    const order = () => `o${String(n++).padStart(4, '0')}`;
    const expenses = t.expenses.flatMap((raw, i) => {
      const e = buildExpense(`e${i}`, order(), raw, t.kittyOn);
      return e ? [e] : [];
    });
    const settlements = t.settlements
      .filter((s) => s.from !== s.to)
      .map((s, i) => ({
        id: `s${i}`,
        order: order(),
        from: MEMBERS[s.from] as string,
        to: MEMBERS[s.to] as string,
        amount: s.amount,
      }));
    const contributions = t.kittyOn
      ? t.contributions.map((c, i) => ({
          id: `c${i}`,
          order: order(),
          memberId: MEMBERS[c.m] as string,
          amount: c.amount,
        }))
      : [];
    let holder = MEMBERS[t.holder] as string;
    const handovers = t.kittyOn
      ? t.handoverTo.flatMap((to, i) => {
          const next = MEMBERS[to] as string;
          if (next === holder) return [];
          const h = { id: `h${i}`, order: order(), from: holder, to: next };
          holder = next;
          return [h];
        })
      : [];
    return {
      members: MEMBERS.map((id) => ({ id })),
      expenses,
      settlements,
      contributions,
      kitty: { initialHolder: t.kittyOn ? (MEMBERS[t.holder] as string) : null, handovers },
    };
  });

const shuffle = <T>(xs: readonly T[], seed: number): T[] => {
  const out = [...xs];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};

const netsOf = (payments: { from: string; to: string; amount: bigint }[]) => {
  const nets: Record<string, bigint> = Object.fromEntries(MEMBERS.map((m) => [m, 0n]));
  for (const p of payments) {
    nets[p.from] = (nets[p.from] as bigint) - p.amount;
    nets[p.to] = (nets[p.to] as bigint) + p.amount;
  }
  return nets;
};

describe('invariants (07 §13), on random trips', () => {
  it('1 · 13: Σ balances = 0 in both views; the views differ only by the kitty', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        const b = computeBalances(l);
        expect(sum(Object.values(b.settle))).toBe(0n);
        expect(sum(Object.values(b.trip)) + b.kittyBalance).toBe(0n);
        expect(sum(Object.values(b.trip)) - sum(Object.values(b.settle))).toBe(b.kittyCash);
      }),
      { numRuns: RUNS },
    );
  });

  it('3 · 15: every revision is zero-sum by itself and has base_amount ≥ 1', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        for (const e of l.expenses) {
          expect(e.baseAmount >= 1n).toBe(true);
          expect(sum(Object.values(e.shares))).toBe(e.baseAmount);
          if (e.payers !== 'kitty') expect(sum(Object.values(e.payers))).toBe(e.baseAmount);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('4 · 8 (G8): the same op set in any order gives identical balances and payments', () => {
    fc.assert(
      fc.property(tripArb, fc.integer({ min: 1, max: 10 ** 6 }), (l, seed) => {
        const reference = computeBalances(l);
        for (const k of [seed, seed + 1, seed + 2]) {
          const shuffled: Ledger = {
            members: shuffle(l.members, k),
            expenses: shuffle(l.expenses, k + 7),
            settlements: shuffle(l.settlements, k + 13),
            contributions: shuffle(l.contributions, k + 17),
            kitty: {
              initialHolder: l.kitty.initialHolder,
              handovers: shuffle(l.kitty.handovers, k + 19),
            },
          };
          const b = computeBalances(shuffled);
          expect(b.trip).toEqual(reference.trip);
          expect(b.settle).toEqual(reference.settle);
          expect(simplify(b.settle)).toEqual(simplify(reference.settle));
          expect(directPayments(shuffled)).toEqual(directPayments(l));
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('5: simplify keeps balances, uses ≤ n − 1 payments, nobody pays and receives', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        const b = computeBalances(l).settle;
        const pays = simplify(b);
        const nonZero = Object.values(b).filter((v) => v !== 0n).length;
        expect(pays.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
        expect(netsOf(pays)).toEqual(b);
        const payers = new Set(pays.map((p) => p.from));
        for (const p of pays) expect(payers.has(p.to)).toBe(false);
      }),
      { numRuns: RUNS },
    );
  });

  it('6: deleting an expense restores every balance exactly', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        l.expenses.forEach((e, i) => {
          const without = { ...l, expenses: l.expenses.filter((_, j) => j !== i) };
          const withAgain = { ...without, expenses: [...without.expenses, e] };
          expect(computeBalances(withAgain).trip).toEqual(computeBalances(l).trip);
        });
      }),
      { numRuns: Math.max(20, RUNS / 4) },
    );
  });

  it('7: a frozen rate string always converts identically', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        fc.constantFrom('0.0053', '83.12', '1'),
        (amount, rate) => {
          expect(convertToBase(amount, parseRate(rate))).toBe(
            convertToBase(amount, parseRate(rate)),
          );
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('§9 explanations: lines add up exactly to the balance in both views', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        const b = computeBalances(l);
        for (const m of MEMBERS) {
          expect(sum(explainBalance(l, m, 'trip').map((x) => x.amount))).toBe(b.trip[m]);
          expect(sum(explainBalance(l, m, 'settle').map((x) => x.amount))).toBe(b.settle[m]);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('11: direct pairing is exact, and direct nets equal the settle-view balances', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        for (const e of l.expenses) {
          if (e.payers === 'kitty') continue;
          const pieces = northWestPairs(e.shares, e.payers);
          const rows: Record<string, bigint> = {};
          const cols: Record<string, bigint> = {};
          for (const p of pieces) {
            rows[p.from] = (rows[p.from] ?? 0n) + p.amount;
            cols[p.to] = (cols[p.to] ?? 0n) + p.amount;
          }
          expect(rows).toEqual(e.shares);
          expect(cols).toEqual(e.payers);
        }
        const settle = computeBalances(l).settle;
        expect(netsOf(directPayments(l))).toEqual(settle);
      }),
      { numRuns: RUNS },
    );
  });

  it('12: a removed member stays at 0 under any later change', () => {
    fc.assert(
      fc.property(tripArb, rawExpense, (l, raw) => {
        const b = computeBalances(l).trip;
        const zero = MEMBERS.find((m) => b[m] === 0n);
        if (!zero) return;
        const before: Ledger = {
          ...l,
          members: l.members.map((m) => (m.id === zero ? { id: m.id, removed: true } : m)),
        };
        const extra = buildExpense('late', 'o9999', raw, false);
        if (!extra) return;
        const after = { ...before, expenses: [...before.expenses, extra] };
        const moved = computeBalances(after).trip[zero] !== 0n;
        expect(checkRemovedMembers(before, after).ok).toBe(!moved);
      }),
      { numRuns: RUNS },
    );
  });

  it('14: the dust rule leaves every balance at 0 and never writes ≥ 1 major unit', () => {
    fc.assert(
      fc.property(tripArb, (l) => {
        const b = computeBalances(l).settle;
        // Pay everything off except up to 99 paise per payment, then apply the dust rule.
        const pays = simplify(b);
        const partial = pays.map((p, i) => ({
          id: `p${i}`,
          order: `z${i}`,
          from: p.from,
          to: p.to,
          amount: p.amount > 99n ? p.amount - (p.amount % 100n) : 0n,
        }));
        const paid = {
          ...l,
          settlements: [...l.settlements, ...partial.filter((p) => p.amount > 0n)],
        };
        const left = simplify(computeBalances(paid).settle);
        const dust = roundingAdjustments(left, 'INR');
        if (!dust) return;
        for (const d of dust) expect(d.amount < 100n).toBe(true);
        const closed = {
          ...paid,
          settlements: [
            ...paid.settlements,
            ...dust.map((d, i) => ({
              id: `r${i}`,
              order: `zz${i}`,
              ...d,
              method: 'rounding' as const,
            })),
          ],
        };
        expect(Object.values(computeBalances(closed).settle).every((v) => v === 0n)).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });
});
