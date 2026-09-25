// screens/add-expense.md — amount first, 5 seconds, works offline. Save → tear overlay.
import { LIMITS } from '@toli/config';
import {
  AmountDisplay,
  Button,
  Chip,
  color,
  Header,
  Icon,
  Keypad,
  radius,
  Screen,
  Sheet,
  size,
  space,
  Text,
  useLayout,
  useToast,
} from '@toli/design-system';
import { computeShares, currencyExponent, formatMoney, spokenMoney } from '@toli/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { addExpense, CommandError, editExpense } from '../../commands/index.ts';
import { nowIso } from '../../data/clock.ts';
import {
  amountText,
  draftAmount,
  draftSpec,
  includedIds,
  resolvedPayers,
  useDraft,
} from '../../state/draft.ts';
import { useTear } from '../../state/tear.ts';
import { titleOf, useTrip } from '../../state/trip.ts';
import { Field, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const MODE_LABEL = {
  equal: 'Equal',
  exact: 'Exact',
  percent: 'Percent',
  shares: 'Shares',
} as const;
const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

/** Draft validity and the live per-person line (screens/add-expense). */
export function draftStatus() {
  const d = useDraft.getState().draft;
  if (!d) return { ok: false as const, amount: 0n, error: 'Type an amount first', per: '' };
  const amount = draftAmount(d);
  const ids = includedIds(d);
  if (amount === 0n)
    return {
      ok: false as const,
      amount,
      error: 'Type an amount first',
      per: 'Amount is the only thing you need',
    };
  const r = computeShares(`draft-${d.tripId}`, amount, draftSpec(d));
  const ccy = d.currency;
  if (!r.ok) {
    const pct = d.mode === 'percent';
    const diff = r.diff ?? 0n;
    const what = pct ? `${Number(diff) / 100}%` : formatMoney(diff, ccy);
    const error =
      r.error === 'unassigned'
        ? `${what} still unassigned`
        : r.error === 'too_much'
          ? `${what} too much`
          : 'Pick at least one person';
    return { ok: false as const, amount, error, per: 'Split needs fixing' };
  }
  const payers = resolvedPayers(d);
  if (payers !== 'kitty') {
    const covered = Object.values(payers).reduce((a, b) => a + b, 0n);
    if (covered < amount)
      return {
        ok: false as const,
        amount,
        error: `${formatMoney(amount - covered, ccy)} not covered yet`,
        per: 'Split needs fixing',
      };
    if (covered > amount)
      return {
        ok: false as const,
        amount,
        error: `${formatMoney(covered - amount, ccy)} more than the bill`,
        per: 'Split needs fixing',
      };
  }
  // "₹300 each" is the smallest allocate() share: money is never divided outside the engine (07 §3).
  const smallest = Object.values(r.shares).reduce((a, b) => (b < a ? b : a), amount);
  const per =
    d.mode === 'equal'
      ? `${formatMoney(smallest, ccy)} each · ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`
      : `Split ${ids.length} ways · ${MODE_LABEL[d.mode]}`;
  return { ok: true as const, amount, error: '', per };
}

export function AddExpenseScreen() {
  const id = useTripId();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const v = useTrip(id);
  const draft = useDraft((s) => s.draft);
  const { start, patch } = useDraft.getState();
  const toast = useToast();
  const play = useTear((s) => s.play);
  const { gutter } = useLayout();
  const [dup, setDup] = useState<string | null>(null);

  // Start (or resume, within 10 minutes) a draft for this trip (screens/add-expense).
  // biome-ignore lint/correctness/useExhaustiveDependencies: start once per trip / edit target
  useEffect(() => {
    if (!v) return;
    const d = useDraft.getState().draft;
    const fresh =
      d &&
      d.tripId === v.trip.id &&
      !d.editing &&
      !edit &&
      Date.now() - d.touchedAt < LIMITS.draftKeepMinutes * 60_000;
    if (fresh) return;
    const e = edit ? v.expenses.find((x) => x.id === edit) : undefined;
    const everyone = Object.fromEntries(
      v.active.map((m) => [m.id, !m.joined_from || m.joined_from <= v.today]),
    );
    if (e) {
      const input = JSON.parse(e.revision.split_input) as Record<string, unknown>;
      const mode = (
        ['exact', 'percent', 'shares'].includes(e.revision.split_mode)
          ? e.revision.split_mode
          : 'equal'
      ) as 'equal' | 'exact' | 'percent' | 'shares';
      const raw = (input.amounts ?? input.bp ?? input.weights ?? {}) as Record<string, string>;
      start({
        tripId: v.trip.id,
        currency: e.revision.currency,
        text: amountText(e.amount, e.revision.currency),
        description: e.revision.description ?? '',
        categoryId: e.revision.category_id,
        payers: e.revision.paid_from_kitty
          ? 'kitty'
          : Object.fromEntries(e.payers.map((p) => [p.memberId, p.amount as bigint])),
        mode,
        included: Object.fromEntries(
          v.active.map((m) => [m.id, e.shares.some((s) => s.memberId === m.id)]),
        ),
        values: Object.fromEntries(Object.entries(raw).map(([k, x]) => [k, BigInt(x)])),
        editing: e.id,
        spentAt: e.revision.spent_at,
      });
      return;
    }
    start({
      tripId: v.trip.id,
      currency: v.trip.base_currency,
      text: '',
      description: '',
      categoryId: null,
      payers: v.me ? { [v.me.id]: 0n } : {},
      mode: 'equal',
      included: everyone,
      values: {},
      editing: null,
      spentAt: null,
    });
  }, [v?.trip.id, edit]);

  const status = useMemo(() => (v && draft ? draftStatus() : null), [v, draft]);
  if (!v || !draft || draft.tripId !== v.trip.id || !status) return <Gone />;
  if (v.settled) {
    return (
      <Screen>
        <Header title="Add expense" onBack={() => router.back()} />
        <Text variant="body" tone="muted" style={{ paddingHorizontal: gutter }}>
          This trip is settled. Reopen to edit.
        </Text>
      </Screen>
    );
  }

  const ccy = draft.currency;
  const decimal = currencyExponent(ccy) > 0 && ccy !== 'INR';
  const last = v.expenses[0];
  const lastTitle = last
    ? titleOf(last.revision.description, v.categoryLabel(last.revision.category_id))
    : '';
  const payers = resolvedPayers(draft);
  const payerIds = payers === 'kitty' ? [] : Object.keys(payers);
  const payerLabel =
    payers === 'kitty'
      ? 'Kitty'
      : payerIds.length > 1
        ? `${payerIds.length} payers`
        : payerIds[0] === v.me?.id
          ? 'You'
          : v.name(payerIds[0] ?? '');
  const included = includedIds(draft);

  const press = (k: string) => {
    const t = draft.text;
    let next: string;
    if (k === '⌫') next = t.slice(0, -1);
    else if (k === '.') next = t.includes('.') ? t : `${t || '0'}.`;
    else next = `${t}${k}`.replace(/^0+(?=\d)/, '');
    const [whole = '', frac] = next.split('.');
    if (whole.length > LIMITS.amountDigits) return;
    if (frac !== undefined && frac.length > currencyExponent(ccy)) return;
    if (next === '0' || next === '00') next = '';
    patch({ text: next });
  };

  const cyclePayer = () => {
    const order = [
      ...v.active.filter((m) => m.id === v.me?.id),
      ...v.active.filter((m) => m.id !== v.me?.id),
    ].map((m) => m.id);
    const stops: (string | 'kitty')[] = [...order, ...(v.kitty.on ? ['kitty' as const] : [])];
    const current = payers === 'kitty' ? 'kitty' : payerIds.length === 1 ? payerIds[0] : undefined;
    const i = current ? stops.indexOf(current) : -1;
    const next = stops[(i + 1) % stops.length] ?? order[0];
    patch({ payers: next === 'kitty' ? 'kitty' : { [next as string]: 0n } });
  };

  const repeat = () => {
    if (!last) return;
    patch({
      text: amountText(last.baseAmount, ccy),
      description: last.revision.description ?? '',
      categoryId: last.revision.category_id,
      included: Object.fromEntries(
        v.active.map((m) => [m.id, last.shares.some((s) => s.memberId === m.id)]),
      ),
      mode: 'equal',
      values: {},
    });
  };

  const save = (force: boolean) => {
    if (!status.ok) return toast(status.error);
    const d = useDraft.getState().draft;
    if (!d || !v.me) return;
    const spentAt = d.spentAt ?? nowIso();
    if (!force && !d.editing && payers !== 'kitty') {
      const cutoff = Date.now() - LIMITS.duplicateWindowMinutes * 60_000;
      const twin = v.expenses.find(
        (e) =>
          e.baseAmount === status.amount &&
          e.createdByMemberId !== v.me?.id &&
          Date.parse(e.revision.spent_at) >= cutoff,
      );
      if (twin) {
        setDup(
          `${v.name(twin.createdByMemberId)} already logged ${formatMoney(twin.baseAmount, ccy)} for “${titleOf(twin.revision.description, v.categoryLabel(twin.revision.category_id))}” today. Two people logging the same bill is common.`,
        );
        return;
      }
    }
    const input = {
      amount: status.amount,
      currency: d.currency,
      description: d.description,
      categoryId: d.categoryId,
      spentAt,
      payers,
      split: draftSpec(d),
    };
    try {
      if (d.editing) {
        editExpense(v, d.editing, input);
        useDraft.getState().clear();
        router.back();
        return toast('Saved');
      }
      const expenseId = addExpense(v, v.me.id, input);
      useDraft.getState().clear();
      router.replace(`/trip/${v.trip.id}`);
      if (payers === 'kitty')
        return toast(`${formatMoney(status.amount, ccy)} paid from the kitty`);
      const computed = computeShares(expenseId, status.amount, draftSpec(d));
      const shares = computed.ok ? computed.shares : {};
      const pieces = Object.entries(shares)
        .filter(([m, s]) => !payerIds.includes(m) && s > 0n)
        .map(([m, s]) => ({
          name: v.name(m),
          initials: v.initialsOf(m),
          amount: formatMoney(s, ccy),
        }));
      if (pieces.length === 0) return toast('Saved');
      const title = d.description.trim() || v.categoryLabel(d.categoryId);
      play({
        label: 'New expense',
        tripName: v.trip.name,
        title,
        amount: formatMoney(status.amount, ccy),
        sub: `${payerLabel === 'You' ? 'You' : payerLabel} paid · split ${included.length} ways`,
        pieces,
        onDone: () => toast("Saved · sending when you're online"),
      });
    } catch (e) {
      toast(e instanceof CommandError ? e.message : "Couldn't save. Try again.");
    }
  };

  const digits = draft.text
    ? `${formatMoney(BigInt(draft.text.split('.')[0] || '0') * 10n ** BigInt(currencyExponent(ccy)), ccy).replace(/^[^\d]+/, '')}${draft.text.includes('.') ? `.${draft.text.split('.')[1] ?? ''}` : ''}`
    : '';

  return (
    <Screen>
      <Header
        title={draft.editing ? 'Edit expense' : 'Add expense'}
        onBack={() => router.back()}
        right={
          draft.editing ? undefined : (
            <Pressable
              onPress={repeat}
              style={styles.repeat}
              accessibilityRole="button"
              accessibilityLabel="Repeat last expense"
            >
              <Icon name="repeat" size="s" tint={color.textMuted} />
              <Text variant="small" tone="muted" numberOfLines={1}>
                {last
                  ? `${lastTitle.split(' ')[0]} ${formatMoney(last.baseAmount, ccy)}`
                  : 'Repeat'}
              </Text>
            </Pressable>
          )
        }
      />
      <View style={styles.amount}>
        <AmountDisplay
          symbol={SYMBOL[ccy] ?? ccy}
          digits={digits}
          spoken={spokenMoney(status.amount, ccy)}
        />
        <Text variant="monoS" tone="accent">
          {status.per}
        </Text>
      </View>
      <View style={[styles.fields, { paddingHorizontal: gutter }]}>
        <Field
          value={draft.description}
          onChangeText={(t) => patch({ description: t })}
          placeholder="What for? (optional)"
          maxLength={LIMITS.descriptionChars}
          style={styles.title}
          accessibilityLabel="What for, optional"
        />
        <View style={styles.tiles}>
          <Pressable
            onPress={cyclePayer}
            onLongPress={() => router.push(`/trip/${v.trip.id}/split?payers=1`)}
            style={[styles.tile, styles.flex1]}
            accessibilityRole="button"
            accessibilityLabel={`Paid by ${payerLabel}. Tap to change, long press for several payers`}
          >
            <Text variant="labelS" tone="muted">
              PAID BY
            </Text>
            <Text variant="captionStrong" numberOfLines={1}>
              {payerLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/trip/${v.trip.id}/split`)}
            style={[styles.tile, styles.flex13]}
            accessibilityRole="button"
            accessibilityLabel={`Split, ${MODE_LABEL[draft.mode]}, ${included.length} people`}
          >
            <Text variant="labelS" tone="muted">
              SPLIT
            </Text>
            <Text variant="captionStrong">{`${MODE_LABEL[draft.mode]} · ${included.length} ›`}</Text>
          </Pressable>
          <Pressable
            onPress={() => toast('Receipt photos arrive with the online backend.')}
            style={[styles.tile, styles.bill]}
            accessibilityRole="button"
            accessibilityLabel="Attach a bill photo"
          >
            <Text variant="labelS" tone="muted">
              BILL
            </Text>
            <Text variant="captionStrong">Scan</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cats}
        >
          {v.categories.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              selected={draft.categoryId === c.id}
              onPress={() => patch({ categoryId: draft.categoryId === c.id ? null : c.id })}
            />
          ))}
        </ScrollView>
      </View>
      <View style={[styles.keypad, { paddingHorizontal: gutter }]}>
        <Keypad onKey={press} decimal={decimal} />
      </View>
      <View style={[styles.footer, { paddingHorizontal: gutter }]}>
        <Button
          label={draft.editing ? 'Save changes' : 'Save & tear stubs'}
          {...(draft.editing ? {} : { icon: 'tear' as const })}
          disabled={!status.ok}
          onPress={() => save(false)}
        />
      </View>
      <Sheet visible={dup !== null} onClose={() => setDup(null)} title="Already logged?">
        <Text variant="body" tone="muted">
          {dup}
        </Text>
        <View style={styles.tiles}>
          <Button
            label="Same one, skip"
            size="large"
            flex={1}
            onPress={() => {
              setDup(null);
              useDraft.getState().clear();
              router.replace(`/trip/${v.trip.id}`);
              toast('Skipped the duplicate');
            }}
          />
          <Button
            label="Save anyway"
            variant="danger"
            size="large"
            flex={1}
            onPress={() => {
              setDup(null);
              save(true);
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex13: { flex: 1.3 },
  repeat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    height: size.buttonS,
    paddingHorizontal: space.s12,
    borderRadius: radius.chip,
    backgroundColor: color.bg.card,
    maxWidth: space.s40 * 4,
  },
  amount: { alignItems: 'center', gap: space.s4, paddingTop: space.s18, paddingBottom: space.s6 },
  fields: { gap: space.stackTight, paddingVertical: space.s6 },
  title: {
    textAlign: 'center',
    backgroundColor: color.bg.card,
    height: space.s40,
    borderRadius: radius.chip,
  },
  tiles: { flexDirection: 'row', gap: space.stackTight },
  tile: {
    height: size.buttonM,
    borderRadius: radius.control,
    backgroundColor: color.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s6,
  },
  bill: { width: size.cta },
  cats: { gap: space.s6 },
  keypad: { flex: 1, paddingTop: space.s6 },
  footer: { paddingTop: space.s10, paddingBottom: space.s20 + space.s2 },
});
