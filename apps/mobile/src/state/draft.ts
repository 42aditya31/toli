// The Add expense + Split editor draft (screens/add-expense, split-editor). UI state only (02 §2).
import { currencyExponent, distributeRemainder, type SplitSpec } from '@toli/engine';
import { create } from 'zustand';

/** R1a split modes (D-018): Equal (incl. selected-equal), Exact, Percent, Shares. */
export type Mode = 'equal' | 'exact' | 'percent' | 'shares';

export type Draft = {
  readonly tripId: string;
  readonly currency: string;
  /** Typed digits (D-013): whole major units for INR, a decimal string for decimal currencies. */
  readonly text: string;
  readonly description: string;
  readonly categoryId: string | null;
  /** Member → amount paid (minor). One entry = single payer. 'kitty' = paid from the kitty. */
  readonly payers: Readonly<Record<string, bigint>> | 'kitty';
  readonly mode: Mode;
  readonly included: Readonly<Record<string, boolean>>;
  /** Exact: minor units · Percent: basis points · Shares: weights. */
  readonly values: Readonly<Record<string, bigint>>;
  readonly editing: string | null;
  readonly spentAt: string | null;
  readonly touchedAt: number;
};

const pow = (e: number) => 10n ** BigInt(e);

/** Minor units from the typed text; 0 when empty. */
export function draftAmount(d: Pick<Draft, 'text' | 'currency'>): bigint {
  const e = currencyExponent(d.currency);
  if (!d.text) return 0n;
  const [whole = '0', frac = ''] = d.text.split('.');
  return BigInt(whole || '0') * pow(e) + BigInt((frac + '0'.repeat(e)).slice(0, e) || '0');
}

/** The keypad text for an amount (inverse of draftAmount): "1200", "12.50". */
export function amountText(amount: bigint, currency: string): string {
  const e = currencyExponent(currency);
  const unit = pow(e);
  const whole = amount / unit;
  const frac = amount % unit;
  return frac === 0n
    ? whole.toString()
    : `${whole}.${frac.toString().padStart(e, '0').replace(/0+$/, '')}`;
}

/** The payer map resolved against the current amount (a single payer always covers it all). */
export function resolvedPayers(d: Draft): Readonly<Record<string, bigint>> | 'kitty' {
  if (d.payers === 'kitty') return 'kitty';
  const keys = Object.keys(d.payers);
  if (keys.length === 1) return { [keys[0] as string]: draftAmount(d) };
  return d.payers;
}

export function includedIds(d: Draft): string[] {
  return Object.keys(d.included).filter((k) => d.included[k]);
}

/** The engine SplitSpec for the draft (07 §5). */
export function draftSpec(d: Draft): SplitSpec {
  const ids = includedIds(d);
  const pick = () => Object.fromEntries(ids.map((k) => [k, d.values[k] ?? 0n]));
  switch (d.mode) {
    case 'equal':
      return { mode: 'equal', participants: ids };
    case 'exact':
      return { mode: 'exact', values: pick() };
    case 'percent':
      return { mode: 'percent', values: pick() };
    case 'shares':
      return { mode: 'shares', values: pick() };
  }
}

/** Step per tap and starting values per mode (screens/split-editor table). */
export function stepFor(mode: Mode, currency: string): bigint {
  const unit = pow(currencyExponent(currency));
  return mode === 'exact' ? 100n * unit : mode === 'percent' ? 500n : 1n;
}

function startingValues(d: Draft, mode: Mode): Record<string, bigint> {
  const ids = includedIds(d);
  if (ids.length === 0) return {};
  if (mode === 'exact') return distributeRemainder(d.tripId, draftAmount(d), ids);
  if (mode === 'percent') {
    // Equal whole percents; the leftover % goes to the first people (split-editor table).
    const k = BigInt(ids.length);
    const each = 100n / k;
    const left = 100n - each * k;
    return Object.fromEntries(
      ids.map((id, i) => [id, (each + (BigInt(i) < left ? 1n : 0n)) * 100n]),
    );
  }
  return Object.fromEntries(ids.map((id) => [id, 1n]));
}

type DraftStore = {
  draft: Draft | null;
  start: (d: Omit<Draft, 'touchedAt'>) => void;
  patch: (p: Partial<Draft>) => void;
  setMode: (m: Mode) => void;
  toggle: (memberId: string) => void;
  step: (memberId: string, dir: 1 | -1) => void;
  distribute: (unassigned: bigint) => void;
  clear: () => void;
};

export const useDraft = create<DraftStore>((set, get) => ({
  draft: null,
  start: (d) => set({ draft: { ...d, touchedAt: Date.now() } }),
  patch: (p) => {
    const d = get().draft;
    if (d) set({ draft: { ...d, ...p, touchedAt: Date.now() } });
  },
  setMode: (mode) => {
    const d = get().draft;
    if (d) set({ draft: { ...d, mode, values: startingValues(d, mode), touchedAt: Date.now() } });
  },
  toggle: (id) => {
    const d = get().draft;
    if (!d) return;
    const included = { ...d.included, [id]: !d.included[id] };
    const next = { ...d, included };
    const values = { ...d.values };
    if (included[id] && values[id] === undefined) values[id] = d.mode === 'shares' ? 1n : 0n;
    set({ draft: { ...next, values, touchedAt: Date.now() } });
  },
  step: (id, dir) => {
    const d = get().draft;
    if (!d) return;
    const s = stepFor(d.mode, d.currency);
    const floor = d.mode === 'shares' ? 1n : 0n;
    const now = d.values[id] ?? floor;
    const next = now + BigInt(dir) * s;
    set({
      draft: {
        ...d,
        values: { ...d.values, [id]: next < floor ? floor : next },
        touchedAt: Date.now(),
      },
    });
  },
  distribute: (unassigned) => {
    const d = get().draft;
    if (!d || unassigned <= 0n) return;
    const add = distributeRemainder(`${d.tripId}:dist`, unassigned, includedIds(d));
    const values = { ...d.values };
    for (const [k, v] of Object.entries(add)) values[k] = (values[k] ?? 0n) + v;
    set({ draft: { ...d, values, touchedAt: Date.now() } });
  },
  clear: () => set({ draft: null }),
}));
