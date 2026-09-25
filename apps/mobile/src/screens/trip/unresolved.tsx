// screens/unresolved-changes.md — every change the server rejected, with one way forward each.
// Nothing is silently lost (06 §5). Rejections arrive from sync-push (M5); until then this is empty.
import { Button, Card, Header, Screen, space, Text } from '@toli/design-system';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { dismissRejected } from '../../commands/index.ts';
import { outboxRows } from '../../data/repo.ts';
import { useLive } from '../../state/live.ts';
import { useTrip } from '../../state/trip.ts';
import { Body, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const MESSAGE: Record<string, string> = {
  entity_deleted: "Someone deleted this. Your edit wasn't saved.",
  base_revision_missing: "This changed while you were offline. Your edit wasn't saved.",
  split_mismatch: "The split didn't add up, so it wasn't saved.",
  balance_not_zero: 'Settle their balance or move their expenses first.',
  trip_settled: 'This trip is settled. Reopen to edit.',
  not_organiser: 'Only an organiser can do this.',
  removed_member_balance: 'This changes a removed member’s balance. Add them back first.',
};

export function UnresolvedScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const rows = useLive(
    () => (id ? outboxRows(id).filter((o) => o.state === 'rejected') : []),
    [id],
  );
  if (!v) return <Gone />;
  return (
    <Screen>
      <Header
        title="Unresolved changes"
        subtitle={`${v.trip.name} · ${rows.length} to review`}
        onBack={() => router.back()}
      />
      <Body>
        <Text variant="caption" tone="muted">
          These changes were made on this phone but couldn't be saved, usually because someone else
          changed the same thing first. Nothing else was affected.
        </Text>
        {rows.length === 0 ? (
          <Text variant="body" tone="muted" style={styles.none}>
            Nothing to review.
          </Text>
        ) : (
          rows.map((o) => (
            <Card key={o.op_id} radiusSize="cardS" style={styles.card}>
              <Text
                variant="labelS"
                tone="muted"
              >{`${o.type.split('.')[0]?.toUpperCase()} · ${o.created_at.slice(11, 16)}`}</Text>
              <Text variant="bodyStrong">
                {MESSAGE[o.reject_code ?? ''] ?? 'This change couldn’t be saved.'}
              </Text>
              <View style={styles.row}>
                <View style={styles.flex} />
                <Button
                  label="Dismiss"
                  variant="ghost"
                  size="small"
                  onPress={() => dismissRejected(o.op_id)}
                />
              </View>
            </Card>
          ))
        )}
        <Text variant="small" tone="muted">
          Dismissed changes are gone from this phone. Everything the group saved is still in the
          trip history.
        </Text>
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  none: { textAlign: 'center', paddingTop: space.s24 },
  card: { paddingVertical: space.s14, paddingHorizontal: space.s16, gap: space.s10 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
