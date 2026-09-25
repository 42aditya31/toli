// screens/expense-detail.md — one expense: payers, shares, history; Edit / Delete.
import {
  Avatar,
  Banner,
  Button,
  Card,
  CardHeader,
  Header,
  Money,
  opacity,
  Row,
  Screen,
  Sheet,
  space,
  Text,
  TicketCard,
  useToast,
} from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { deleteExpense } from '../../commands/index.ts';
import { dayIn, shortDate, timeIn } from '../../data/clock.ts';
import { titleOf, useTrip } from '../../state/trip.ts';
import { Body, SavedOnPhone, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

const MODE: Record<string, string> = {
  equal: 'Equal',
  exact: 'Exact',
  percent: 'Percent',
  shares: 'Shares',
  adjust: 'Adjust',
  itemised: 'Itemised',
};

export function ExpenseDetailScreen() {
  const id = useTripId();
  const { eid } = useLocalSearchParams<{ eid: string }>();
  const v = useTrip(id);
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const e = v?.expenses.find((x) => x.id === eid);
  if (!v || !e) return <Gone />;
  const ccy = v.trip.base_currency;
  const r = e.revision;
  const label = v.categoryLabel(r.category_id);
  const title = titleOf(r.description, label);
  const tz = v.trip.time_zone;
  const day = v.trip.start_date
    ? Math.max(
        1,
        Math.round(
          (Date.parse(`${dayIn(tz, new Date(r.spent_at))}T00:00:00Z`) -
            Date.parse(`${v.trip.start_date}T00:00:00Z`)) /
            86_400_000,
        ) + 1,
      )
    : null;
  const when = [
    day ? `Day ${day}` : null,
    timeIn(tz, r.spent_at),
    shortDate(dayIn(tz, new Date(r.spent_at))),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Screen>
      <Header title={title} onBack={() => router.back()} />
      <Body>
        {v.settled ? <Banner>This trip is settled. Reopen to edit.</Banner> : null}
        <TicketCard
          top={
            <View style={styles.ticket}>
              <Text variant="label" tone="onAccent">
                {label.toUpperCase()}
              </Text>
              <Money variant="amountL" tone="onAccent" amount={e.baseAmount} currency={ccy} />
              <Text variant="small" tone="onAccent" style={{ opacity: opacity.onAccentSub }}>
                {when}
              </Text>
              {e.pending ? (
                <Text variant="label" tone="onAccent">
                  SAVED ON PHONE · WILL SYNC
                </Text>
              ) : null}
            </View>
          }
        />
        <Card>
          <CardHeader title="Paid by" />
          {r.paid_from_kitty ? (
            <Row
              first
              title={`Paid from kitty · held by ${v.kitty.holder?.display_name ?? '—'}`}
              value={<Money variant="mono" amount={e.baseAmount} currency={ccy} />}
            />
          ) : (
            e.payers.map((p, i) => (
              <Row
                key={p.memberId}
                first={i === 0}
                leading={<Avatar initials={v.initialsOf(p.memberId)} />}
                title={p.memberId === v.me?.id ? 'You' : v.name(p.memberId)}
                value={<Money variant="mono" amount={p.base} currency={ccy} />}
              />
            ))
          )}
        </Card>
        <Card>
          <CardHeader
            title="Split"
            right={`${MODE[r.split_mode] ?? r.split_mode} · ${e.shares.length} ${e.shares.length === 1 ? 'person' : 'people'}`}
          />
          {e.shares.map((s, i) => (
            <Row
              key={s.memberId}
              first={i === 0}
              leading={
                <Avatar
                  initials={v.initialsOf(s.memberId)}
                  tone={s.memberId === v.me?.id ? 'accent' : 'raised'}
                />
              }
              title={s.memberId === v.me?.id ? 'You' : v.name(s.memberId)}
              value={
                <Money
                  variant="mono"
                  amount={s.base}
                  currency={ccy}
                  spokenPrefix={`${v.name(s.memberId)}'s share`}
                />
              }
            />
          ))}
        </Card>
        <Card>
          <CardHeader title="Who changed what" />
          <Row
            first
            title={`${v.name(e.createdByMemberId)} ${r.revision_no > 1 ? 'changed this' : 'added this'}`}
            subtitle={e.pending ? <SavedOnPhone /> : when}
          />
          <Text variant="small" tone="muted" style={styles.older}>
            Older changes load when you're online
          </Text>
        </Card>
        {v.settled ? null : (
          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="tonal"
              onPress={() => router.push(`/trip/${v.trip.id}/add?edit=${e.id}`)}
            />
            <Button
              label="Delete"
              variant="danger"
              size="medium"
              onPress={() => setConfirm(true)}
            />
          </View>
        )}
      </Body>
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Delete this expense?">
        <Text variant="body" tone="muted">
          {`${title} · ${formatMoney(e.baseAmount, ccy)}. Everyone's balance goes back to what it was. It stays in the trip history.`}
        </Text>
        <View style={styles.row}>
          <Button
            label="Delete"
            variant="danger"
            size="large"
            flex={1}
            onPress={() => {
              setConfirm(false);
              try {
                deleteExpense(v, e.id);
                router.back();
                toast('Deleted');
              } catch (err) {
                toast(err instanceof Error ? err.message : "Couldn't delete");
              }
            }}
          />
          <Button
            label="Cancel"
            variant="tonal"
            size="large"
            flex={1}
            onPress={() => setConfirm(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticket: { padding: space.heroPad, gap: space.s6 },
  older: { paddingVertical: space.s10 },
  actions: { gap: space.s8 },
  row: { flexDirection: 'row', gap: space.stackTight },
});
