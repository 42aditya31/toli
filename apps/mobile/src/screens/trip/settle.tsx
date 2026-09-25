// screens/settle-up.md — R1a: Simplified only (D-018). Mark as paid pre-fills the EXACT amount
// (D-021). Hold to send, Remind and Pay via UPI need the server; they say so instead of faking it.
import {
  Avatar,
  Button,
  Chip,
  color,
  Header,
  HoldButton,
  Money,
  opacity,
  radius,
  Screen,
  Sheet,
  Stamp,
  space,
  Text,
  TicketCard,
  useToast,
} from '@toli/design-system';
import { currencyExponent, formatMoney, type Payment, parseMajor, splitForUpi } from '@toli/engine';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CommandError, closeTrip, recordSettlement } from '../../commands/index.ts';
import { kvGet } from '../../data/identity.ts';
import { amountText } from '../../state/draft.ts';
import { useLive } from '../../state/live.ts';
import { type TripView, useTrip } from '../../state/trip.ts';
import { Body, Field, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'bank', label: 'Bank' },
  { key: 'other', label: 'Other' },
] as const;

export function SettleUpScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const toast = useToast();
  const tapInstead = useLive(() => kvGet('tap_instead_of_hold') === 'true', []);
  const [paying, setPaying] = useState<Payment | null>(null);
  const [closing, setClosing] = useState(false);
  if (!v) return <Gone />;
  const ccy = v.trip.base_currency;
  const unit = 10n ** BigInt(currencyExponent(ccy));
  const pays = v.payments;
  const onlyDust = pays.every((p) => p.amount < unit);

  return (
    <Screen>
      <Header
        title="Settle up"
        onBack={() => router.back()}
        right={
          <Button
            label="WhatsApp"
            variant="tonal"
            size="medium"
            onPress={() => toast('Summary card ready for WhatsApp')}
          />
        }
      />
      <Body gap={space.s14}>
        {v.settled ? (
          <SettledCard v={v} />
        ) : v.expenses.length === 0 && v.settlements.length === 0 ? (
          <TicketCard
            top={
              <View style={styles.square}>
                <Text variant="amountM" tone="onAccent">
                  Nothing to settle yet.
                </Text>
              </View>
            }
          />
        ) : onlyDust ? (
          <>
            <TicketCard
              top={
                <View style={styles.square}>
                  <Text variant="label" tone="onAccent">
                    {v.trip.name}
                  </Text>
                  <Text variant="amountM" tone="onAccent">
                    Everyone's square.
                  </Text>
                  <Text variant="body" tone="onAccent" style={{ opacity: opacity.onAccentSub }}>
                    {pays.length > 0
                      ? `Only ${formatMoney(
                          pays.reduce((a, p) => a + p.amount, 0n),
                          ccy,
                        )} of rounding is left. Close the trip to write it off.`
                      : 'Close the trip to make it read-only.'}
                  </Text>
                </View>
              }
            />
            {v.pendingClose ? (
              <Button
                label="Closing · sending when you're online"
                variant="tonal"
                disabled
                onPress={() => {}}
              />
            ) : (
              <Button label="Close trip" variant="secondary" onPress={() => setClosing(true)} />
            )}
          </>
        ) : (
          <>
            <View style={styles.countCard}>
              <View style={styles.counts}>
                {v.directCount > pays.length ? (
                  <Text variant="amountL" tone="muted" style={styles.strike}>
                    {String(v.directCount)}
                  </Text>
                ) : null}
                {v.directCount > pays.length ? (
                  <Text variant="title" tone="muted">
                    →
                  </Text>
                ) : null}
                <Text variant="hero" tone="accent">
                  {String(pays.length)}
                </Text>
                <Text variant="caption" tone="muted">
                  payments
                </Text>
              </View>
              <Text variant="small" tone="muted">
                {v.directCount > pays.length
                  ? `Debts are rerouted so ${v.directCount} pairwise payments become ${pays.length}. Nobody's total changes.`
                  : 'Fewest payments. Nobody’s total changes.'}
              </Text>
            </View>
            {pays.map((p) => (
              <PaymentCard key={`${p.from}-${p.to}`} v={v} p={p} onPaid={() => setPaying(p)} />
            ))}
            {v.kitty.on && v.kitty.cash > 0n ? (
              <Text variant="small" tone="muted">
                {`Kitty leftovers (${formatMoney(v.kitty.cash, ccy)}) are handed back by ${v.kitty.holder?.display_name ?? '—'} in proportion to contributions.`}
              </Text>
            ) : null}
            <HoldButton
              label="Hold to tear & send stubs"
              disabled
              disabledLabel="Needs internet"
              tapInstead={tapInstead}
              onComplete={() => {}}
              confirm={{ title: 'Send stubs to everyone?', action: 'Tear & send' }}
            />
            <Text variant="small" tone="muted" style={styles.center}>
              Each person gets a stub that opens their own UPI app. Toli never holds the money and
              can't see payments, so payers confirm them.
            </Text>
          </>
        )}
        <Button
          label={`Recorded payments · ${v.settlements.filter((s) => !s.voided).length}`}
          variant="ghost"
          size="medium"
          onPress={() => router.push(`/trip/${v.trip.id}/payments`)}
        />
      </Body>
      {paying ? <MarkPaid v={v} p={paying} onClose={() => setPaying(null)} /> : null}
      <Sheet visible={closing} onClose={() => setClosing(false)} title={`Close ${v.trip.name}?`}>
        <Text variant="body" tone="muted">
          Everyone's square. Tiny leftovers under ₹1 are written off as rounding. The trip becomes
          read-only; anyone can ask to reopen it.
        </Text>
        <View style={styles.row}>
          <Button
            label="Close trip"
            size="large"
            flex={1}
            onPress={() => {
              setClosing(false);
              closeTrip(v);
              toast("Saved · sending when you're online");
            }}
          />
          <Button
            label="Cancel"
            variant="tonal"
            size="large"
            flex={1}
            onPress={() => setClosing(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function PaymentCard({
  v,
  p,
  onPaid,
}: {
  readonly v: TripView;
  readonly p: Payment;
  readonly onPaid: () => void;
}) {
  const toast = useToast();
  const ccy = v.trip.base_currency;
  const me = v.me?.id;
  const line = `${p.from === me ? 'You pay' : `${v.name(p.from)} pays`} ${p.to === me ? 'you' : v.name(p.to)}`;
  const why = v.why(p.from) || 'Net of shared expenses';
  const chunks = splitForUpi(p.amount, ccy);
  return (
    <TicketCard
      variant="payment"
      top={
        <View style={styles.payTop}>
          <Avatar initials={v.initialsOf(p.from)} size="avatarL" tone="onAccent" />
          <View style={styles.flex}>
            <Text
              variant="bodyStrong"
              tone="onAccent"
              onPress={() => router.push(`/trip/${v.trip.id}/trace?m=${p.from}`)}
            >
              {line}
            </Text>
            <Text
              variant="micro"
              tone="onAccent"
              style={{ opacity: opacity.onAccentMuted }}
              numberOfLines={2}
            >
              {why}
            </Text>
          </View>
          <Money
            variant="amountS"
            tone="onAccent"
            amount={p.amount}
            currency={ccy}
            spokenPrefix={line}
          />
        </View>
      }
      bottom={
        <View style={styles.payBottom}>
          {chunks.length > 1 ? (
            <Text variant="micro" tone="onAccent">
              {`UPI allows about ₹1 lakh per payment. Pay these over one or more days: ${chunks.map((c) => formatMoney(c, ccy)).join(' + ')}`}
            </Text>
          ) : null}
          <View style={styles.row}>
            {p.from === me ? (
              <Button
                label={`Pay ${formatMoney(p.amount, ccy)} via UPI`}
                variant="soft"
                size="small"
                flex={1}
                onPress={() =>
                  toast(
                    `${v.name(p.to)} hasn't added a UPI ID yet. Pay another way, then mark it as paid.`,
                  )
                }
              />
            ) : (
              <Button
                label="Remind"
                variant="soft"
                size="small"
                flex={1}
                onPress={() => toast('Reminders need internet and the Toli server.')}
              />
            )}
            <Button
              label="Mark as paid"
              variant="onAccent"
              size="small"
              flex={1}
              onPress={onPaid}
            />
          </View>
        </View>
      }
    />
  );
}

function MarkPaid({
  v,
  p,
  onClose,
}: {
  readonly v: TripView;
  readonly p: Payment;
  readonly onClose: () => void;
}) {
  const toast = useToast();
  const ccy = v.trip.base_currency;
  const [text, setText] = useState(amountText(p.amount, ccy));
  const [method, setMethod] = useState<(typeof METHODS)[number]['key']>('cash');
  const [note, setNote] = useState('');
  const amount = parseMajor(text, ccy) ?? 0n;
  return (
    <Sheet visible onClose={onClose} title={`${v.name(p.from)} paid ${v.name(p.to)}`}>
      <Field
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        accessibilityLabel="Amount"
      />
      <View style={styles.chips}>
        {METHODS.map((m) => (
          <Chip
            key={m.key}
            label={m.label}
            selected={method === m.key}
            onPress={() => setMethod(m.key)}
          />
        ))}
      </View>
      <Field
        value={note}
        onChangeText={setNote}
        placeholder="Add a note (optional)"
        maxLength={200}
      />
      <Button
        label={amount > 0n ? `Record ${formatMoney(amount, ccy)}` : 'Record'}
        disabled={amount <= 0n}
        onPress={() => {
          try {
            recordSettlement(v, {
              from: p.from,
              to: p.to,
              amount,
              method,
              note: note.trim() || null,
            });
            onClose();
            const over = amount - p.amount;
            toast(
              over > 0n
                ? `That's ${formatMoney(over, ccy)} more than ${v.name(p.from)} owed. ${v.name(p.to)} now owes ${v.name(p.from)} ${formatMoney(over, ccy)}.`
                : `${v.name(p.from)} → ${v.name(p.to)} ${formatMoney(amount, ccy)} recorded`,
            );
          } catch (e) {
            toast(e instanceof CommandError ? e.message : "Couldn't save. Try again.");
          }
        }}
      />
    </Sheet>
  );
}

function SettledCard({ v }: { readonly v: TripView }) {
  return (
    <TicketCard
      top={
        <View style={styles.square}>
          <Text variant="label" tone="onAccent">
            {v.trip.name}
          </Text>
          <Text variant="amountM" tone="onAccent">
            Everyone's square.
          </Text>
          <Text variant="body" tone="onAccent" style={{ opacity: opacity.onAccentSub }}>
            {`${v.settlements.filter((s) => !s.voided).length} payments recorded. The trip is now read-only.`}
          </Text>
          <View style={styles.stamp}>
            <Stamp label="SETTLED" delay={200} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.stackTight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.stackTight },
  square: { paddingVertical: space.s28, paddingHorizontal: space.s20 + space.s2, gap: space.s8 },
  stamp: { position: 'absolute', right: space.s20, top: space.s20 },
  countCard: {
    backgroundColor: color.bg.card,
    borderRadius: radius.card,
    paddingVertical: space.s18,
    paddingHorizontal: space.s20,
    gap: space.s14,
  },
  counts: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s14 },
  strike: { textDecorationLine: 'line-through' },
  payTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingTop: space.s14,
    paddingBottom: space.s12,
    paddingHorizontal: space.s18,
  },
  payBottom: { paddingVertical: space.s10, paddingHorizontal: space.s12, gap: space.s8 },
});
