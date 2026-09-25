import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  computeShares,
  distributeRemainder,
  IDENTITY_RATE,
  parseRate,
  type SplitResult,
  toBase,
  validatePayers,
} from '../src/index.ts';

const RUNS = Number(process.env.FC_RUNS ?? 200);
const sum = (r: Record<string, bigint>) => Object.values(r).reduce((a, b) => a + b, 0n);
const ok = (r: SplitResult) => {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
  return r.shares;
};

describe('computeShares (07 §5)', () => {
  it('equal and selected-equal', () => {
    expect(
      ok(computeShares('e', 400000n, { mode: 'equal', participants: ['a', 'r', 'n', 'j'] })),
    ).toEqual({ a: 100000n, r: 100000n, n: 100000n, j: 100000n });
    const g2 = ok(computeShares('e', 100000n, { mode: 'selected', participants: ['n', 'a', 'r'] }));
    expect(sum(g2)).toBe(100000n);
    expect(Object.keys(g2).sort()).toEqual(['a', 'n', 'r']);
  });

  it('rejects zero amount, no participants and duplicates', () => {
    expect(computeShares('e', 0n, { mode: 'equal', participants: ['a'] })).toEqual({
      ok: false,
      error: 'zero_amount',
    });
    expect(computeShares('e', 100n, { mode: 'equal', participants: [] })).toEqual({
      ok: false,
      error: 'no_participants',
    });
    expect(computeShares('e', 100n, { mode: 'equal', participants: ['a', 'a'] })).toEqual({
      ok: false,
      error: 'invalid_value',
    });
  });

  it('exact: used as entered, with unassigned / too much', () => {
    expect(
      ok(computeShares('e', 1000n, { mode: 'exact', values: { a: 600n, b: 400n, c: 0n } })),
    ).toEqual({ a: 600n, b: 400n });
    expect(computeShares('e', 1000n, { mode: 'exact', values: { a: 880n } })).toEqual({
      ok: false,
      error: 'unassigned',
      diff: 120n,
    });
    expect(computeShares('e', 1000n, { mode: 'exact', values: { a: 1050n } })).toEqual({
      ok: false,
      error: 'too_much',
      diff: 50n,
    });
    expect(computeShares('e', 1000n, { mode: 'exact', values: { a: -1n, b: 1001n } })).toEqual({
      ok: false,
      error: 'invalid_value',
    });
    expect(computeShares('e', 1000n, { mode: 'exact', values: { a: 0n } })).toEqual({
      ok: false,
      error: 'no_participants',
    });
  });

  it('percent: basis points must reach 10000', () => {
    expect(
      ok(
        computeShares('e', 100000n, { mode: 'percent', values: { a: 5000n, b: 2500n, c: 2500n } }),
      ),
    ).toEqual({ a: 50000n, b: 25000n, c: 25000n });
    expect(computeShares('e', 1000n, { mode: 'percent', values: { a: 9500n } })).toEqual({
      ok: false,
      error: 'unassigned',
      diff: 500n,
    });
    expect(computeShares('e', 1000n, { mode: 'percent', values: { a: 10500n } })).toEqual({
      ok: false,
      error: 'too_much',
      diff: 500n,
    });
    expect(computeShares('e', 1000n, { mode: 'percent', values: { a: -1n, b: 10001n } })).toEqual({
      ok: false,
      error: 'invalid_value',
    });
    expect(computeShares('e', 1000n, { mode: 'percent', values: {} })).toEqual({
      ok: false,
      error: 'no_participants',
    });
    const thirds = ok(
      computeShares('e', 999n, { mode: 'percent', values: { a: 3333n, b: 3333n, c: 3334n } }),
    );
    expect(sum(thirds)).toBe(999n);
  });

  it('shares: integer weights ≥ 1', () => {
    expect(ok(computeShares('e', 300000n, { mode: 'shares', values: { a: 2n, b: 1n } }))).toEqual({
      a: 200000n,
      b: 100000n,
    });
    expect(computeShares('e', 300n, { mode: 'shares', values: { a: 0n } })).toEqual({
      ok: false,
      error: 'invalid_value',
    });
    expect(computeShares('e', 300n, { mode: 'shares', values: {} })).toEqual({
      ok: false,
      error: 'no_participants',
    });
  });

  it('adjustment: split the rest evenly, then add the add-ons', () => {
    expect(
      ok(computeShares('e', 120000n, { mode: 'adjustment', values: { a: 20000n, b: 0n } })),
    ).toEqual({ a: 70000n, b: 50000n });
    expect(computeShares('e', 1000n, { mode: 'adjustment', values: { a: 800n, b: 300n } })).toEqual(
      { ok: false, error: 'too_much', diff: 100n },
    );
    expect(computeShares('e', 1000n, { mode: 'adjustment', values: { a: -5n } })).toEqual({
      ok: false,
      error: 'invalid_value',
    });
    expect(computeShares('e', 1000n, { mode: 'adjustment', values: {} })).toEqual({
      ok: false,
      error: 'no_participants',
    });
    expect(
      ok(computeShares('e', 1000n, { mode: 'adjustment', values: { a: 1000n, b: 0n } })),
    ).toEqual({ a: 1000n });
  });

  it('G9: itemised bill with GST 5% + service 10%, extras follow subtotals', () => {
    const items = [
      { id: 'i1', amount: 85000n, assignees: ['a', 'r', 'n', 'j'] },
      { id: 'i2', amount: 72000n, assignees: ['r'] },
      { id: 'i3', amount: 110000n, assignees: ['a', 'j'] },
      { id: 'i4', amount: 80000n, assignees: ['a', 'r', 'j'] },
      { id: 'i5', amount: 24000n, assignees: ['n'] },
    ];
    const extras = [
      { kind: 'tax' as const, amount: 18550n },
      { kind: 'service' as const, amount: 37100n },
    ];
    const total = 371000n + 55650n;
    const s = ok(computeShares('bill', total, { mode: 'itemised', items, extras }));
    expect(sum(s)).toBe(total);
    // Rahul's subtotal is 21250 + 72000 + 26666/26667 ≈ 119917; he pays 15% on top of that.
    const rahul = s.r as bigint;
    expect((rahul * 100n) / 115n).toBeGreaterThan(119900n);
    expect((rahul * 100n) / 115n).toBeLessThan(119930n);
  });

  it('itemised: discounts, signed round-off and mismatches', () => {
    const items = [
      { id: 'x', amount: 1000n, assignees: ['a'] },
      { id: 'y', amount: 3000n, assignees: ['b'] },
    ];
    expect(
      ok(
        computeShares('e', 3600n, {
          mode: 'itemised',
          items,
          extras: [
            { kind: 'discount', amount: 400n },
            { kind: 'tip', amount: 0n },
          ],
        }),
      ),
    ).toEqual({ a: 900n, b: 2700n });
    expect(
      ok(
        computeShares('e', 4004n, {
          mode: 'itemised',
          items,
          extras: [{ kind: 'round_off', amount: 4n }],
        }),
      ),
    ).toEqual({ a: 1001n, b: 3003n });
    expect(
      ok(
        computeShares('e', 3996n, {
          mode: 'itemised',
          items,
          extras: [{ kind: 'round_off', amount: -4n }],
        }),
      ),
    ).toEqual({ a: 999n, b: 2997n });
    expect(computeShares('e', 5000n, { mode: 'itemised', items, extras: [] })).toEqual({
      ok: false,
      error: 'items_mismatch',
      diff: 1000n,
    });
    expect(computeShares('e', 3000n, { mode: 'itemised', items, extras: [] })).toEqual({
      ok: false,
      error: 'items_mismatch',
      diff: -1000n,
    });
  });

  it('itemised: rejects empty items, bad amounts and negative extras', () => {
    expect(computeShares('e', 100n, { mode: 'itemised', items: [], extras: [] })).toEqual({
      ok: false,
      error: 'no_participants',
    });
    expect(
      computeShares('e', 100n, {
        mode: 'itemised',
        items: [{ id: 'x', amount: 100n, assignees: [] }],
        extras: [],
      }),
    ).toEqual({ ok: false, error: 'invalid_value' });
    expect(
      computeShares('e', 100n, {
        mode: 'itemised',
        items: [{ id: 'x', amount: 0n, assignees: ['a'] }],
        extras: [],
      }),
    ).toEqual({ ok: false, error: 'invalid_value' });
    expect(
      computeShares('e', 90n, {
        mode: 'itemised',
        items: [{ id: 'x', amount: 100n, assignees: ['a'] }],
        extras: [{ kind: 'tax', amount: -10n }],
      }),
    ).toEqual({ ok: false, error: 'invalid_value' });
  });

  it('itemised: a share that rounding would push below zero is rejected (found by search)', () => {
    // Subtotals 2/1/6/1, tip 16, discount 25, total 1: 07 §5.1 gives m3 = 1 + 1 − 3 = −1.
    const r = computeShares('s448', 1n, {
      mode: 'itemised',
      items: [
        { id: 'i0', amount: 2n, assignees: ['m0'] },
        { id: 'i1', amount: 1n, assignees: ['m1'] },
        { id: 'i2', amount: 6n, assignees: ['m2'] },
        { id: 'i3', amount: 1n, assignees: ['m3'] },
      ],
      extras: [
        { kind: 'tip', amount: 16n },
        { kind: 'discount', amount: 25n },
      ],
    });
    expect(r).toEqual({ ok: false, error: 'invalid_value' });
  });

  it('invariant 3 (per mode): shares always sum to the amount', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 11n }),
        fc.array(fc.bigInt({ min: 1n, max: 50n }), { minLength: 1, maxLength: 10 }),
        fc.string(),
        (amount, weights, seed) => {
          const values = Object.fromEntries(weights.map((w, i) => [`m${i}`, w]));
          expect(sum(ok(computeShares(seed, amount, { mode: 'shares', values })))).toBe(amount);
          expect(
            sum(
              ok(computeShares(seed, amount, { mode: 'equal', participants: Object.keys(values) })),
            ),
          ).toBe(amount);
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe('distributeRemainder', () => {
  it('spreads the unassigned amount equally with allocate()', () => {
    const r = distributeRemainder('e', 100n, ['a', 'b', 'c']);
    expect(sum(r)).toBe(100n);
    expect(Object.values(r).sort()).toEqual([33n, 33n, 34n]);
    expect(distributeRemainder('e', 5n, [])).toEqual({});
  });
});

describe('validatePayers (07 §5.2)', () => {
  it('requires payers that cover the amount exactly', () => {
    expect(validatePayers(300000n, { a: 200000n, n: 100000n })).toEqual({ ok: true });
    expect(validatePayers(300000n, {})).toEqual({ ok: false, error: 'no_payers', diff: 300000n });
    expect(validatePayers(300000n, { a: 200000n })).toEqual({
      ok: false,
      error: 'unassigned',
      diff: 100000n,
    });
    expect(validatePayers(300000n, { a: 320000n })).toEqual({
      ok: false,
      error: 'too_much',
      diff: 20000n,
    });
    expect(validatePayers(300000n, { a: 300001n, b: -1n })).toEqual({
      ok: false,
      error: 'invalid_value',
      diff: 0n,
    });
  });
});

describe('toBase (07 §4.4)', () => {
  it('same currency is an exact identity', () => {
    expect(
      toBase('e', 300000n, IDENTITY_RATE, { a: 75000n, r: 225000n }, { a: 200000n, n: 100000n }),
    ).toEqual({
      ok: true,
      baseAmount: 300000n,
      baseShares: { a: 75000n, r: 225000n },
      basePayers: { a: 200000n, n: 100000n },
    });
  });

  it('converts the whole vector once, so shares and payers both sum to base', () => {
    const r = toBase(
      'e',
      100000000n,
      parseRate('0.0053'),
      { a: 33333334n, b: 33333333n, c: 33333333n },
      'kitty',
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.baseAmount).toBe(530000n);
    expect(sum(r.baseShares)).toBe(530000n);
    expect(r.basePayers).toBe('kitty');
  });

  it('rejects amounts too small to convert (07 §4.2)', () => {
    expect(toBase('e', 1n, parseRate('0.003'), { a: 1n }, { a: 1n })).toEqual({
      ok: false,
      error: 'below_min_unit',
    });
  });
});
