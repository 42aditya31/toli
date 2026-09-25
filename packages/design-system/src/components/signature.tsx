import {
  ImpactFeedbackStyle,
  impactAsync,
  NotificationFeedbackType,
  notificationAsync,
} from 'expo-haptics';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Polygon, Text as SvgText } from 'react-native-svg';
import { easing, Text, useLayout, useMotion, useScreenReader } from '../foundation.tsx';
import { color, dur, font, opacity, radius, size, space } from '../tokens.ts';
import { Avatar, Button } from './basic.tsx';
import { Icon } from './Icon.tsx';
import { Sheet } from './overlay.tsx';
import { Zigzag } from './ticket.tsx';

/* ───────────── Stub ───────────── */

/** A torn piece of a ticket: zigzag top, avatar, name, amount (13 §6 `Stub`). */
export function Stub({
  initials,
  name,
  amount,
  torn = true,
  style,
}: {
  readonly initials: string;
  readonly name: string;
  /** Pre-formatted by the engine. */
  readonly amount: string;
  readonly torn?: boolean;
  readonly style?: ViewStyle;
}) {
  return (
    <View style={style} accessible accessibilityLabel={`${name}, ${amount}`}>
      {torn ? <Zigzag /> : null}
      <View style={[styles.stub, torn && styles.stubTorn]}>
        <Avatar initials={initials} size="avatarS" tone="onAccent" />
        <Text variant="smallStrong" tone="onAccent" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="mono" tone="onAccent">
          {amount}
        </Text>
      </View>
    </View>
  );
}

/* ───────────── StubBanner ───────────── */

export type StubBannerProps = {
  /** "TOLI · GOA WEEKEND"; the trip name is upper-cased here. */
  readonly tripName: string;
  /** "NOW", "2M", "1H". */
  readonly when: string;
  /** Message with an optional bold part: [before, bold, after]. */
  readonly message: readonly [string, string?, string?];
  /** Pre-formatted amount, e.g. "₹1,200". */
  readonly amount?: string;
  /** Money asks are lime; information stubs (alerts) use the raised shell. */
  readonly tone?: 'money' | 'info';
  readonly warning?: boolean;
  readonly action?: { readonly label: string; readonly icon?: 'upi'; readonly onPress: () => void };
  /** Once a payment is recorded: the honest copy (screens/notifications.md). */
  readonly paidNote?: string;
  readonly onDismiss?: () => void;
};

