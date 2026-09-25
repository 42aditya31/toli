import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findRawStyles } from './check-raw-styles.mjs';

const fx = (p) => fileURLToPath(new URL(`./fixtures/styles/${p}`, import.meta.url));

describe('check-raw-styles (13: tokens only in apps/)', () => {
  it('flags raw hex, rgba, px, cubic-bezier, Easing.bezier and numeric style values', () => {
    const kinds = findRawStyles([fx('bad.tsx')]).map((h) => `${h.line}:${h.kind}`);
    expect(kinds).toEqual([
      '1:hex',
      '2:rgb',
      '3:number:padding',
      '3:number:marginTop',
      '4:px',
      '5:cubic-bezier',
      '7:bezier',
    ]);
  });
  it('accepts tokens, flex, 0, opacity and percentages', () => {
    expect(findRawStyles([fx('good.tsx')])).toEqual([]);
  });
});
