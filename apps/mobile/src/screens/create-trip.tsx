// screens/create-trip.md — name is the only thing we need; everything is saved on the phone first.
import { LIMITS, TEMPLATES, type TemplateKey } from '@toli/config';
import {
  Avatar,
  Button,
  Chip,
  color,
  Header,
  radius,
  Screen,
  Sheet,
  size,
  space,
  Text,
  useLayout,
  useToast,
} from '@toli/design-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { CommandError, createTrip } from '../commands/index.ts';
import { dateRange, dayIn, deviceTimeZone } from '../data/clock.ts';
import { kvGet, kvSet } from '../data/identity.ts';
import { Body, Caption, Field, Footer, Tile } from '../ui/parts.tsx';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'IDR', 'LKR', 'NPR', 'JPY'];
const SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  IDR: 'Rp',
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function CreateTripScreen() {
  const { isCompact } = useLayout();
  const toast = useToast();
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('other');
  const [ghosts, setGhosts] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [dupe, setDupe] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [sheet, setSheet] = useState<'dates' | 'currency' | 'me' | 'discard' | null>(null);
  const [myName, setMyName] = useState(kvGet('display_name') ?? '');
  const count = ghosts.length + 1;
  const dirty = name.trim() !== '' || ghosts.length > 0;

  const add = () => {
    const n = newName.trim();
    if (!n) return;
    if (count >= LIMITS.membersPerTrip)
      return toast(`Trips can have up to ${LIMITS.membersPerTrip} people`);
    if (
      ghosts.some((g) => g.toLowerCase() === n.toLowerCase()) ||
      n.toLowerCase() === myName.toLowerCase()
    ) {
      setDupe(`${n} is already on the list`);
      return;
    }
    setDupe(null);
    setGhosts((g) => [...g, n]);
    setNewName('');
  };

  const create = (me: string) => {
    if (!name.trim()) return toast('Give the trip a name');
    try {
      kvSet('display_name', me);
      const id = createTrip({
        name,
        template,
        startDate: start,
        endDate: end,
        baseCurrency: currency,
        myName: me,
        ghosts,
      });
      router.replace(`/trip/${id}`);
      toast(`${name.trim()} created · works offline`);
    } catch (e) {
      toast(e instanceof CommandError ? e.message : "Couldn't save. Try again.");
    }
  };

  const onCreate = () => {
    if (!name.trim()) return toast('Give the trip a name');
    if (!myName.trim()) return setSheet('me');
    create(myName.trim());
  };

  const today = dayIn(deviceTimeZone());
  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header title="New trip" onBack={() => (dirty ? setSheet('discard') : router.back())} />
        <Body gap={space.s20}>
          <View style={styles.group}>
            <Caption>Trip name · the only thing we need</Caption>
            <Field
              big
              value={name}
              onChangeText={setName}
              placeholder="Goa Weekend"
              maxLength={LIMITS.tripNameChars}
              accessibilityLabel="Trip name, required"
              autoFocus
            />
          </View>
          <View style={styles.group}>
            <Caption>Template · presets categories</Caption>
            <View style={styles.grid} accessibilityRole="radiogroup">
              {TEMPLATES.map((t) => (
                <View key={t.key} style={{ width: isCompact ? '48.5%' : '31.8%' }}>
                  <Chip
                    label={t.label}
                    height="grid"
                    selected={t.key === template}
                    onPress={() => setTemplate(t.key)}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.row}>
            <Tile
              label="Dates"
              value={dateRange(start, end) ?? 'Add dates'}
              onPress={() => setSheet('dates')}
            />
            <Tile
              label="Base currency"
              value={`${SYMBOL[currency] ?? ''} ${currency}`.trim()}
              onPress={() => setSheet('currency')}
            />
          </View>
          <View style={styles.group}>
            <Caption>{`Who's coming · ${count} ${count === 1 ? 'person' : 'people'}`}</Caption>
            <View style={styles.chips}>
              <View
                style={[styles.member, styles.solid]}
                accessible
                accessibilityLabel="You, organiser"
              >
                <Avatar initials={(myName || 'Y').slice(0, 1).toUpperCase()} size="avatarS" />
                <Text variant="bodyStrong">You</Text>
                <Text variant="micro" tone="muted">
                  organiser
                </Text>
              </View>
              {ghosts.map((g) => (
                <Pressable
                  key={g}
                  onLongPress={() => setGhosts((all) => all.filter((x) => x !== g))}
                  style={[styles.member, styles.dashed]}
                  accessibilityLabel={`${g}, ghost member. Long press to remove`}
                >
                  <Avatar initials={g.slice(0, 1).toUpperCase()} size="avatarS" />
                  <Text variant="bodyStrong">{g}</Text>
                  <Text variant="micro" tone="muted">
                    ghost
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <View style={styles.fill}>
                <Field
                  value={newName}
                  onChangeText={(v) => {
                    setNewName(v);
                    setDupe(null);
                  }}
                  onSubmitEditing={add}
                  blurOnSubmit={false}
                  placeholder="Add by name"
                  maxLength={LIMITS.memberNameChars}
                  returnKeyType="done"
                  accessibilityLabel="Add by name"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add member"
                onPress={add}
                style={styles.plus}
              >
                <Text variant="header" tone="onAccent">
                  +
                </Text>
              </Pressable>
            </View>
            {dupe ? (
              <Text variant="small" tone="warning">
                {dupe}
              </Text>
            ) : null}
            <Caption>
              Nobody needs the app yet. Ghost members hold balances and can claim their spot from
              the invite link later.
            </Caption>
          </View>
        </Body>
        <Footer>
          <Button label="Create trip" onPress={onCreate} />
        </Footer>
      </KeyboardAvoidingView>

      <Sheet visible={sheet === 'dates'} onClose={() => setSheet(null)} title="Dates">
        <Stepper
          label="Starts"
          value={start ? (dateRange(start, null) ?? '') : 'No dates'}
          onMinus={() => setStart((s) => addDays(s ?? today, -1))}
          onPlus={() => {
            const next = addDays(start ?? today, start ? 1 : 0);
            setStart(next);
            if (end && end < next) setEnd(next);
          }}
        />
        <Stepper
          label="Ends"
          value={end ? (dateRange(end, null) ?? '') : '—'}
          onMinus={() => start && setEnd((e) => (e && e > start ? addDays(e, -1) : start))}
          onPlus={() => {
            const s0 = start ?? today;
            if (!start) setStart(s0);
            setEnd((e) => addDays(e ?? s0, e ? 1 : 0));
          }}
        />
        <View style={styles.row}>
          <Button label="Done" size="large" flex={1} onPress={() => setSheet(null)} />
          <Button
            label="No dates"
            variant="tonal"
            size="large"
            flex={1}
            onPress={() => {
              setStart(null);
              setEnd(null);
              setSheet(null);
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'currency'} onClose={() => setSheet(null)} title="Base currency">
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c}
              label={`${SYMBOL[c] ?? ''} ${c}`.trim()}
              selected={c === currency}
              onPress={() => {
                setCurrency(c);
                setSheet(null);
              }}
            />
          ))}
        </View>
        <Caption>You can change this until the first expense is added.</Caption>
      </Sheet>

      <Sheet
        visible={sheet === 'me'}
        onClose={() => setSheet(null)}
        title="What should friends call you?"
      >
        <Field
          value={myName}
          onChangeText={setMyName}
          placeholder="Your name"
          maxLength={LIMITS.memberNameChars}
          autoFocus
        />
        <Button
          label="Create trip"
          onPress={() => {
            if (!myName.trim()) return;
            setSheet(null);
            create(myName.trim());
          }}
        />
      </Sheet>

      <Sheet
        visible={sheet === 'discard'}
        onClose={() => setSheet(null)}
        title="Discard this trip?"
      >
        <View style={styles.row}>
          <Button
            label="Discard"
            variant="danger"
            size="large"
            flex={1}
            onPress={() => {
              setSheet(null);
              router.back();
            }}
          />
          <Button label="Keep editing" size="large" flex={1} onPress={() => setSheet(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  readonly label: string;
  readonly value: string;
  readonly onMinus: () => void;
  readonly onPlus: () => void;
}) {
  return (
    <View style={styles.stepRow}>
      <Text variant="bodyStrong" style={styles.fill}>
        {label}
      </Text>
      <Button
        label="−"
        variant="tonal"
        size="small"
        onPress={onMinus}
        accessibilityLabel={`${label} earlier`}
      />
      <Text variant="mono" style={styles.stepValue}>
        {value}
      </Text>
      <Button
        label="+"
        variant="tonal"
        size="small"
        onPress={onPlus}
        accessibilityLabel={`${label} later`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  group: { gap: space.s10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.stackTight },
  row: { flexDirection: 'row', gap: space.stackTight, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.stackTight },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    paddingVertical: space.s6,
    paddingLeft: space.s6,
    paddingRight: space.s12,
    borderRadius: radius.pill,
    borderWidth: size.hairline + space.s2 / 4,
    borderColor: color.bg.raised,
    backgroundColor: color.bg.card,
  },
  solid: { borderStyle: 'solid' },
  dashed: { borderStyle: 'dashed' },
  plus: {
    width: size.buttonM + space.s4,
    height: size.buttonM + space.s4,
    borderRadius: radius.control,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  stepValue: { minWidth: space.s40 * 2, textAlign: 'center' },
});
