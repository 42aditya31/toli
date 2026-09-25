// screens/split-editor.md — R1a modes (D-018): Equal, Exact, Percent, Shares; multiple payers; kitty.
import {
  Avatar,
  Button,
  Card,
  Chip,
  color,
  Header,
  opacity,
  ProgressBar,
  radius,
  Screen,
  size,
  space,
  Text,
  useLayout,
} from '@toli/design-system';
import { computeShares, formatMoney } from '@toli/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  draftAmount,
  draftSpec,
  includedIds,
  type Mode,
  resolvedPayers,
  stepFor,
  useDraft,
} from '../../state/draft.ts';
import { useTrip } from '../../state/trip.ts';
import { useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const MODES: readonly { key: Mode; label: string; tag?: string }[] = [
  { key: 'equal', label: 'Equal' },
  { key: 'exact', label: 'Exact', tag: '₹' },
  { key: 'percent', label: 'Percent', tag: '%' },
  { key: 'shares', label: 'Shares', tag: '×' },
];

const HELP: Record<Mode, string> = {
  equal: 'Untick anyone who wasn’t there. The rest split it evenly.',
  exact: 'Type what each person owes. It has to add up to the total.',
  percent: 'Percentages have to reach 100%.',
  shares: 'A couple can count as 2 shares, singles as 1.',
};

export function SplitEditorScreen() {
  const id = useTripId();
  const { payers: openPayers } = useLocalSearchParams<{ payers?: string }>();
  const v = useTrip(id);
  const draft = useDraft((s) => s.draft);
  const { setMode, toggle, step, distribute, patch } = useDraft.getState();
  const { gutter } = useLayout();
  const [showPayers, setShowPayers] = useState(openPayers === '1');
  if (!v || !draft) return <Gone />;

  const ccy = draft.currency;
  const amount = draftAmount(draft);
  const ids = includedIds(draft);
  const r = amount > 0n ? computeShares(`draft-${draft.tripId}`, amount, draftSpec(draft)) : null;
  const shares = r?.ok ? r.shares : {};
  const payers = resolvedPayers(draft);
  const payerIds = payers === 'kitty' ? [] : Object.keys(payers);

  let status = 'Add an amount first';
  let good = false;
  let unassigned = 0n;
  if (amount > 0n && r) {
    if (r.ok) {
      status = `✓ All ${formatMoney(amount, ccy)} assigned`;
      good = true;
    } else if (r.error === 'no_participants') status = 'Pick at least one person';
    else {
      const diff = r.diff ?? 0n;
      const what = draft.mode === 'percent' ? `${Number(diff) / 100}%` : formatMoney(diff, ccy);
      status = r.error === 'unassigned' ? `${what} unassigned` : `${what} too much`;
      if (r.error === 'unassigned') unassigned = diff;
    }
  }
  const covered = payers === 'kitty' ? amount : Object.values(payers).reduce((a, b) => a + b, 0n);
  const payerStatus =
    payers === 'kitty'
      ? `Paid from the kitty · held by ${v.kitty.holder?.display_name ?? '—'}`
      : covered === amount
        ? `✓ ${formatMoney(amount, ccy)} covered · ${payerIds.length} ${payerIds.length === 1 ? 'payer' : 'payers'}`
        : covered < amount
          ? `${formatMoney(amount - covered, ccy)} not covered yet`
          : `${formatMoney(covered - amount, ccy)} more than the bill`;
  const subtitle =
    payers === 'kitty'
      ? 'Paid from the kitty'
      : payerIds.length > 1
        ? `Paid by ${payerIds.length} people`
        : `Paid by ${payerIds[0] === v.me?.id ? 'You' : v.name(payerIds[0] ?? '')}`;

  const setPayers = (next: Record<string, bigint> | 'kitty') => patch({ payers: next });
  const stepPayer = (m: string, dir: 1 | -1) => {
    if (payers === 'kitty') return;
    const unit = stepFor('exact', ccy);
    const now = payers[m] ?? 0n;
    const next = now + BigInt(dir) * unit;
    setPayers({ ...payers, [m]: next < 0n ? 0n : next });
  };
  const addPayer = (m: string) => {
    if (payers === 'kitty') return setPayers({ [m]: amount });
    const left = amount - covered;
    setPayers({ ...payers, [m]: left > 0n ? left : 0n });
  };

  return (
    <Screen>
      <Pressable
        onPress={() => setShowPayers((s) => !s)}
        accessibilityRole="button"
        accessibilityHint="Show or hide who paid"
      >
        <Header
          title={`Split ${formatMoney(amount, ccy)}`}
          subtitle={subtitle}
          onBack={() => router.back()}
        />
      </Pressable>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: gutter,
          gap: space.s10,
          paddingBottom: space.s12,
        }}
      >
        {showPayers ? (
          <View style={styles.group}>
            <Text variant="caption" tone="muted">
              Paid by
            </Text>
            {payers === 'kitty' ? (
              <Card radiusSize="cardS" style={styles.payer}>
                <Text variant="bodyStrong">{`Kitty · held by ${v.kitty.holder?.display_name ?? '—'}`}</Text>
                <Text variant="mono">{formatMoney(amount, ccy)}</Text>
              </Card>
            ) : (
              payerIds.map((m) => (
                <Card key={m} radiusSize="cardS" style={styles.payer}>
                  <View style={styles.rowLine}>
                    <Avatar initials={v.initialsOf(m)} />
                    <Text variant="bodyStrong" style={styles.flex}>
                      {m === v.me?.id ? 'You' : v.name(m)}
                    </Text>
                    <Text variant="monoL">{formatMoney(payers[m] ?? 0n, ccy)}</Text>
                  </View>
                  {payerIds.length > 1 ? (
                    <>
                      <ProgressBar
                        thick
                        fraction={
                          amount > 0n ? Number(((payers[m] ?? 0n) * 1000n) / amount) / 1000 : 0
                        }
                      />
                      <View style={styles.stepRow}>
                        <Button
                          label="−"
                          variant="tonal"
                          size="small"
                          onPress={() => stepPayer(m, -1)}
                          accessibilityLabel="Less"
                        />
                        <View style={styles.flex} />
                        <Button
                          label="Remove"
                          variant="ghost"
                          size="small"
                          onPress={() => {
                            const { [m]: _, ...rest } = payers;
                            setPayers(rest);
                          }}
                        />
                        <Button
                          label="+"
                          variant="tonal"
                          size="small"
                          onPress={() => stepPayer(m, 1)}
                          accessibilityLabel="More"
                        />
                      </View>
                    </>
                  ) : null}
                </Card>
              ))
            )}
            <View style={styles.chips}>
              {v.active
                .filter((m) => !payerIds.includes(m.id))
                .map((m) => (
                  <Chip
                    key={m.id}
                    label={`+ ${m.id === v.me?.id ? 'You' : m.display_name}`}
                    onPress={() => addPayer(m.id)}
                  />
                ))}
              {v.kitty.on && payers !== 'kitty' ? (
                <Chip label="Kitty" onPress={() => setPayers('kitty')} />
              ) : null}
            </View>
            <Text variant="bodyStrong" tone={covered === amount ? 'accent' : 'text'}>
              {payerStatus}
            </Text>
          </View>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {MODES.map((m) => (
            <Chip
              key={m.key}
              label={m.label}
              height="tile"
              selected={draft.mode === m.key}
              onPress={() => setMode(m.key)}
              {...(m.tag ? { tag: m.tag } : {})}
            />
          ))}
        </ScrollView>
        <Text variant="caption" tone="muted">
          {HELP[draft.mode]}
        </Text>
        {v.active.map((m) => {
          const on = !!draft.included[m.id];
          const value = draft.values[m.id] ?? 0n;
          const late = m.joined_from && m.joined_from > v.today;
          const shown =
            draft.mode === 'percent'
              ? `${Number(value) / 100}%`
              : draft.mode === 'shares'
                ? `${value} ${value === 1n ? 'share' : 'shares'}`
                : formatMoney(value, ccy);
          return (
            <Card
              key={m.id}
              radiusSize="cardS"
              style={[styles.person, !on && { opacity: opacity.disabled }]}
            >
              <View style={styles.rowLine}>
                <Pressable
                  onPress={() => toggle(m.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={m.id === v.me?.id ? 'You' : m.display_name}
                  hitSlop={space.s10}
                  style={[styles.check, on && { backgroundColor: color.accent }]}
                >
                  {on ? (
                    <Text variant="captionStrong" tone="onAccent">
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
                <Avatar initials={v.initialsOf(m.id)} />
                <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                  {m.id === v.me?.id ? 'You' : m.display_name}
                </Text>
                {late ? (
                  <View style={styles.late}>
                    <Text variant="labelS" tone="onAccent">
                      {`joined ${m.joined_from}`}
                    </Text>
                  </View>
                ) : null}
                <Text variant="monoL">{on ? formatMoney(shares[m.id] ?? 0n, ccy) : '—'}</Text>
              </View>
              {draft.mode !== 'equal' && on ? (
                <View style={styles.stepRow}>
                  <Button
                    label="−"
                    variant="tonal"
                    size="small"
                    onPress={() => step(m.id, -1)}
                    accessibilityLabel="Less"
                  />
                  <View style={styles.valueBox}>
                    <Text variant="mono">{shown}</Text>
                  </View>
                  <Button
                    label="+"
                    variant="tonal"
                    size="small"
                    onPress={() => step(m.id, 1)}
                    accessibilityLabel="More"
                  />
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { paddingHorizontal: gutter }]}>
        <View style={styles.status}>
          <Text variant="bodyStrong" tone={good ? 'accent' : 'text'} style={styles.flex}>
            {status}
          </Text>
          {unassigned > 0n &&
          (draft.mode === 'exact' || draft.mode === 'percent') &&
          ids.length > 0 ? (
            <Button
              label="Distribute equally"
              variant="tonal"
              size="small"
              onPress={() => distribute(unassigned)}
            />
          ) : null}
        </View>
        <Button label="Done" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space.s10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  payer: { padding: space.s14, gap: space.s10 },
  person: { paddingVertical: space.s12, paddingHorizontal: space.s14, gap: space.s10 },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  check: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: radius.badge,
    borderWidth: size.hairline + space.s2 / 4,
    borderColor: color.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  late: {
    backgroundColor: color.accent,
    borderRadius: radius.pill,
    paddingHorizontal: space.s8,
    paddingVertical: space.s2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    paddingLeft: space.s32 + space.s6,
  },
  valueBox: {
    flex: 1,
    height: size.buttonS,
    borderRadius: radius.chip,
    backgroundColor: color.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: space.s10,
    paddingBottom: space.s20 + space.s2,
    gap: space.s10,
    backgroundColor: color.bg.base,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.buttonS,
    paddingHorizontal: space.s4,
    gap: space.s8,
  },
});
