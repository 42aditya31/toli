// screens/trip-home.md (+ empty-trip.md): your balance, the kitty, everyone's balance, recent.
import {
  Banner,
  Button,
  Card,
  CardHeader,
  color,
  easing,
  Icon,
  Money,
  opacity,
  ProgressBar,
  Row,
  radius,
  Screen,
  size,
  space,
  Text,
  TicketCard,
  useMotion,
} from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTrip } from '../../state/trip.ts';
import { BalanceRow, Body, ExpenseRow, useTripId } from '../../ui/parts.tsx';
import { Gone, TripHeader, TripTabs } from './common.tsx';

export function TripHomeScreen() {
  const id = useTripId();
  const v = useTrip(id);
  if (!v) return <Gone />;
  const ccy = v.trip.base_currency;
  const mine = v.me ? (v.balances.trip[v.me.id] ?? 0n) : 0n;
  const go = (p: string) => router.push(`/trip/${v.trip.id}/${p}`);

  if (v.expenses.length === 0 && v.settlements.length === 0 && v.contributions.length === 0) {
    return (
      <Screen>
        <TripHeader v={v} />
        <EmptyTrip />
        <TripTabs v={v} active="trip" />
      </Screen>
    );
  }

  const heroLabel = v.settled
    ? "Everyone's square."
    : mine > 0n
      ? 'You are owed'
      : mine < 0n
        ? 'You owe'
        : "You're all square";
  const holderName = v.kitty.holder
    ? v.kitty.holder.id === v.me?.id
      ? 'you'
      : v.kitty.holder.display_name
    : '';
  const kittyFraction =
    v.kitty.putIn > 0n ? Number((v.kitty.cash * 1000n) / v.kitty.putIn) / 1000 : 0;

  return (
    <Screen>
      <TripHeader v={v} />
      <Body tabBar>
        {v.rejectedOps > 0 ? (
          <Banner
            tone="warning"
            action={
              <Button
                label="Review"
                variant="tonal"
                size="small"
                onPress={() => go('unresolved')}
              />
            }
          >
            {`${v.rejectedOps} ${v.rejectedOps === 1 ? "change couldn't" : "changes couldn't"} be saved.`}
          </Banner>
        ) : null}
        {v.settled ? (
          <Banner
            action={
              <Button
                label="Request reopen"
                variant="tonal"
                size="small"
                onPress={() => go('settings')}
              />
            }
          >
            This trip is settled. Reopen to edit.
          </Banner>
        ) : null}
        <TicketCard
          top={
            <View style={styles.heroTop}>
              <View style={styles.between}>
                <Text variant="bodyStrong" tone="onAccent">
                  {heroLabel}
                </Text>
                <Text variant="label" tone="onAccent" style={{ opacity: opacity.onAccentMuted }}>
                  LIVE
                </Text>
              </View>
              <Money
                variant="display"
                tone="onAccent"
                amount={v.settled ? 0n : mine < 0n ? -mine : mine}
                currency={ccy}
                countUp
                spokenPrefix={heroLabel}
              />
            </View>
          }
          bottom={
            <View style={styles.heroBottom}>
              <Text
                variant="caption"
                tone="onAccent"
                accessibilityLabel={`Group spent ${formatMoney(v.spent, ccy)}`}
              >
                Group spent{' '}
                <Text variant="captionStrong" tone="onAccent">
                  {formatMoney(v.spent, ccy)}
                </Text>
              </Text>
              <Button
                label={v.settled ? 'Settled' : 'Settle up →'}
                variant="onAccent"
                size="small"
                onPress={() => go('settle')}
              />
            </View>
          }
        />
        <Pressable
          onPress={() => go('kitty')}
          accessibilityRole="button"
          accessibilityLabel="Kitty"
        >
          <Card style={styles.kitty}>
            <View style={styles.between}>
              <Text variant="small" tone="muted">
                Kitty
              </Text>
              {v.kitty.on ? (
                v.kitty.low ? (
                  <View style={styles.flag}>
                    <Icon name="warning" size="s" tint={color.warning} />
                    <Text variant="label" tone="warning">
                      LOW
                    </Text>
                  </View>
                ) : (
                  <Text variant="label" tone="muted">
                    OK
                  </Text>
                )
              ) : null}
            </View>
            {v.kitty.on ? (
              <>
                <Text variant="header">
                  {formatMoney(v.kitty.cash > 0n ? v.kitty.cash : 0n, ccy)}{' '}
                  <Text variant="small" tone="muted">
                    left
                  </Text>
                </Text>
                <Text variant="micro" tone="muted">
                  {`Kitty cash with ${holderName}`}
                </Text>
                <ProgressBar fraction={kittyFraction} tone={v.kitty.low ? 'warning' : 'accent'} />
              </>
            ) : (
              <>
                <Text variant="header">Start a kitty</Text>
                <Text variant="micro" tone="muted">
                  Pool cash for fuel and snacks
                </Text>
              </>
            )}
          </Card>
        </Pressable>
        <Card>
          <CardHeader title="Balances" right="Tap to trace" />
          {v.active.map((m, i) => (
            <BalanceRow
              key={m.id}
              v={v}
              memberId={m.id}
              first={i === 0}
              onPress={() => go(`trace?m=${m.id}`)}
            />
          ))}
          {v.kitty.on ? (
            <Row
              leading={
                <View style={styles.kittyTile}>
                  <Text variant="mono">KT</Text>
                </View>
              }
              title={`Kitty cash with ${holderName}`}
              value={<Money variant="mono" amount={v.kitty.cash} currency={ccy} />}
              caption="in the pot"
              onPress={() => go('kitty')}
              accessibilityLabel={`Kitty cash with ${holderName}, ${formatMoney(v.kitty.cash, ccy)}`}
            />
          ) : null}
        </Card>
        {v.expenses.length > 0 ? (
          <Card>
            <CardHeader
              title="Recent"
              right={
                <Text
                  variant="small"
                  tone="accent"
                  onPress={() => go('expenses')}
                  accessibilityRole="link"
                >
                  See all
                </Text>
              }
            />
            {v.expenses.slice(0, 5).map((e, i) => (
              <ExpenseRow
                key={e.id}
                v={v}
                e={e}
                first={i === 0}
                onPress={() => go(`expense/${e.id}`)}
              />
            ))}
          </Card>
        ) : null}
      </Body>
      <TripTabs v={v} active="trip" />
    </Screen>
  );
}

