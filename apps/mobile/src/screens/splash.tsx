// screens/splash.md: full brand moment on first launch only; later launches leave as soon as
// local data is ready (13 §7.3, review U-13).
import {
  brand,
  color,
  easing,
  radius,
  size,
  space,
  Text,
  useMotion,
  Wordmark,
} from '@toli/design-system';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { kvGet } from '../data/identity.ts';
import { listTrips } from '../data/repo.ts';

const FIRST_RUN_MS = 2900;

export function SplashScreen() {
  const { reduced } = useMotion();
  const firstRun = kvGet('onboarding_seen') !== 'true';
  const icon = useSharedValue(0);
  const stub = useSharedValue(0);
  const word = useSharedValue(0);
  const bar = useSharedValue(0);

  useEffect(() => {
    const next = () => router.replace(listTrips().length > 0 || !firstRun ? '/trips' : '/welcome');
    if (!firstRun || reduced) {
      next();
      return;
    }
    icon.value = withTiming(1, { duration: 600, easing: easing('pop') });
    stub.value = withDelay(1000, withTiming(1, { duration: 700, easing: easing('pop') }));
    word.value = withDelay(1300, withTiming(1, { duration: 600, easing: easing('enter') }));
    bar.value = withDelay(500, withTiming(1, { duration: 2400, easing: easing('move') }));
    const t = setTimeout(next, FIRST_RUN_MS);
    return () => clearTimeout(t);
  }, [firstRun, reduced, icon, stub, word, bar]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: icon.value,
    transform: [{ scale: 0.6 + 0.4 * icon.value }, { rotate: `${-8 * (1 - icon.value)}deg` }],
  }));
  const stubStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 12 * stub.value },
      { translateY: 10 * stub.value },
      { rotate: `${14 * stub.value}deg` },
    ],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: 14 * (1 - word.value) }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  if (!firstRun) return <View style={styles.fill} />;
  return (
    <View style={styles.fill} accessibilityLabel="Toli, loading your trips">
      <View style={styles.center}>
        <Animated.View style={[styles.icon, iconStyle]}>
          <View style={styles.iconBody} />
          <Animated.View style={[styles.iconStub, stubStyle]} />
          <View style={[styles.iconNotch, { top: -space.s8 }]} />
          <View style={[styles.iconNotch, { bottom: -space.s8 }]} />
        </Animated.View>
        <Animated.View style={wordStyle}>
          <Wordmark size={brand.wordmark.large} />
        </Animated.View>
      </View>
      <View style={styles.loader}>
        <Text variant="label" tone="muted">
          LOADING YOUR TRIPS
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.barFill, barStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s32 + space.s4 },
  icon: { flexDirection: 'row', width: brand.mark.width, height: brand.mark.height },
  iconBody: {
    width: brand.mark.body,
    height: brand.mark.height,
    backgroundColor: color.accent,
    borderTopLeftRadius: radius.cta,
    borderBottomLeftRadius: radius.cta,
  },
  iconStub: {
    width: brand.mark.stub,
    height: brand.mark.height,
    backgroundColor: color.accent,
    borderTopRightRadius: radius.cta,
    borderBottomRightRadius: radius.cta,
    borderLeftWidth: size.stampBorder,
    borderStyle: 'dashed',
    borderLeftColor: color.onAccent,
  },
  iconNotch: {
    position: 'absolute',
    left: brand.mark.notchAt,
    width: space.s16,
    height: space.s16,
    borderRadius: space.s8,
    backgroundColor: color.bg.base,
  },
  loader: {
    marginHorizontal: space.s40 * 2,
    marginBottom: space.s40 + space.s24,
    alignItems: 'center',
    gap: space.s10,
  },
  track: {
    alignSelf: 'stretch',
    height: space.s2 + 1,
    borderRadius: space.s2,
    backgroundColor: color.bg.raised,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: color.accent },
});
