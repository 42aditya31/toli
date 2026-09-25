import { describe, expect, it } from 'vitest';
import { OP_PAYLOADS, parsePayload } from '../src/index.ts';

describe('op payloads (06 §4, D-014)', () => {
  it('money is a string of integer minor units, never a number', () => {
    const ok = {
      from_member_id: 'a',
      to_member_id: 'b',
      amount_minor: '120000',
      method: 'cash',
      note: null,
    };
    expect(parsePayload('settlement.create', ok).amount_minor).toBe('120000');
    expect(() => parsePayload('settlement.create', { ...ok, amount_minor: 1200 })).toThrow();
    expect(() => parsePayload('settlement.create', { ...ok, amount_minor: '12.5' })).toThrow();
  });
  it('rejects rounding settlements from phones (server-only, D-021)', () => {
    const p = {
      from_member_id: 'a',
      to_member_id: 'b',
      amount_minor: '33',
      method: 'rounding',
      note: null,
    };
    expect(() => parsePayload('settlement.create', p)).toThrow();
  });
  it('covers every R1a op type phones send', () => {
    expect(Object.keys(OP_PAYLOADS).sort()).toEqual(
      [
        'expense.create',
        'expense.delete',
        'expense.edit',
        'kitty.contribute',
        'kitty.handover',
        'kitty.void',
        'member.add',
        'member.remove',
        'member.set_role',
        'member.update',
        'settlement.create',
        'settlement.void',
        'trip.close',
        'trip.create',
        'trip.request_reopen',
        'trip.transition',
        'trip.update',
      ].sort(),
    );
  });
});
