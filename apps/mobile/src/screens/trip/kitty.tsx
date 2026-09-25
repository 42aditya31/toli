// screens/kitty.md — the common pot (trip view, D-022): ring, who put in (+ implied refunds),
// paid from the pot, start, add money and hand over. The top-up maths UI is R1b (D-018).
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Chip,
  color,
  Header,
  Money,
  ProgressBar,
  Ring,
  Row,
  Screen,
  Sheet,
  size,
  space,
  Text,
  useToast,
} from '@toli/design-system';
import { formatMoney, parseMajor } from '@toli/engine';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CommandError, contribute, handoverKitty, startKitty } from '../../commands/index.ts';
import { titleOf, useTrip } from '../../state/trip.ts';
import { Body, Field, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

export function KittyScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const toast = useToast();
  const [sheet, setSheet] = useState<'start' | 'add' | 'handover' | null>(null);
  const [holder, setHolder] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [text, setText] = useState('');
  if (!v) return <Gone />;
  const ccy = v.trip.base_currency;
  const k = v.kitty;
  const holderName = k.holder ? (k.holder.id === v.me?.id ? 'you' : k.holder.display_name) : '—';
  const per: Record<string, bigint> = {};
  for (const c of v.contributions)
    if (!c.voided) per[c.memberId] = (per[c.memberId] ?? 0n) + c.amount;
  const maxIn = Object.values(per).reduce((a, b) => (b > a ? b : a), 0n);
  const spends = v.expenses.filter((e) => e.revision.paid_from_kitty);
  const leftPct = k.putIn > 0n ? Number((k.cash * 100n) / k.putIn) : 0;
  const amount = parseMajor(text, ccy) ?? 0n;

  const run = (fn: () => void, msg: string) => {
    try {
      fn();
      setSheet(null);
      setText('');
      toast(msg);
    } catch (e) {
      toast(e instanceof CommandError ? e.message : "Couldn't save. Try again.");
    }
  };

  return (
    <Screen>
      <Header
        title="Kitty"
        subtitle={k.on ? `The common pot · held by ${holderName}` : 'The common pot'}
        onBack={() => router.back()}
      />
      <Body gap={space.s14}>
        {!k.on ? (
          <Card style={styles.ring}>
            <Ring fraction={0}>
              <Text variant="amountS">{formatMoney(0n, ccy)}</Text>
              <Text variant="micro" tone="muted">
                remaining
              </Text>
            </Ring>
            <View style={styles.flex}>
              <Text variant="bodyStrong">No kitty on this trip</Text>
              <Button label="Start a kitty" size="medium" onPress={() => setSheet('start')} />
            </View>
          </Card>
        ) : (
          <>
            <Card style={styles.ring}>
              <Ring fraction={k.putIn > 0n ? leftPct / 100 : 0} warning={k.low}>
                <Money
                  variant="amountS"
                  amount={k.cash > 0n ? k.cash : 0n}
                  currency={ccy}
                  spokenPrefix="Remaining"
                />
                <Text variant="micro" tone="muted">
                  remaining
                </Text>
              </Ring>
              <View style={styles.stats}>
                <Stat label="Put in" value={formatMoney(k.putIn, ccy)} />
                <Stat label="Spent from pot" value={formatMoney(k.spent, ccy)} />
                <Stat label="Left" value={`${Math.max(0, leftPct)}%`} />
              </View>
            </Card>
            {k.cash < 0n ? (
              <Banner tone="warning">{`Kitty is ${formatMoney(-k.cash, ccy)} short — ${holderName} covered it`}</Banner>
            ) : k.low ? (
              <Banner tone="warning">{`Running low: ${Math.max(0, leftPct)}% left`}</Banner>
            ) : null}
            <View style={styles.row}>
              <Button
                label="Add money"
                variant="tonal"
                size="medium"
                flex={1}
                onPress={() => setSheet('add')}
              />
              {v.isOrganiser || k.holder?.id === v.me?.id ? (
                <Button
                  label="Hand over"
                  variant="tonal"
                  size="medium"
                  flex={1}
                  onPress={() => setSheet('handover')}
                />
              ) : null}
            </View>
            <Card>
              <CardHeader title="Who put in" right="Refund at settle-up" />
              {v.active.map((m, i) => (
                <View key={m.id} style={[styles.person, i > 0 && styles.divider]}>
                  <View style={styles.between}>
                    <Text variant="bodyStrong">{m.display_name}</Text>
                    <Text variant="mono">
                      {formatMoney(per[m.id] ?? 0n, ccy)}{' '}
                      <Text
                        variant="mono"
                        tone="muted"
                      >{`→ ${formatMoney(k.refunds[m.id] ?? 0n, ccy)}`}</Text>
                    </Text>
                  </View>
                  <ProgressBar
                    fraction={maxIn > 0n ? Number(((per[m.id] ?? 0n) * 1000n) / maxIn) / 1000 : 0}
                  />
                </View>
              ))}
            </Card>
            <Card>
              <CardHeader title="Paid from the pot" />
              {spends.length === 0 ? (
                <Text variant="caption" tone="muted" style={styles.person}>
                  Nothing yet. Pick Kitty as the payer when you add an expense.
                </Text>
              ) : (
                spends.map((e, i) => (
                  <Row
                    key={e.id}
                    first={i === 0}
                    title={titleOf(e.revision.description, v.categoryLabel(e.revision.category_id))}
                    value={<Money variant="mono" amount={e.baseAmount} currency={ccy} />}
                    onPress={() => router.push(`/trip/${v.trip.id}/expense/${e.id}`)}
                  />
                ))
              )}
            </Card>
          </>
        )}
        <Text variant="small" tone="muted">
          Toli only keeps count. The cash stays with whoever holds the pot. Leftovers are returned
          in proportion to what each person put in.
        </Text>
      </Body>

      <Sheet visible={sheet === 'start'} onClose={() => setSheet(null)} title="Who holds the cash?">
        <View style={styles.chips}>
          {v.active.map((m) => (
            <Chip
              key={m.id}
              label={m.display_name}
              selected={holder === m.id}
              onPress={() => setHolder(m.id)}
            />
          ))}
        </View>
        <Field
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="Log everyone's share now (optional), e.g. 5000"
        />
        <Button
          label="Start kitty"
          disabled={!holder}
          onPress={() =>
            holder && run(() => startKitty(v, holder, amount > 0n ? amount : null), 'Kitty started')
          }
        />
      </Sheet>

      <Sheet visible={sheet === 'add'} onClose={() => setSheet(null)} title="Put into the kitty">
        <View style={styles.chips}>
          {v.active.map((m) => (
            <Chip
              key={m.id}
              label={m.display_name}
              selected={who === m.id}
              onPress={() => setWho(m.id)}
            />
          ))}
          <Chip label="Everyone" selected={who === '*'} onPress={() => setWho('*')} />
        </View>
        <Field
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="Amount"
          autoFocus
        />
        <Button
          label={
            amount > 0n ? `Log ${formatMoney(amount, ccy)}${who === '*' ? ' each' : ''}` : 'Log'
          }
          disabled={!who || amount <= 0n}
          onPress={() =>
            who &&
            run(
              () =>
                contribute(
                  v,
                  (who === '*' ? v.active.map((m) => m.id) : [who]).map((memberId) => ({
                    memberId,
                    amount,
                  })),
                ),
              who === '*'
                ? `Top-up logged · ${formatMoney(amount, ccy)} from each person`
                : 'Logged',
            )
          }
        />
      </Sheet>

      <Sheet
        visible={sheet === 'handover'}
        onClose={() => setSheet(null)}
        title="Hand over the kitty cash"
      >
        <Text
          variant="body"
          tone="muted"
        >{`${formatMoney(k.cash, ccy)} goes from ${holderName} to:`}</Text>
        <View style={styles.chips}>
          {v.active
            .filter((m) => m.id !== k.holder?.id)
            .map((m) => (
              <Chip
                key={m.id}
                label={m.display_name}
                selected={who === m.id}
                onPress={() => setWho(m.id)}
              />
            ))}
        </View>
        <Button
          label="Hand over"
          disabled={!who || !k.holder}
          onPress={() =>
            who &&
            k.holder &&
            run(
              () => handoverKitty(v, k.holder?.id ?? '', who, k.cash),
              `Kitty cash handed to ${v.name(who)} · ${formatMoney(k.cash, ccy)}`,
            )
          }
        />
      </Sheet>
    </Screen>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View>
      <Text variant="micro" tone="muted">
        {label}
      </Text>
      <Text variant="monoL">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space.s10 },
  ring: { flexDirection: 'row', alignItems: 'center', gap: space.s18, padding: space.s20 },
  stats: { gap: space.s10 },
  row: { flexDirection: 'row', gap: space.stackTight },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  person: { paddingVertical: space.s8, gap: space.s6 },
  divider: { borderTopWidth: size.hairline, borderTopColor: color.divider },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.stackTight },
});