function EmptyTrip() {
  const { reduced } = useMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduced)
      y.value = withRepeat(withTiming(1, { duration: 700, easing: easing('move') }), -1, true);
  }, [y, reduced]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: space.s8 * y.value }] }));
  const tips = [
    ['01', "Tap + and type the amount. That's all it needs."],
    ['02', 'Share the link so friends can see their balance, no install.'],
    ['03', "Start a kitty if you're pooling cash."],
  ] as const;
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyBox}>
        <Text variant="display" style={{ color: color.bg.raised }}>
          ₹0
        </Text>
        <Text variant="subhead">No expenses yet</Text>
        <Text variant="caption" tone="muted" style={styles.center}>
          The first ticket prints when someone pays for something.
        </Text>
      </View>
      <Card>
        {tips.map(([n, t], i) => (
          <View key={n} style={[styles.tip, i < tips.length - 1 && styles.tipDivider]}>
            <Text variant="mono" tone="accent">
              {n}
            </Text>
            <Text variant="body" style={styles.flex}>
              {t}
            </Text>
          </View>
        ))}
      </Card>
      <View style={styles.flex} />
      <Animated.View style={[styles.arrow, bounce]} accessible={false}>
        <Text variant="captionStrong" tone="accent">
          Add the first one
        </Text>
        <Text variant="header" tone="accent">
          ↓
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTop: {
    paddingTop: space.s18,
    paddingHorizontal: space.heroPad,
    paddingBottom: space.s16,
    gap: space.s4,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s12,
    paddingLeft: space.heroPad,
    paddingRight: space.s14,
  },
  kitty: { padding: space.s14, gap: space.s8 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  kittyTile: {
    width: space.s32 + space.s4,
    height: space.s32 + space.s4,
    borderRadius: radius.chip,
    backgroundColor: color.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: space.gutter,
    paddingTop: space.s4,
    paddingBottom: space.tabBarClearance,
    gap: space.s14,
  },
  emptyBox: {
    borderWidth: space.s2,
    borderStyle: 'dashed',
    borderColor: color.bg.raised,
    borderRadius: radius.card,
    paddingVertical: space.s28,
    paddingHorizontal: space.s20 + space.s2,
    alignItems: 'center',
    gap: space.s6,
  },
  tip: {
    flexDirection: 'row',
    gap: space.s12,
    alignItems: 'center',
    minHeight: space.s40 + space.s14,
  },
  tipDivider: { borderBottomWidth: size.hairline, borderBottomColor: color.divider },
  arrow: { alignItems: 'center', gap: space.s4 },
});
