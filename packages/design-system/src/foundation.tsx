import { formatMoney, spokenMoney } from '@toli/engine';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';
import { color, compact, dur, ease, space, type TypeName, type as typeTokens } from './tokens.ts';

/** The compact layout below 380 px (13 §9). */
export function useLayout() {
  const { width } = useWindowDimensions();
  const isCompact = width < compact.breakpoint;
  return { width, isCompact, gutter: isCompact ? compact.gutter : space.gutter };
}

/** A token's React Native text style; the compact layout shrinks display and amountXL (13 §9). */
export function textStyle(name: TypeName, isCompact = false): TextStyle {
  const t = typeTokens[name];
  const fontSize =
    isCompact && name === 'display'
      ? compact.display
      : isCompact && name === 'amountXL'
        ? compact.amountXL
        : t.fontSize;
  return {
    fontFamily: t.fontFamily,
    fontSize,
    letterSpacing: t.tracking * fontSize,
    lineHeight: Math.round(t.line * fontSize),
    fontVariant: ['tabular-nums'],
    ...('uppercase' in t && t.uppercase ? { textTransform: 'uppercase' as const } : {}),
  };
}

export type TextProps = RNTextProps & {
  readonly variant?: TypeName;
  readonly tone?: 'text' | 'muted' | 'accent' | 'onAccent' | 'warning' | 'danger';
  readonly children?: ReactNode;
};

const TONE = {
  text: color.text,
  muted: color.textMuted,
  accent: color.accent,
  onAccent: color.onAccent,
  warning: color.warning,
  danger: color.danger,
} as const;

/** All text in the app goes through this, so every size comes from a type token (13 §3). */
export function Text({ variant = 'body', tone = 'text', style, children, ...rest }: TextProps) {
  const { isCompact } = useLayout();
  const t = typeTokens[variant];
  return (
    <RNText
      maxFontSizeMultiplier={'maxScale' in t ? t.maxScale : undefined}
      style={[textStyle(variant, isCompact), { color: TONE[tone] }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

/** Reanimated easing from an `ease` token (13 §7.1). */
export const easing = (name: keyof typeof ease) => {
  const [a, b, c, d] = ease[name];
  return Easing.bezier(a, b, c, d);
};

/** True when Reduce Motion is on: sequences become a 200 ms crossfade (13 §7.3). */
export function useMotion() {
  const reduced = useReducedMotion();
  return { reduced, duration: (ms: number) => (reduced ? dur.reduced : ms) };
}

/** Screen reader, Switch Access or voice control on: HoldButton becomes tap → confirm (13 §6). */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => alive && setOn(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

export type MoneyProps = Omit<TextProps, 'children'> & {
  readonly amount: bigint;
  readonly currency: string;
  readonly signed?: boolean;
  /** Numbers count up to a new value, never fade (13 §7.3). */
  readonly countUp?: boolean;
  /** Words read before the amount, e.g. "Rahul owes". */
  readonly spokenPrefix?: string;
};

function interpolate(from: bigint, to: bigint, t: number): bigint {
  const steps = 1000n;
  const k = BigInt(Math.round(t * 1000));
  return from + ((to - from) * k) / steps;
}

/** Every money value: formatted by the engine, with a spoken label (13 §10). */
export function Money({ amount, currency, signed, countUp, spokenPrefix, ...rest }: MoneyProps) {
  const { reduced } = useMotion();
  const [shown, setShown] = useState(amount);
  const last = useRef(amount);
  useEffect(() => {
    const from = last.current;
    last.current = amount;
    if (!countUp || reduced || from === amount) {
      setShown(amount);
      return;
    }
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur.count);
      // ease.enter (.33,1,.68,1) is exactly ease-out-cubic.
      const eased = 1 - (1 - t) ** 3;
      setShown(t >= 1 ? amount : interpolate(from, amount, eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount, countUp, reduced]);
  // With a prefix ("Rahul owes") the words carry the direction, so the amount is read unsigned.
  const spoken = spokenPrefix
    ? `${spokenPrefix} ${spokenMoney(amount < 0n ? -amount : amount, currency)}`
    : spokenMoney(amount, currency);
  return (
    <Text accessibilityLabel={spoken} {...rest}>
      {formatMoney(shown, currency, signed ? { signed: true } : {})}
    </Text>
  );
}
