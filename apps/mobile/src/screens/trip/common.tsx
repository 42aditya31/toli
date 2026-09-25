// Shared bits for the trip screens: the header, the R1a tab bar and the "no trip" guard.
import { Button, Header, IconButton, space, TabBar, useToast } from '@toli/design-system';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { dateRange } from '../../data/clock.ts';
import type { TripView } from '../../state/trip.ts';

export function tripSubtitle(v: TripView): string {
  const dates = dateRange(v.trip.start_date, v.trip.end_date);
  const day = v.day ? `Day ${v.day.day} of ${v.day.of}` : null;
  return [dates, day].filter(Boolean).join(' · ') || `${v.active.length} people`;
}

export function TripHeader({
  v,
  back = '/trips',
}: {
  readonly v: TripView;
  readonly back?: '/trips' | 'pop';
}) {
  const toast = useToast();
  return (
    <Header
      title={v.trip.name}
      subtitle={tripSubtitle(v)}
      onBack={() => (back === 'pop' ? router.back() : router.replace('/trips'))}
      right={
        <View style={styles.row}>
          <Button
            label="Invite"
            variant="tonal"
            size="medium"
            onPress={() => toast('Connect to the internet to share the invite link')}
          />
          <IconButton
            name="more"
            label="Trip settings"
            onPress={() => router.push(`/trip/${v.trip.id}/settings`)}
          />
        </View>
      }
    />
  );
}

const TABS = [
  { key: 'trip', label: 'Trip' },
  { key: 'members', label: 'Members' },
] as const;

/** R1a/R1b tab bar: Trip · (+) · Members (13 §6, OQ-P11). Tabs crossfade (13 §7.4). */
export function TripTabs({
  v,
  active,
}: {
  readonly v: TripView;
  readonly active: 'trip' | 'members';
}) {
  return (
    <TabBar
      tabs={TABS}
      active={active}
      hideAdd={v.settled}
      onTab={(k) => {
        if (k === active) return;
        router.replace(k === 'trip' ? `/trip/${v.trip.id}` : `/trip/${v.trip.id}/members`);
      }}
      onAdd={() => router.push(`/trip/${v.trip.id}/add`)}
    />
  );
}

export function Gone({ children }: { readonly children?: ReactNode }) {
  return <View style={styles.fill}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.stackTight },
  fill: { flex: 1 },
});
