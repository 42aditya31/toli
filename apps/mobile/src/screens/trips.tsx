// screens/trips-list.md — "Your trips": the live trip as a lime ticket with your balance.
import {
  Button,
  Card,
  color,
  Header,
  IconButton,
  Money,
  opacity,
  radius,
  Screen,
  Stamp,
  space,
  Text,
  TicketCard,
} from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { dateRange } from '../data/clock.ts';
import { listTrips, loadTrip } from '../data/repo.ts';
import { useLive } from '../state/live.ts';
import { buildTripView, type TripView } from '../state/trip.ts';
import { Body, SavedOnPhone } from '../ui/parts.tsx';

const ORDER = ['active', 'settling', 'planning', 'settled', 'archived'];

export function TripsScreen() {
  const trips = useLive(
    () =>
      listTrips()
        .flatMap((t) => {
          const d = loadTrip(t.id);
          return d ? [buildTripView(d)] : [];
        })
        .sort((a, b) => ORDER.indexOf(a.trip.status) - ORDER.indexOf(b.trip.status)),
    [],
  );
  return (
    <Screen>
      <Header
        title="Your trips"
        large
        right={
          <View style={styles.row}>
            <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
            <Button
              label="+ New"
              variant="tonal"
              size="medium"
              onPress={() => router.push('/create-trip')}
            />
          </View>
        }
      />
      <Body gap={space.s14}>
        {trips.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="subhead">No trips yet</Text>
            <Text variant="caption" tone="muted" style={styles.center}>
              Start one, or join a friend's with a link or code.
            </Text>
            <Button label="Start a trip" onPress={() => router.push('/create-trip')} />
            <Button
              label="I have an invite link"
              variant="ghost"
              size="medium"
              onPress={() => router.push('/join')}
            />
          </View>
        ) : (
          trips.map((v) => <TripCard key={v.trip.id} v={v} />)
        )}
        {trips.length > 0 ? (
          <Button
            label="Join a trip"
            variant="ghost"
            size="medium"
            onPress={() => router.push('/join')}
          />
        ) : null}
      </Body>
    </Screen>
  );
}

function TripCard({ v }: { readonly v: TripView }) {
  const t = v.trip;
  const open = () => router.push(`/trip/${t.id}`);
  const dates = dateRange(t.start_date, t.end_date);
  const people = v.active.length;
  const count = v.expenses.length;
  const ccy = t.base_currency;
  if (t.status === 'active' || t.status === 'settling') {
    const mine = v.me ? (v.balances.trip[v.me.id] ?? 0n) : 0n;
    const label =
      t.status === 'settling'
        ? 'SETTLING UP'
        : v.day
          ? `ACTIVE · DAY ${v.day.day} OF ${v.day.of}`
          : 'ACTIVE';
    const hero = mine > 0n ? 'You get back' : mine < 0n ? 'You owe' : "You're all square";
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${t.name}, ${label.toLowerCase()}, ${people} people, ${count} expenses`}
      >
        <TicketCard
          variant="trip"
          top={
            <View style={styles.cardTop}>
              <View style={styles.between}>
                <Text variant="label" tone="onAccent">
                  {label}
                </Text>
                {t.destination_name ? (
                  <Text variant="label" tone="onAccent">
                    {t.destination_name}
                  </Text>
                ) : null}
              </View>
              <Text variant="title" tone="onAccent" numberOfLines={1}>
                {t.name}
              </Text>
              <Text variant="caption" tone="onAccent" style={{ opacity: opacity.onAccentSub }}>
                {[
                  dates,
                  `${people} ${people === 1 ? 'person' : 'people'}`,
                  `${count} ${count === 1 ? 'expense' : 'expenses'}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {v.pendingOps > 0 ? (
                <Text variant="label" tone="onAccent" style={{ opacity: opacity.onAccentMuted }}>
                  SAVED ON PHONE · WILL SYNC
                </Text>
              ) : null}
            </View>
          }
          bottom={
            <View style={styles.cardBottom}>
              <Text variant="body" tone="onAccent">
                {hero}
              </Text>
              <Money
                variant="amountS"
                tone="onAccent"
                amount={mine < 0n ? -mine : mine}
                currency={ccy}
                spokenPrefix={hero}
              />
            </View>
          }
        />
      </Pressable>
    );
  }
  const settled = t.status === 'settled' || t.status === 'archived';
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${t.name}, ${t.status}`}
    >
      <Card style={styles.dark}>
        <Text variant="label" tone="muted">
          {t.status.toUpperCase()}
        </Text>
        <Text variant="header" numberOfLines={1}>
          {t.name}
        </Text>
        <Text variant="caption" tone="muted">
          {[dates, `${people} people`, settled ? `${formatMoney(v.spent, ccy)} spent` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {v.pendingOps > 0 ? <SavedOnPhone /> : null}
        {settled ? (
          <View style={styles.stamp}>
            <Stamp label="SETTLED" tone="muted" animate={false} />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.stackTight, alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  center: { textAlign: 'center' },
  empty: {
    borderWidth: space.s2,
    borderStyle: 'dashed',
    borderColor: color.bg.raised,
    borderRadius: radius.card,
    padding: space.s24,
    gap: space.s10,
    alignItems: 'stretch',
  },
  cardTop: { paddingVertical: space.s18, paddingHorizontal: space.heroPad, gap: space.s6 },
  cardBottom: {
    paddingVertical: space.s14,
    paddingHorizontal: space.heroPad,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dark: { paddingVertical: space.s18, paddingHorizontal: space.heroPad, gap: space.s6 },
  stamp: { position: 'absolute', right: space.s18, top: space.s24 + space.s2 },
});
