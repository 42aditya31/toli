// screens/members.md — people on the trip: add, rename, joined-from, remove (balance 0 only).
import { LIMITS } from '@toli/config';
import {
  Avatar,
  Button,
  Card,
  Chip,
  color,
  Row,
  radius,
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
import {
  addMember,
  CommandError,
  removeMember,
  setRole,
  updateMember,
} from '../../commands/index.ts';
import { daysBetween } from '../../data/clock.ts';
import { useTrip } from '../../state/trip.ts';
import { Body, Caption, Field, useTripId } from '../../ui/parts.tsx';
import { Gone, TripHeader, TripTabs } from './common.tsx';

export function MembersScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const toast = useToast();
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [rename, setRename] = useState('');
  if (!v) return <Gone />;
  const ccy = v.trip.base_currency;
  const open = v.members.find((m) => m.id === openId);
  const dayOf = (d: string | null) =>
    d && v.trip.start_date ? daysBetween(v.trip.start_date, d) + 1 : 1;
  const run = (fn: () => void, msg: string) => {
    try {
      fn();
      toast(msg);
    } catch (e) {
      toast(e instanceof CommandError ? e.message : "Couldn't save. Try again.");
    }
  };
  const add = () => {
    const n = name.trim();
    if (!n) return;
    run(() => addMember(v, n), `${n} added`);
    setName('');
  };
  const organisers = v.active.filter((m) => m.role === 'organiser').length;
  const days = v.day ? Array.from({ length: v.day.of }, (_, i) => i) : [];
  const addDays = (i: number) => {
    const d = new Date(`${v.trip.start_date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  };
  return (
    <Screen>
      <TripHeader v={v} />
      <Body tabBar>
        <Text variant="header">{`Members · ${v.active.length} ${v.active.length === 1 ? 'person' : 'people'}`}</Text>
        <Card>
          {v.active.map((m, i) => {
            const late = dayOf(m.joined_from) > 1;
            return (
              <Row
                key={m.id}
                first={i === 0}
                tall
                leading={
                  <Avatar
                    initials={v.initialsOf(m.id)}
                    tone={m.id === v.me?.id ? 'accent' : 'raised'}
                  />
                }
                title={m.id === v.me?.id ? `${m.display_name} (you)` : m.display_name}
                subtitle={
                  m.role === 'organiser'
                    ? 'Organiser'
                    : m.user_id
                      ? 'On Toli'
                      : 'Ghost · not on Toli yet'
                }
                value={
                  <View style={[styles.pill, late && styles.pillLate]}>
                    <Text variant="label" tone={late ? 'onAccent' : 'muted'} style={styles.noCaps}>
                      {late ? `joined day ${dayOf(m.joined_from)}` : 'Day 1'}
                    </Text>
                  </View>
                }
                onPress={() => {
                  setOpenId(m.id);
                  setRename(m.display_name);
                }}
              />
            );
          })}
        </Card>
        {v.settled ? null : (
          <>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={add}
                  placeholder="Add by name"
                  maxLength={LIMITS.memberNameChars}
                  accessibilityLabel="Add by name"
                />
              </View>
              <Button label="+" size="medium" onPress={add} accessibilityLabel="Add member" />
            </View>
            <Caption>
              {v.active.length === 1
                ? 'Add the people travelling with you.'
                : 'Nobody needs the app yet. Ghost members hold balances and can claim their spot from the invite link later.'}
            </Caption>
          </>
        )}
      </Body>
      <TripTabs v={v} active="members" />
      <Sheet visible={!!open} onClose={() => setOpenId(null)} title={open?.display_name ?? ''}>
        {open ? (
          v.settled ? (
            <Text variant="body" tone="muted">
              This trip is settled. Reopen to edit.
            </Text>
          ) : (
            <>
              <Text variant="small" tone="muted">
                Rename
              </Text>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Field
                    value={rename}
                    onChangeText={setRename}
                    maxLength={LIMITS.memberNameChars}
                  />
                </View>
                <Button
                  label="Save"
                  variant="tonal"
                  size="medium"
                  onPress={() =>
                    rename.trim() &&
                    run(
                      () => updateMember(v, open.id, { display_name: rename }),
                      `Renamed to ${rename.trim()}`,
                    )
                  }
                />
              </View>
              {days.length > 1 ? (
                <>
                  <Text variant="small" tone="muted">
                    Joined from
                  </Text>
                  <View style={styles.chips}>
                    {days.map((i) => (
                      <Chip
                        key={i}
                        label={i === 0 ? 'From the start' : `Day ${i + 1}`}
                        selected={dayOf(open.joined_from) === i + 1}
                        onPress={() =>
                          run(
                            () =>
                              updateMember(v, open.id, {
                                joined_from: i === 0 ? null : addDays(i),
                              }),
                            i === 0
                              ? `${open.display_name} is on from the start`
                              : `${open.display_name} joined from day ${i + 1}`,
                          )
                        }
                      />
                    ))}
                  </View>
                  <Caption>
                    Only new expenses use this. Older ones keep their split until you edit them.
                  </Caption>
                </>
              ) : null}
              {v.isOrganiser && open.user_id && open.id !== v.me?.id ? (
                <Button
                  label={
                    open.role === 'organiser'
                      ? 'Remove organiser role'
                      : `Make ${open.display_name} an organiser`
                  }
                  variant="tonal"
                  size="medium"
                  onPress={() =>
                    run(
                      () => setRole(v, open.id, open.role === 'organiser' ? 'member' : 'organiser'),
                      'Saved',
                    )
                  }
                />
              ) : null}
              {(() => {
                const bal = v.balances.settle[open.id] ?? 0n;
                const self = open.id === v.me?.id;
                if (!v.isOrganiser && !self) return null;
                if (self && open.role === 'organiser' && organisers <= 1) {
                  return <Caption>Make someone else an organiser first</Caption>;
                }
                if (bal !== 0n) {
                  return (
                    <Caption>{`Settle ${open.display_name}'s ${formatMoney(bal < 0n ? -bal : bal, ccy)} or move their expenses first`}</Caption>
                  );
                }
                return (
                  <Button
                    label={self ? 'Leave trip' : 'Remove from trip'}
                    variant="danger"
                    size="medium"
                    onPress={() => {
                      const n = open.display_name;
                      setOpenId(null);
                      run(() => removeMember(v, open.id), `${n} removed`);
                      if (self) router.replace('/trips');
                    }}
                  />
                );
              })()}
            </>
          )
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.stackTight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  pill: { paddingVertical: space.s4, paddingHorizontal: space.s10, borderRadius: radius.pill },
  pillLate: { backgroundColor: color.accent },
  noCaps: { textTransform: 'none' },
});
