// screens/recorded-payments.md — every recorded payment, with Void (append-only undo).
import {
  Button,
  Card,
  Chip,
  color,
  Header,
  Row,
  Screen,
  Sheet,
  space,
  Text,
  useToast,
} from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { voidSettlement } from '../../commands/index.ts';
import { shortDate, timeIn } from '../../data/clock.ts';
import { myUserId } from '../../data/identity.ts';
import type { Settlement } from '../../data/repo.ts';
import { useTrip } from '../../state/trip.ts';
import { Body, Field, SavedOnPhone, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const METHOD: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank',
  other: 'Other',
  rounding: 'Rounding',
};

export function RecordedPaymentsScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'mine' | 'voided'>('all');
  const [open, setOpen] = useState<Settlement | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  if (!v) return <Gone />;
  const ccy = v.trip.base_currency;
  const me = v.me?.id;
  const list = v.settlements.filter((s) =>
    filter === 'voided' ? s.voided : filter === 'mine' ? s.from === me || s.to === me : true,
  );
  const live = v.settlements.filter((s) => !s.voided).length;
  const recorder = (s: Settlement) =>
    s.recordedByUser === myUserId() ? (v.me?.display_name ?? 'you') : 'someone';
  const sub = (s: Settlement) => {
    if (s.voided) return `Voided${s.voidReason ? ` · “${s.voidReason}”` : ''}`;
    if (s.method === 'rounding') return 'Rounding · written off when the trip closed';
    const when = `${shortDate(s.recordedAt)} ${timeIn(v.trip.time_zone, s.recordedAt)}`;
    return `${METHOD[s.method] ?? s.method} · recorded by ${recorder(s)} · ${when}${s.note ? ` · “${s.note}”` : ''}`;
  };
  const canVoid = (s: Settlement) =>
    !s.voided && (s.recordedByUser === myUserId() || v.isOrganiser);
  return (
    <Screen>
      <Header
        title="Recorded payments"
        subtitle={`${v.trip.name} · ${live} recorded`}
        onBack={() => router.back()}
      />
      <Body>
        <View style={styles.chips}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label="Involving me"
            selected={filter === 'mine'}
            onPress={() => setFilter('mine')}
          />
          <Chip label="Voided" selected={filter === 'voided'} onPress={() => setFilter('voided')} />
        </View>
        <Text variant="caption" tone="muted">
          Toli never sees payments. These are what people recorded.
        </Text>
        {list.length === 0 ? (
          <Text variant="body" tone="muted" style={styles.none}>
            No payments recorded yet.
          </Text>
        ) : (
          <Card>
            {list.map((s, i) => (
              <Row
                key={s.id}
                first={i === 0}
                title={`${v.name(s.from)} → ${v.name(s.to)}`}
                subtitle={s.pending && !s.voided ? <SavedOnPhone /> : sub(s)}
                value={
                  <Text
                    variant="mono"
                    tone={s.voided ? 'muted' : 'text'}
                    style={s.voided ? styles.strike : undefined}
                  >
                    {formatMoney(s.amount, ccy)}
                  </Text>
                }
                onPress={() => setOpen(s)}
              />
            ))}
          </Card>
        )}
      </Body>
      <Sheet
        visible={open !== null && !voiding}
        onClose={() => setOpen(null)}
        title={open ? `${v.name(open.from)} paid ${v.name(open.to)}` : ''}
      >
        {open ? (
          <>
            <Text variant="amountM">{formatMoney(open.amount, ccy)}</Text>
            <Text variant="caption">{sub(open)}</Text>
            <Text variant="small" tone="muted">
              {`This is based on what ${recorder(open)} recorded. Toli never sees the payment itself.`}
            </Text>
            <Button
              label={`See ${v.name(open.from)}'s balance`}
              variant="ghost"
              size="medium"
              onPress={() => {
                const f = open.from;
                setOpen(null);
                router.push(`/trip/${v.trip.id}/trace?m=${f}`);
              }}
            />
            {canVoid(open) ? (
              <Button
                label="Void payment"
                variant="danger"
                size="medium"
                onPress={() => setVoiding(true)}
              />
            ) : open.voided ? null : (
              <Text variant="small" tone="muted">
                Only the person who recorded it, or an organiser, can void this.
              </Text>
            )}
          </>
        ) : null}
      </Sheet>
      <Sheet
        visible={voiding && open !== null}
        onClose={() => setVoiding(false)}
        title="Void this payment?"
      >
        {open ? (
          <>
            <Text variant="body" tone="muted">
              {`${v.name(open.from)} will owe ${v.name(open.to)} ${formatMoney(open.amount, ccy)} again. Everyone on the trip sees this in the history.${v.settled ? ' The trip goes back to settling.' : ''}`}
            </Text>
            <Field
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (optional)"
              maxLength={200}
            />
            <View style={styles.row}>
              <Button
                label="Void payment"
                variant="danger"
                size="large"
                flex={1}
                onPress={() => {
                  voidSettlement(v, open.id, reason.trim() || null);
                  setVoiding(false);
                  setOpen(null);
                  setReason('');
                  toast('Payment voided');
                }}
              />
              <Button
                label="Cancel"
                variant="tonal"
                size="large"
                flex={1}
                onPress={() => setVoiding(false)}
              />
            </View>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  none: { textAlign: 'center', paddingTop: space.s24 },
  strike: { textDecorationLine: 'line-through', color: color.textMuted },
  row: { flexDirection: 'row', gap: space.stackTight },
});
