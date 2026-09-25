// screens/trip-settings.md — name, dates, currency (until the first expense), kitty, settling,
// close / reopen. Invite, mute and delete need the server; they say so.
import { LIMITS } from '@toli/config';
import {
  Button,
  Card,
  Chip,
  Header,
  Row,
  Screen,
  Sheet,
  Switch,
  space,
  Text,
  useToast,
} from '@toli/design-system';
import { currencyExponent, formatMoney } from '@toli/engine';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CommandError,
  closeTrip,
  reopenTrip,
  requestReopen,
  updateTrip,
} from '../../commands/index.ts';
import { dateRange } from '../../data/clock.ts';
import { useTrip } from '../../state/trip.ts';
import { Body, Caption, Field, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'IDR', 'LKR', 'NPR', 'JPY'];

function Group({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      <Card>{children}</Card>
    </View>
  );
}

export function TripSettingsScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const toast = useToast();
  const [sheet, setSheet] = useState<'name' | 'currency' | 'low' | 'close' | 'reopen' | null>(null);
  const [text, setText] = useState('');
  if (!v) return <Gone />;
  const t = v.trip;
  const ccy = t.base_currency;
  const unit = 10n ** BigInt(currencyExponent(ccy));
  const left = v.payments.filter((p) => p.amount >= unit).length;
  const run = (fn: () => void, msg: string) => {
    try {
      fn();
      setSheet(null);
      toast(msg);
    } catch (e) {
      toast(e instanceof CommandError ? e.message : "Couldn't save. Try again.");
    }
  };
  const locked = v.expenses.length > 0;
  return (
    <Screen>
      <Header title="Trip settings" subtitle={t.name} onBack={() => router.back()} />
      <Body gap={space.stack}>
        <Group title="TRIP">
          <Row
            first
            title="Name"
            value={<Text variant="body">{t.name}</Text>}
            onPress={() => {
              setText(t.name);
              setSheet('name');
            }}
          />
          <Row
            title="Dates"
            value={<Text variant="body">{dateRange(t.start_date, t.end_date) ?? 'No dates'}</Text>}
          />
          <Row
            title="Base currency"
            subtitle={locked ? 'Locked after the first expense' : undefined}
            value={<Text variant="body">{ccy}</Text>}
            {...(locked || !v.isOrganiser ? {} : { onPress: () => setSheet('currency') })}
          />
          <Row
            title="Time zone"
            value={
              <Text variant="small" tone="muted">
                {t.time_zone}
              </Text>
            }
          />
        </Group>
        <Group title="KITTY">
          <Row
            first
            title="Kitty"
            subtitle={
              t.kitty_enabled && v.kitty.cash !== 0n
                ? `Spend or hand back the ${formatMoney(v.kitty.cash, ccy)} first`
                : undefined
            }
            value={
              <Switch
                value={t.kitty_enabled}
                label="Kitty"
                onChange={(on) => {
                  if (!v.isOrganiser)
                    return toast('Only an organiser can turn the kitty on or off.');
                  if (on) return router.push(`/trip/${t.id}/kitty`);
                  if (v.kitty.cash !== 0n)
                    return toast(`Spend or hand back the ${formatMoney(v.kitty.cash, ccy)} first`);
                  run(() => updateTrip(v, { kitty_enabled: false }), 'Kitty turned off');
                }}
              />
            }
          />
          {t.kitty_enabled ? (
            <>
              <Row
                title={`Kitty cash with ${v.kitty.holder?.display_name ?? '—'}`}
                value={<Text variant="mono">{formatMoney(v.kitty.cash, ccy)}</Text>}
                onPress={() => router.push(`/trip/${t.id}/kitty`)}
              />
              <Row
                title="Low warning"
                value={<Text variant="body">{`At ${t.kitty_low_bp / 100}% left`}</Text>}
                {...(v.isOrganiser ? { onPress: () => setSheet('low') } : {})}
              />
            </>
          ) : null}
        </Group>
        <Group title="SETTLING">
          <Row
            first
            title="Settle mode"
            subtitle="Fewest payments"
            value={<Text variant="body">Simplified</Text>}
          />
          <Row
            title="Recorded payments"
            value={
              <Text variant="body">{String(v.settlements.filter((s) => !s.voided).length)}</Text>
            }
            onPress={() => router.push(`/trip/${t.id}/payments`)}
          />
        </Group>
        <Group title="PEOPLE AND INVITE">
          <Row
            first
            title="Members"
            value={<Text variant="body">{`${v.active.length} people`}</Text>}
            onPress={() => router.replace(`/trip/${t.id}/members`)}
          />
          <View style={styles.pad}>
            <Button
              label="Share invite"
              variant="tonal"
              size="medium"
              onPress={() => toast('Connect to the internet to share the invite link')}
            />
          </View>
        </Group>
        <Group title="TRIP STATUS">
          <View style={styles.pad}>
            {v.settled ? (
              v.pendingReopen ? (
                <Button
                  label="Saved · sending when you're online"
                  variant="tonal"
                  size="medium"
                  disabled
                  onPress={() => {}}
                />
              ) : (
                <Button
                  label={v.isOrganiser ? 'Reopen trip' : 'Request reopen'}
                  variant="secondary"
                  size="medium"
                  onPress={() => setSheet('reopen')}
                />
              )
            ) : v.pendingClose ? (
              <Button
                label="Closing · sending when you're online"
                variant="tonal"
                size="medium"
                disabled
                onPress={() => {}}
              />
            ) : left > 0 ? (
              <>
                <Button
                  label="Close trip"
                  variant="secondary"
                  size="medium"
                  disabled
                  onPress={() => toast(`Settle up first: ${left} payments left.`)}
                />
                <Caption>{`Settle up first: ${left} ${left === 1 ? 'payment' : 'payments'} left.`}</Caption>
              </>
            ) : (
              <Button
                label="Close trip"
                variant="secondary"
                size="medium"
                onPress={() => setSheet('close')}
              />
            )}
          </View>
        </Group>
        <Text variant="small" tone="muted">
          Not synced yet
        </Text>
      </Body>

      <Sheet visible={sheet === 'name'} onClose={() => setSheet(null)} title="Trip name">
        <Field value={text} onChangeText={setText} maxLength={LIMITS.tripNameChars} autoFocus />
        <Button
          label="Save"
          onPress={() => text.trim() && run(() => updateTrip(v, { name: text.trim() }), 'Saved')}
        />
      </Sheet>
      <Sheet visible={sheet === 'currency'} onClose={() => setSheet(null)} title="Base currency">
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={c === ccy}
              onPress={() => run(() => updateTrip(v, { base_currency: c }), 'Saved')}
            />
          ))}
        </View>
      </Sheet>
      <Sheet visible={sheet === 'low'} onClose={() => setSheet(null)} title="Low warning">
        <View style={styles.chips}>
          {[1000, 2000, 3000, 5000].map((bp) => (
            <Chip
              key={bp}
              label={`${bp / 100}%`}
              selected={t.kitty_low_bp === bp}
              onPress={() => run(() => updateTrip(v, { kitty_low_bp: bp }), 'Saved')}
            />
          ))}
        </View>
      </Sheet>
      <Sheet visible={sheet === 'close'} onClose={() => setSheet(null)} title={`Close ${t.name}?`}>
        <Text variant="body" tone="muted">
          Everyone's square. Tiny leftovers under ₹1 are written off as rounding. The trip becomes
          read-only; anyone can ask to reopen it.
        </Text>
        <Button
          label="Close trip"
          onPress={() => run(() => closeTrip(v), "Saved · sending when you're online")}
        />
      </Sheet>
      <Sheet
        visible={sheet === 'reopen'}
        onClose={() => setSheet(null)}
        title={v.isOrganiser ? `Reopen ${t.name}?` : 'Ask the organisers to reopen?'}
      >
        {v.isOrganiser ? (
          <Text variant="body" tone="muted">
            Everyone can add and change expenses again. This is logged.
          </Text>
        ) : (
          <Field
            value={text}
            onChangeText={setText}
            placeholder="Why? (optional)"
            maxLength={200}
          />
        )}
        <Button
          label={v.isOrganiser ? 'Reopen' : 'Send request'}
          onPress={() =>
            run(
              () => (v.isOrganiser ? reopenTrip(v) : requestReopen(v, text.trim())),
              "Saved · sending when you're online",
            )
          }
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.s6 },
  pad: { paddingVertical: space.s12, gap: space.s8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
});
