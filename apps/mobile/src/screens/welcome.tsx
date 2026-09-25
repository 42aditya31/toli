// screens/welcome.md — variant 1b "The screen is the ticket" (D-015).
import {
  Button,
  brand,
  color,
  Notches,
  Perforation,
  size,
  space,
  Text,
  useLayout,
  Wordmark,
} from '@toli/design-system';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { kvSet } from '../data/identity.ts';

export function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const { isCompact } = useLayout();
  const ticket = isCompact
    ? Math.max(brand.welcomeTicket.min, Math.round(height * 0.6))
    : brand.welcomeTicket.height;
  const go = (to: '/create-trip' | '/join') => {
    kvSet('onboarding_seen', 'true');
    router.push(to);
  };
  return (
    <View style={styles.fill}>
      <StatusBar style="dark" />
      <View style={[styles.ticket, { height: ticket }]}>
        <SafeAreaView edges={['top']} style={styles.ticketInner}>
          <View style={styles.top}>
            <Wordmark size={brand.wordmark.medium} onLime />
            <Text variant="label" tone="onAccent" style={styles.admit} accessible={false}>
              ADMIT ALL
            </Text>
          </View>
          <View style={styles.spacer} />
          <View accessible accessibilityLabel="One trip. One tab. Zero awkward.">
            <Text variant="display" tone="onAccent">
              One trip.
            </Text>
            <Text variant="display" tone="onAccent">
              One tab.
            </Text>
            <Text variant="display" tone="onAccent">
              Zero awkward.
            </Text>
          </View>
        </SafeAreaView>
        <View style={styles.perf}>
          <Perforation inset={space.s28} dash={space.s10} />
        </View>
        <Notches top={ticket} diameter={size.notchL} />
      </View>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <Text variant="body" tone="muted">
          Unlimited expenses and every kind of split, free. Toli works out who pays whom.
        </Text>
        <View style={styles.spacer} />
        <Button label="Get started" variant="secondary" onPress={() => go('/create-trip')} />
        <Button
          label="I have an invite link"
          variant="ghost"
          size="medium"
          onPress={() => go('/join')}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          size="small"
          onPress={() => router.push('/sign-in')}
        />
        <Text variant="small" tone="muted" style={styles.consent}>
          By continuing you agree to the{' '}
          <Text
            variant="small"
            tone="accent"
            accessibilityRole="link"
            accessibilityLabel="Privacy notice, opens in browser"
            onPress={() => Linking.openURL('https://toli.workers.dev/privacy')}
          >
            Privacy notice
          </Text>
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg.base },
  ticket: { backgroundColor: color.accent, overflow: 'hidden' },
  ticketInner: {
    flex: 1,
    paddingHorizontal: space.s28,
    paddingTop: space.s28,
    paddingBottom: space.s32 + space.s2,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginLeft: -space.s6,
  },
  admit: { paddingTop: space.s10 },
  spacer: { flex: 1 },
  perf: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottom: {
    flex: 1,
    paddingHorizontal: space.s28,
    paddingTop: space.s24 + space.s2,
    paddingBottom: space.s24,
    gap: space.s4,
  },
  consent: { textAlign: 'center', marginTop: space.s4 },
});
