/**
 * Op payloads (06 §4) for the R1a op types, and the wire envelope (04 §2.1). Money and seq are
 * strings of integers on the wire (D-014). The server parses strictly; the phone parses its own
 * pulls leniently (D-026), so these objects are `.strip()`ed rather than `.strict()` here and the
 * server wraps them with `.strict()`.
 */
import { z } from 'zod';

export const minorString = z.string().regex(/^-?\d+$/, 'integer minor units');
export const uuid = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTs = z.string().min(10);

export const SplitMode = z.enum(['equal', 'exact', 'percent', 'shares', 'adjust', 'itemised']);
export const SettlementMethod = z.enum(['upi', 'cash', 'bank', 'other']);
export const Template = z.enum(['beach', 'road', 'trek', 'wedding', 'offsite', 'other']);

const member = z.object({
  id: uuid,
  display_name: z.string().min(1).max(30),
  role: z.enum(['organiser', 'member']),
  joined_from: isoDate.nullable(),
});

export const TripCreate = z.object({
  name: z.string().min(1).max(60),
  start_date: isoDate.nullable(),
  end_date: isoDate.nullable(),
  base_currency: z.string().length(3),
  time_zone: z.string().min(1),
  template: Template,
  status: z.enum(['planning', 'active']),
  organiser_member_id: uuid,
  members: z.array(member).min(1),
  categories: z.array(
    z.object({ id: uuid, key: z.string(), label: z.string(), position: z.number().int() }),
  ),
});

export const TripUpdate = z
  .object({
    name: z.string().min(1).max(60),
    start_date: isoDate.nullable(),
    end_date: isoDate.nullable(),
    destination_name: z.string().max(80).nullable(),
    time_zone: z.string(),
    settle_mode: z.enum(['simplified', 'direct']),
    kitty_enabled: z.boolean(),
    kitty_low_bp: z.number().int().min(0).max(10000),
    kitty_target_minor: minorString.nullable(),
    kitty_holder_member_id: uuid,
    base_currency: z.string().length(3),
  })
  .partial();

export const TripTransition = z.object({ to: z.enum(['active', 'settling', 'reopen']) });
export const TripClose = z.object({});
export const TripRequestReopen = z.object({ note: z.string().max(200).optional() });

export const MemberAdd = member.omit({ role: true }).extend({ role: z.literal('member') });
export const MemberUpdate = z
  .object({ display_name: z.string().min(1).max(30), joined_from: isoDate.nullable() })
  .partial();
export const MemberRemove = z.object({});
export const MemberSetRole = z.object({ role: z.enum(['organiser', 'member']) });

const payer = z.object({ member_id: uuid, amount_minor: minorString, base_minor: minorString });
const share = z.object({ member_id: uuid, share_minor: minorString, base_minor: minorString });

/** The full money group (D-019) plus the non-money fields of a revision. */
export const ExpenseRevision = z.object({
  revision_id: uuid,
  amount_minor: minorString,
  currency: z.string().length(3),
  fx: z.object({
    rate: z.string(),
    source: z.enum(['same', 'daily', 'manual']),
    date: isoDate.nullable(),
  }),
  base_amount_minor: minorString,
  is_refund: z.boolean(),
  spent_at: isoTs,
  category_key: z.string().nullable(),
  description: z.string().max(120).nullable(),
  split_mode: SplitMode,
  split_input: z.record(z.string(), z.unknown()),
  paid_from_kitty: z.boolean(),
  payers: z.array(payer),
  shares: z.array(share).min(1),
  engine_version: z.string(),
});

export const ExpenseCreate = ExpenseRevision;
export const ExpenseEdit = ExpenseRevision.extend({ base_revision_id: uuid });
export const ExpenseDelete = z.object({ base_revision_id: uuid, revision_id: uuid });

export const SettlementCreate = z.object({
  from_member_id: uuid,
  to_member_id: uuid,
  amount_minor: minorString,
  method: SettlementMethod,
  note: z.string().max(200).nullable(),
});
export const SettlementVoid = z.object({ reason: z.string().max(200).nullable() });

export const KittyContribute = z.object({ member_id: uuid, amount_minor: minorString });
export const KittyVoid = z.object({});
export const KittyHandover = z.object({
  from_member_id: uuid,
  to_member_id: uuid,
  remaining_minor: minorString,
});

export const OP_PAYLOADS = {
  'trip.create': TripCreate,
  'trip.update': TripUpdate,
  'trip.transition': TripTransition,
  'trip.close': TripClose,
  'trip.request_reopen': TripRequestReopen,
  'member.add': MemberAdd,
  'member.update': MemberUpdate,
  'member.remove': MemberRemove,
  'member.set_role': MemberSetRole,
  'expense.create': ExpenseCreate,
  'expense.edit': ExpenseEdit,
  'expense.delete': ExpenseDelete,
  'settlement.create': SettlementCreate,
  'settlement.void': SettlementVoid,
  'kitty.contribute': KittyContribute,
  'kitty.void': KittyVoid,
  'kitty.handover': KittyHandover,
} as const;

export type OpType = keyof typeof OP_PAYLOADS;
export type OpPayload<T extends OpType> = z.infer<(typeof OP_PAYLOADS)[T]>;

/** The wire op (04 §2.1): `{ op_id, type, entity_id, payload, client_ts, v }`. */
export type Op<T extends OpType = OpType> = {
  readonly op_id: string;
  readonly type: T;
  readonly entity_id: string;
  readonly payload: OpPayload<T>;
  readonly client_ts: string;
  readonly v: 1;
};

/** Validates a payload before it enters the outbox; throws on a programming error. */
export function parsePayload<T extends OpType>(type: T, payload: unknown): OpPayload<T> {
  return OP_PAYLOADS[type].parse(payload) as OpPayload<T>;
}
