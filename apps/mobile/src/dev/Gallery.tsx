// Dev-only component gallery (BUILD-PROMPT M3): every design-system part with the reference data,
// for a side-by-side check against ui-refrence/Toli App.dc.html. Not shipped in the beta build.

import {
  AmountDisplay,
  Avatar,
  Banner,
  Button,
  Card,
  CardHeader,
  Chip,
  color,
  DateCurrencyChip,
  Header,
  HoldButton,
  Keypad,
  Money,
  opacity,
  ProgressBar,
  Ring,
  Row,
  radius,
  Screen,
  Segmented,
  Skeleton,
  Stamp,
  Stub,
  StubBanner,
  Switch,
  SyncPill,
  space,
  TabBar,
  TearOverlay,
  Text,
  TicketCard,
  useLayout,
  useToast,
  Wordmark,
} from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

const INR = 'INR';
const MEMBERS = [
  { name: 'Aditya (you)', init: 'A', sub: 'On Toli', net: 340000n },
  { name: 'Rahul', init: 'R', sub: 'Ghost · not on Toli yet', net: -100000n },
  { name: 'Neha', init: 'N', sub: 'Ghost · not on Toli yet', net: -120000n },
  { name: 'Jay', init: 'J', sub: 'Ghost · not on Toli yet', net: -120000n },
];
const CATS = ['Food', 'Drinks', 'Travel', 'Stay', 'Activities', 'Shopping', 'Fuel', 'Misc'];

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function Gallery({ onBack }: { readonly onBack: () => void }) {
  const { gutter } = useLayout();
  const toast = useToast();
  const [cat, setCat] = useState('Food');
  const [mode, setMode] = useState<'simplified' | 'direct'>('simplified');
  const [on, setOn] = useState(true);
  const [digits, setDigits] = useState('');
  const [tearing, setTearing] = useState(false);
  const [amountKey, setAmountKey] = useState(340000n);

  const press = (k: string) =>
    setDigits((d) => {
      const next = k === '⌫' ? d.slice(0, -1) : `${d}${k}`.replace(/^0+/, '');
      return next.length > 8 ? d : next;
    });
  const grouped = digits ? formatMoney(BigInt(digits) * 100n, INR).slice(1) : '';

  return (
    <Screen>
      <Header title="Component gallery" subtitle="Dev only · 13 §6" onBack={onBack} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingBottom: space.tabBarClearance,
          gap: space.s24,
        }}
      >
        <Section title="Wordmark 3a">
          <View style={styles.row}>
            <Wordmark size={56} />
            <View style={styles.limeBox}>
              <Wordmark size={40} onLime />
            </View>
          </View>
        </Section>

        <Section title="Hero ticket (trip home)">
          <TicketCard
            top={
              <View style={styles.heroTop}>
                <View style={styles.between}>
                  <Text variant="bodyStrong" tone="onAccent">
                    You are owed
                  </Text>
                  <Text variant="label" tone="onAccent" style={{ opacity: opacity.onAccentMuted }}>
                    LIVE
                  </Text>
                </View>
                <Money
                  variant="display"
                  tone="onAccent"
                  amount={amountKey}
                  currency={INR}
                  countUp
                  spokenPrefix="You are owed"
                />
              </View>
            }
            bottom={
              <View style={styles.heroBottom}>
                <Text variant="caption" tone="onAccent">
                  Group spent{' '}
                  <Text variant="captionStrong" tone="onAccent">
                    ₹17,000
                  </Text>
                </Text>
                <Button
                  label="Settle up →"
                  variant="onAccent"
                  size="small"
                  onPress={() => setAmountKey((a) => a + 50000n)}
                />
              </View>
            }
          />
        </Section>

        <Section title="Balances card">
          <Card>
            <CardHeader title="Balances" right="Tap to trace" />
            {MEMBERS.map((m) => (
              <Row
                key={m.name}
                leading={<Avatar initials={m.init} />}
                title={m.name}
                subtitle={m.sub}
                value={
                  <Money
                    variant="mono"
                    tone={m.net > 0n ? 'accent' : 'text'}
                    amount={m.net}
                    currency={INR}
                    signed
                    spokenPrefix={`${m.name} ${m.net > 0n ? 'gets back' : 'owes'}`}
                  />
                }
                caption={m.net > 0n ? 'gets back' : 'owes'}
                onPress={() => toast(`Trace for ${m.name}`)}
              />
            ))}
          </Card>
        </Section>

        <Section title="Payment ticket + stamp">
          <TicketCard
            variant="payment"
            top={
              <View style={styles.payTop}>
                <Avatar initials="N" size="avatarL" tone="onAccent" />
                <View style={styles.flex}>
                  <Text variant="bodyStrong" tone="onAccent">
                    Neha pays you
                  </Text>
                  <Text variant="micro" tone="onAccent" style={{ opacity: opacity.onAccentMuted }}>
                    Casa Anjuna ₹1,000 + Cab to Baga ₹200
                  </Text>
                </View>
                <Text variant="amountS" tone="onAccent">
                  ₹1,200
                </Text>
              </View>
            }
            bottom={
              <View style={styles.payButtons}>
                <Button label="Remind" variant="soft" size="small" flex={1} />
                <Button label="Mark as paid" variant="onAccent" size="small" flex={1} />
                <Button label="Their view" variant="soft" size="small" />
              </View>
            }
          />
          <View style={styles.settled}>
            <Text variant="amountM" tone="onAccent">
              Everyone's square.
            </Text>
            <View style={styles.stampCorner}>
              <Stamp label="SETTLED" delay={200} />
            </View>
          </View>
        </Section>

        <Section title="Stubs">
          <View style={styles.row}>
            {['Rahul', 'Neha', 'Jay'].map((n) => (
              <Stub key={n} initials={n[0] ?? ''} name={n} amount="₹1,200" style={styles.flex} />
            ))}
          </View>
          <Button
            label="Play the tear overlay ✂"
            variant="tonal"
            onPress={() => setTearing(true)}
          />
        </Section>

        <Section title="In-app notification (StubBanner)">
          <StubBanner
            tripName="GOA WEEKEND"
            when="NOW"
            message={['Aditya tore you a stub for ', 'Dinner at Thalassa']}
            amount="₹1,200"
            action={{
              label: 'Pay via UPI',
              icon: 'upi',
              onPress: () => toast('Opens your UPI app'),
            }}
          />
          <StubBanner
            tripName="GOA WEEKEND"
            when="2M"
            message={['Kitty is running low: 20% left']}
            tone="info"
            warning
          />
        </Section>

        <Section title="Buttons">
          <Button label="Create trip" />
          <Button label="Get started" variant="secondary" />
          <Button label="Invite" variant="tonal" size="medium" />
          <Button label="I have an invite link" variant="ghost" size="medium" />
          <Button label="Delete expense" variant="danger" size="medium" />
          <Button
            label="Save & tear stubs"
            icon="tear"
            disabled
            onPress={() => toast('Type an amount first')}
          />
        </Section>

        <Section title="Hold button (900 ms)">
          <HoldButton
            label="Hold to tear & send stubs"
            onComplete={() => toast('Stubs ready. Each opens their own UPI app.')}
            confirm={{ title: 'Send stubs to everyone?', action: 'Tear & send' }}
          />
          <HoldButton
            label="Hold to tear & send stubs"
            disabled
            disabledLabel="Needs internet"
            onComplete={() => {}}
            confirm={{ title: '', action: '' }}
          />
        </Section>

        <Section title="Chips, segmented, switch">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {CATS.map((c) => (
              <Chip key={c} label={c} selected={c === cat} onPress={() => setCat(c)} />
            ))}
          </ScrollView>
          <View style={styles.row}>
            <Chip label="Equal" height="tile" selected />
            <Chip label="Exact" tag="₹" height="tile" />
            <Chip label="Percent" tag="%" height="tile" />
            <Chip label="Shares" tag="×" height="tile" />
          </View>
          <Segmented
            options={[
              { value: 'simplified', label: 'Simplified' },
              { value: 'direct', label: 'Direct' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <View style={styles.between}>
            <Text variant="body">Hide per-person amounts</Text>
            <Switch value={on} onChange={setOn} label="Hide per-person amounts" />
          </View>
        </Section>

        <Section title="Kitty ring + bars">
          <Card style={styles.kitty}>
            <Ring fraction={0.2}>
              <Text variant="amountS">₹3,000</Text>
              <Text variant="micro" tone="muted">
                remaining
              </Text>
            </Ring>
            <View style={styles.flex}>
              <ProgressBar fraction={1} />
              <ProgressBar fraction={0.6} />
              <ProgressBar fraction={0.4} tone="warning" />
              <ProgressBar fraction={0.57} tone="text" thick />
            </View>
          </Card>
        </Section>

        <Section title="Banners, sync, skeleton">
          <Banner tone="offline">
            <Text variant="caption">
              <Text variant="captionStrong">Offline.</Text> 2 changes saved on this phone. They sync
              when you're back.
            </Text>
          </Banner>
          <Banner tone="warning" action={<Button label="Review" variant="tonal" size="small" />}>
            1 change couldn't be saved.
          </Banner>
          <SyncPill label="Syncing Goa Weekend · 3 changes" />
          <View style={styles.row}>
            <Skeleton
              width={space.s40 + space.s4}
              height={space.s40 + space.s4}
              radiusSize={space.s14}
            />
            <View style={styles.flex}>
              <Skeleton width="60%" height={space.s14} />
              <Skeleton width="40%" height={space.s10} />
            </View>
          </View>
        </Section>

        <Section title="Amount entry (keypad)">
          <View style={styles.center}>
            <AmountDisplay symbol="₹" digits={grouped} spoken={`${digits} rupees`} />
            <Text variant="monoS" tone="accent">
              {digits
                ? `${formatMoney((BigInt(digits) * 100n) / 4n, INR)} each · 4 people`
                : 'Amount is the only thing you need'}
            </Text>
            <DateCurrencyChip label="Today · ₹" onPress={() => toast('Date & currency sheet')} />
          </View>
          <View style={styles.keypad}>
            <Keypad onKey={press} />
          </View>
        </Section>

        <Section title="Tab bar (R1a)">
          <View style={styles.tabDemo}>
            <TabBar
              tabs={[
                { key: 'trip', label: 'Trip' },
                { key: 'members', label: 'Members' },
              ]}
              active="trip"
              onTab={() => {}}
              onAdd={() => toast('Add expense')}
            />
          </View>
        </Section>
      </ScrollView>
      {tearing ? (
        <TearOverlay
          label="New expense"
          tripName="Goa Weekend"
          title="Dinner at Thalassa"
          amount="₹4,800"
          sub="You paid · split 4 ways"
          pieces={[
            { name: 'Rahul', initials: 'R', amount: '₹1,200' },
            { name: 'Neha', initials: 'N', amount: '₹1,200' },
            { name: 'Jay', initials: 'J', amount: '₹1,200' },
          ]}
          onDone={() => {
            setTearing(false);
            toast('Rahul, Neha and Jay will get a stub');
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.stackTight },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1, gap: space.s6 },
  center: { alignItems: 'center', gap: space.s8 },
  limeBox: { backgroundColor: color.accent, padding: space.s12, borderRadius: radius.key },
  heroTop: { padding: space.heroPad, paddingBottom: space.s16, gap: space.s4 },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s12,
    paddingLeft: space.heroPad,
    paddingRight: space.s14,
  },
  payTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    padding: space.s14,
    paddingHorizontal: space.s18,
  },
  payButtons: {
    flexDirection: 'row',
    gap: space.stackTight,
    padding: space.s10,
    paddingHorizontal: space.s12,
  },
  settled: {
    backgroundColor: color.accent,
    borderRadius: radius.card,
    paddingVertical: space.s28,
    paddingHorizontal: space.s24,
  },
  stampCorner: { position: 'absolute', right: space.s20, top: space.s20 },
  chips: { gap: space.s6 },
  kitty: { flexDirection: 'row', alignItems: 'center', gap: space.s18, padding: space.s20 },
  keypad: { height: space.s40 * 7 },
  tabDemo: { height: space.tabBarClearance },
});
