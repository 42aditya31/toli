// screens/balance-trace.md — every line that adds up to a member's balance (07 §9).
// View: the trip view (D-022). Decisions win over 07 §9's example "Holding kitty leftovers"
// line, which only exists in the settle view; reported to the founder.
import {
  Card,
  Chip,
  color,
  Header,
  Money,
  Screen,
  size,
  space,
  Text,
  TicketCard,
} from '@toli/design-system';
import { explainBalance, formatMoney, type TraceLine } from '@toli/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { dayIn, timeIn } from '../../data/clock.ts';
import { type TripView, titleOf, useTrip } from '../../state/trip.ts';
import { Body, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

function describe(v: TripView, l: TraceLine): { t: string; sub: string } {
  const title = (id: string) => {
    const e = v.expenses.find((x) => x.id === id);
    return e
      ? titleOf(e.revision.description, v.categoryLabel(e.revision.category_id))
      : 'an expense';
  };
  const when = (id: string) => {
    const e = v.expenses.find((x) => x.id === id);
    if (!e) return '';
    const tz = v.trip.time_zone;
    const day = v.trip.start_date
      ? Math.round(
          (Date.parse(`${dayIn(tz, new Date(e.revision.spent_at))}T00:00:00Z`) -
            Date.parse(`${v.trip.start_date}T00:00:00Z`)) /
            86_400_000,
        ) + 1
      : null;
    return [day && day > 0 ? `Day ${day}` : null, timeIn(tz, e.revision.spent_at)]
      .filter(Boolean)
      .join(' · ');
  };
  const people = (id: string) =>
    `${v.expenses.find((x) => x.id === id)?.shares.length ?? 0} people`;
  switch (l.kind) {
    case 'paid':
      return { t: `Paid for ${title(l.expenseId)}`, sub: when(l.expenseId) };
    case 'share':
      return { t: `Share of ${title(l.expenseId)}`, sub: people(l.expenseId) };
    case 'refund_paid':
      return { t: `Refund received for ${title(l.expenseId)}`, sub: when(l.expenseId) };
    case 'refund_share':
      return { t: `Refund share of ${title(l.expenseId)}`, sub: people(l.expenseId) };
    case 'settlement_paid':
      return {
        t: `Paid ${v.name(l.counterparty)}`,
        sub:
          l.method === 'upi'
            ? 'UPI · confirmed by payer'
            : l.method === 'rounding'
              ? 'Rounding'
              : 'Marked as paid',
      };
    case 'settlement_received':
      return { t: `Received from ${v.name(l.counterparty)}`, sub: 'Settlement' };
    case 'kitty_contribution':
      return {
        t: 'Put into the kitty',
        sub: `Kitty · held by ${v.kitty.holder?.display_name ?? '—'}`,
      };
    case 'kitty_holding':
      return { t: 'Holding kitty leftovers', sub: 'Cash still in the pot' };
    case 'kitty_handover':
      return {
        t:
          l.amount >= 0n
            ? `Kitty cash handed to ${v.name(l.counterparty)}`
            : `Kitty cash from ${v.name(l.counterparty)}`,
        sub: 'Kitty',
      };
  }
}

const lineKey = (l: TraceLine) =>
  `${l.kind}:${'expenseId' in l ? l.expenseId : 'settlementId' in l ? l.settlementId : 'contributionId' in l ? l.contributionId : 'handoverId' in l ? l.handoverId : 'holding'}`;

export function BalanceTraceScreen() {
  const id = useTripId();
  const params = useLocalSearchParams<{ m?: string }>();
  const v = useTrip(id);
  const [picked, setPicked] = useState<string | null>(params.m ?? null);
  if (!v) return <Gone />;
  const memberId = picked ?? v.me?.id ?? v.active[0]?.id ?? '';
  const lines = explainBalance(v.ledger, memberId, 'trip');
  const net = v.balances.trip[memberId] ?? 0n;
  const ccy = v.trip.base_currency;
  const word = net > 0n ? 'gets back' : net < 0n ? 'owes' : 'is settled';
  const people = [...v.active].sort((a, b) => (a.id === v.me?.id ? -1 : b.id === v.me?.id ? 1 : 0));
  return (
    <Screen>
      <Header title="Balance trace" onBack={() => router.back()} />
      <Body gap={space.s14}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {people.map((m) => (
            <Chip
              key={m.id}
              label={m.display_name}
              height="tile"
              selected={m.id === memberId}
              onPress={() => setPicked(m.id)}
            />
          ))}
        </ScrollView>
        <TicketCard
          top={
            <View style={styles.net}>
              <Text variant="body" tone="onAccent">{`${v.name(memberId)} ${word}`}</Text>
              <Money
                variant="amountL"
                tone="onAccent"
                amount={net}
                currency={ccy}
                signed
                countUp
                spokenPrefix={`${v.name(memberId)} ${word}`}
              />
              <Text
                variant="small"
                tone="onAccent"
              >{`${lines.length} ${lines.length === 1 ? 'line adds' : 'lines add'} up to this number`}</Text>
            </View>
          }
        />
        <Card>
          {lines.length === 0 ? (
            <Text
              variant="body"
              tone="muted"
              style={styles.line}
            >{`Nothing involving ${v.name(memberId)} yet.`}</Text>
          ) : null}
          {lines.map((l, _i) => {
            const d = describe(v, l);
            return (
              <View key={lineKey(l)} style={[styles.line, styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="body">{d.t}</Text>
                  <Text variant="micro" tone="muted">
                    {d.sub}
                  </Text>
                </View>
                <Money variant="mono" amount={l.amount} currency={ccy} signed />
              </View>
            );
          })}
          <View style={styles.line}>
            <Text variant="bodyStrong" style={styles.flex}>
              Net
            </Text>
            <Text
              variant="monoL"
              tone="accent"
              accessibilityLabel={`Net ${formatMoney(net, ccy, { signed: true })}`}
            >
              {formatMoney(net, ccy, { signed: true })}
            </Text>
          </View>
        </Card>
        <Text variant="small" tone="muted">
          Plus means the group owes them. Minus means they owe the group. All balances on the trip
          add up to ₹0.
        </Text>
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: space.stackTight },
  net: { paddingVertical: space.s18, paddingHorizontal: space.heroPad, gap: space.s4 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: space.s40 + space.s12,
    paddingVertical: space.s6,
  },
  divider: { borderBottomWidth: size.hairline, borderBottomColor: color.divider },
});