/** The in-app notification in the exact Tear-to-Split design (13 §6, screens/notifications). */
export function StubBanner({
  tripName,
  when,
  message,
  amount,
  tone = 'money',
  warning,
  action,
  paidNote,
  onDismiss,
}: StubBannerProps) {
  const { reduced } = useMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.value = withTiming(1, { duration: dur.ticket, easing: easing('pop') });
  }, [p, reduced]);
  const enter = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.8),
    transform: [{ translateY: -space.s40 * (1 - p.value) }, { scale: 0.86 + 0.14 * p.value }],
  }));
  const paid = paidNote !== undefined;
  const lime = tone === 'money' && !paid;
  const fg = lime ? 'onAccent' : 'text';
  const shell = lime ? color.accent : color.bg.raised;
  const [before, bold, after] = message;
  return (
    <Animated.View
      style={[styles.banner, enter]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Zigzag tint={shell} inset={space.s8} />
      <Pressable
        onPress={onDismiss}
        accessibilityHint={onDismiss ? 'Dismiss' : undefined}
        style={[styles.bannerCard, { backgroundColor: shell }]}
      >
        <View style={styles.bannerHead}>
          <Text variant="labelS" tone={fg} style={{ opacity: opacity.onAccentMuted }}>
            {`TOLI · ${tripName}`}
          </Text>
          <Text variant="labelS" tone={fg} style={{ opacity: opacity.onAccentMuted }}>
            {when}
          </Text>
        </View>
        <View style={styles.bannerMsg}>
          {warning ? <Icon name="warning" size="s" tint={color.warning} /> : null}
          <Text variant="caption" tone={fg} style={styles.flex}>
            {before}
            {bold ? (
              <Text variant="caption" tone={fg} style={{ fontFamily: font.semibold }}>
                {bold}
              </Text>
            ) : null}
            {after}
          </Text>
        </View>
        {amount ? (
          <Text variant="amountS" tone={fg}>
            {amount}
          </Text>
        ) : null}
        {paid ? (
          <View style={styles.paidBox}>
            <Text variant="captionStrong">{paidNote}</Text>
          </View>
        ) : action ? (
          <Button
            label={action.label}
            variant={lime ? 'onAccent' : 'tonal'}
            size="medium"
            {...(action.icon ? { icon: action.icon } : {})}
            onPress={action.onPress}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ───────────── HoldButton ───────────── */

export type HoldButtonProps = {
  readonly label: string;
  readonly holdingLabel?: string;
  readonly onComplete: () => void;
  readonly disabled?: boolean;
  /** Shown instead of the label when disabled (e.g. "Needs internet"). */
  readonly disabledLabel?: string;
  /** The "Tap instead of hold" setting (13 §6); a screen reader turns it on automatically. */
  readonly tapInstead?: boolean;
  /** The confirm sheet used in accessible mode. */
  readonly confirm: { readonly title: string; readonly body?: string; readonly action: string };
};

/**
 * Fills lime left → right over dur.hold with haptic ticks at 25/50/75/100%; releasing early
 * cancels (13 §6, D-012). Accessible mode: a tap opens a confirm sheet instead.
 */
export function HoldButton({
  label,
  holdingLabel = 'Keep holding…',
  onComplete,
  disabled,
  disabledLabel,
  tapInstead,
  confirm,
}: HoldButtonProps) {
  const screenReader = useScreenReader();
  const accessibleMode = !!tapInstead || screenReader;
  const fill = useSharedValue(0);
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [past, setPast] = useState(false);
  const done = useRef(false);

  const tick = (step: number) => {
    if (step >= 4) notificationAsync(NotificationFeedbackType.Success);
    else impactAsync(ImpactFeedbackStyle.Light);
  };
  const finish = () => {
    if (done.current) return;
    done.current = true;
    setHolding(false);
    fill.value = 0;
    onComplete();
  };
  useAnimatedReaction(
    () => Math.floor(fill.value * 4 + 1e-6),
    (step, prev) => {
      if (prev !== null && step > prev && step > 0) runOnJS(tick)(step);
      if (step >= 4 && prev !== null && prev < 4) runOnJS(finish)();
    },
  );
  useAnimatedReaction(
    () => fill.value > 0.55,
    (over, prev) => {
      if (over !== prev) runOnJS(setPast)(over);
    },
  );

  const start = () => {
    if (disabled || accessibleMode) return;
    done.current = false;
    setHolding(true);
    fill.value = withTiming(1, { duration: dur.hold, easing: Easing.linear });
  };
  const release = () => {
    if (done.current) return;
    cancelAnimation(fill);
    fill.value = 0;
    setHolding(false);
  };
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const text = disabled && disabledLabel ? disabledLabel : holding ? holdingLabel : label;
  const fg = past ? color.onAccent : disabled ? color.textMuted : color.text;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibleMode ? 'Double tap to confirm' : 'Press and hold'}
        accessibilityState={{ disabled: !!disabled }}
        onPressIn={start}
        onPressOut={release}
        onPress={() => {
          if (accessibleMode && !disabled) setConfirming(true);
        }}
        style={[styles.hold, disabled && { opacity: opacity.disabled }]}
      >
        <Animated.View style={[styles.holdFill, bar]} />
        <View style={styles.holdLabel}>
          <Text variant="cta" style={{ color: fg }}>
            {text}
          </Text>
          <Icon name="tear" tint={fg} />
        </View>
      </Pressable>
      <Sheet visible={confirming} onClose={() => setConfirming(false)} title={confirm.title}>
        {confirm.body ? (
          <Text variant="body" tone="muted">
            {confirm.body}
          </Text>
        ) : null}
        <View style={styles.sheetButtons}>
          <Button
            label={confirm.action}
            size="large"
            flex={1}
            onPress={() => {
              setConfirming(false);
              onComplete();
            }}
          />
          <Button
            label="Cancel"
            variant="danger"
            size="large"
            flex={1}
            onPress={() => setConfirming(false)}
          />
        </View>
      </Sheet>
    </>
  );
}

/* ───────────── Keypad + AmountDisplay ───────────── */

/** INR-style keys (D-013); decimal currencies get "." instead of "00". */
export function keypadKeys(decimal: boolean): readonly string[] {
  return ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimal ? '.' : '00', '0', '⌫'];
}

export function Keypad({
  onKey,
  decimal = false,
}: {
  readonly onKey: (key: string) => void;
  readonly decimal?: boolean;
}) {
  const keys = keypadKeys(decimal);
  const rows = [keys.slice(0, 3), keys.slice(3, 6), keys.slice(6, 9), keys.slice(9, 12)];
  return (
    <View style={styles.keypad}>
      {rows.map((row) => (
        <View key={row.join('')} style={styles.keyRow}>
          {row.map((k) => (
            <Pressable
              key={k}
              accessibilityRole="keyboardkey"
              accessibilityLabel={
                k === '⌫' ? 'Delete' : k === '00' ? 'Double zero' : k === '.' ? 'Decimal point' : k
              }
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onKey(k);
              }}
              style={({ pressed }) => [
                styles.key,
                pressed && { backgroundColor: color.bg.raised, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text variant="title">{k}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

/** "₹" + the typed amount + a blinking lime caret (13 §6 `AmountDisplay`). */
export function AmountDisplay({
  symbol,
  digits,
  spoken,
}: {
  readonly symbol: string;
  /** Already grouped for display, e.g. "1,200"; empty shows a faded "0". */
  readonly digits: string;
  readonly spoken: string;
}) {
  const { reduced } = useMotion();
  const blink = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur.caretBlink / 2 }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: dur.caretBlink / 2 }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
    );
  }, [blink, reduced]);
  const caret = useAnimatedStyle(() => ({ opacity: blink.value }));
  const empty = digits === '';
  return (
    <View style={styles.amountRow} accessible accessibilityLabel={empty ? 'No amount yet' : spoken}>
      <Text variant="currencyXL" tone="muted">
        {symbol}
      </Text>
      <Text
        variant="amountXL"
        adjustsFontSizeToFit
        numberOfLines={1}
        style={{ color: empty ? color.bg.raised : color.text }}
      >
        {empty ? '0' : digits}
      </Text>
      <Animated.View style={[styles.caret, caret]} />
    </View>
  );
}

/* ───────────── Wordmark ───────────── */

const ZIG = (h: number, w: number, from: number) => {
  // 5%-wide teeth between 55% and 62% of the height (13 §8, logo 3a).
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) pts.push(`${(i * w) / 20},${(i % 2 === 0 ? 0.55 : 0.62) * h}`);
  return from === 0 ? `0,0 ${w},0 ${pts.reverse().join(' ')}` : `${pts.join(' ')} ${w},${h} 0,${h}`;
};

/** "toli" drawn twice and clipped on a zigzag: the "Torn" wordmark, option 3a (13 §8). */
export function Wordmark({
  size: s = 56,
  onLime,
}: {
  readonly size?: number;
  readonly onLime?: boolean;
}) {
  const w = Math.round(s * 1.93);
  const h = Math.round(s * 1.07);
  const top = onLime ? color.onAccent : color.text;
  const bottom = onLime ? color.onAccent : color.accent;
  const base = h * 0.8;
  const common = {
    fontFamily: font.extrabold,
    fontSize: s,
    letterSpacing: -0.06 * s,
    textAnchor: 'middle' as const,
    x: w / 2,
    y: base,
  };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Toli">
      <Svg width={w} height={h}>
        <Defs>
          <ClipPath id="toli-top">
            <Polygon points={ZIG(h, w, 0)} />
          </ClipPath>
          <ClipPath id="toli-bottom">
            <Polygon points={ZIG(h, w, 1)} />
          </ClipPath>
        </Defs>
        {/* Android applies clip paths reliably on groups, not on text: wrap both halves. */}
        <G clipPath="url(#toli-top)">
          <SvgText {...common} fill={top}>
            toli
          </SvgText>
        </G>
        <G clipPath="url(#toli-bottom)">
          <SvgText
            {...common}
            fill={bottom}
            opacity={onLime ? 0.5 : 1}
            transform={`translate(${0.067 * s} ${0.085 * s}) rotate(3 ${w / 2} ${base})`}
          >
            toli
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/** Lays children out full width inside the standard gutter. */
export function Gutter({ children }: { readonly children: ReactNode }) {
  const { gutter } = useLayout();
  return <View style={{ paddingHorizontal: gutter }}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stub: {
    flex: 1,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s6,
    paddingVertical: space.s12,
    borderBottomLeftRadius: radius.cardS,
    borderBottomRightRadius: radius.cardS,
  },
  stubTorn: {
    borderTopLeftRadius: radius.stub.topLeft,
    borderTopRightRadius: radius.stub.topRight,
    borderBottomLeftRadius: radius.stub.bottomLeft,
    borderBottomRightRadius: radius.stub.bottomRight,
  },
  banner: { marginHorizontal: space.s12 },
  bannerCard: {
    borderTopLeftRadius: radius.stub.topLeft,
    borderTopRightRadius: radius.stub.topRight,
    borderBottomLeftRadius: radius.stub.bottomLeft,
    borderBottomRightRadius: radius.stub.bottomRight,
    padding: space.s12,
    gap: space.stackTight,
  },
  bannerHead: { flexDirection: 'row', justifyContent: 'space-between' },
  bannerMsg: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  paidBox: {
    height: size.buttonM,
    borderRadius: radius.chip,
    borderWidth: size.hairline + space.s2 / 4,
    borderColor: color.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hold: {
    height: size.holdButton,
    borderRadius: radius.cardS,
    backgroundColor: color.bg.raised,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color.accent },
  holdLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s10,
  },
  sheetButtons: { flexDirection: 'row', gap: space.stackTight, marginTop: space.s6 },
  keypad: { flex: 1, gap: space.stackTight },
  keyRow: { flex: 1, flexDirection: 'row', gap: space.stackTight },
  key: {
    flex: 1,
    minHeight: size.keyMin,
    borderRadius: radius.key,
    backgroundColor: color.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s2 },
  caret: {
    width: size.caret.width,
    height: size.caret.height,
    backgroundColor: color.accent,
    marginLeft: space.s4,
    alignSelf: 'center',
  },
});
