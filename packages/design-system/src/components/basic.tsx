import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { Children, type ReactNode, useEffect } from 'react';
import { Pressable, type PressableProps, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { easing, Text, useLayout, useMotion } from '../foundation.tsx';
import { color, dur, opacity, radius, size, space, type TypeName } from '../tokens.ts';
import { Icon, type IconName } from './Icon.tsx';

/* ───────────── Layout ───────────── */

/** Base background, safe areas and the side gutter (13 §6 `Screen`). */
export function Screen({
  children,
  edgeToEdge,
  background = color.bg.base,
}: {
  readonly children: ReactNode;
  /** Draw under the status bar (Welcome). */
  readonly edgeToEdge?: boolean;
  readonly background?: string;
}) {
  return (
    <SafeAreaView
      edges={edgeToEdge ? ['bottom'] : ['top', 'bottom']}
      style={{ flex: 1, backgroundColor: background }}
    >
      {children}
    </SafeAreaView>
  );
}

/** A 44 px raised icon tile, e.g. back (13 §6 `Header`). */
export function IconButton({
  name,
  label,
  onPress,
}: {
  readonly name: IconName;
  readonly label: string;
  readonly onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressedRaised]}
    >
      <Icon name={name} size="l" />
    </Pressable>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  right,
  large,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly onBack?: () => void;
  readonly right?: ReactNode;
  /** Root screens ("Your trips") use `type.title` and no back button. */
  readonly large?: boolean;
}) {
  const { gutter } = useLayout();
  return (
    <View style={[styles.header, { paddingHorizontal: gutter }]}>
      {onBack ? <IconButton name="back" label="Back" onPress={onBack} /> : null}
      <View style={styles.headerText}>
        <Text variant={large ? 'title' : 'header'} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Dark card: rows separated by 1 px dividers (13 §6 `Card`). */
export function Card({
  children,
  style,
  padded = true,
  radiusSize = 'card',
}: {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
  readonly padded?: boolean;
  readonly radiusSize?: 'card' | 'cardS' | 'row';
}) {
  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius[radiusSize] },
        padded && { paddingHorizontal: space.cardPad, paddingVertical: space.s8 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Card header row: title left, a hint or link right. */
export function CardHeader({
  title,
  right,
}: {
  readonly title: string;
  readonly right?: ReactNode;
}) {
  return (
    <View style={styles.cardHeader}>
      <Text variant="bodyStrong" accessibilityRole="header">
        {title}
      </Text>
      {typeof right === 'string' ? (
        <Text variant="small" tone="muted">
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

/** List row: leading tile, title + subtitle, right value + caption (13 §6 `Row`). */
export function Row({
  leading,
  title,
  subtitle,
  value,
  caption,
  first,
  tall,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  readonly leading?: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly value?: ReactNode;
  readonly caption?: ReactNode;
  /** The first row in a card has no divider above it. */
  readonly first?: boolean;
  readonly tall?: boolean;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
}) {
  const body = (
    <>
      {leading}
      <View style={styles.rowText}>
        {typeof title === 'string' ? (
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
        ) : (
          title
        )}
        {typeof subtitle === 'string' ? (
          <Text variant="micro" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {value !== undefined || caption !== undefined ? (
        <View style={styles.rowRight}>
          {value}
          {typeof caption === 'string' ? (
            <Text variant="micro" tone="muted">
              {caption}
            </Text>
          ) : (
            caption
          )}
        </View>
      ) : null}
    </>
  );
  const style = [
    styles.row,
    { minHeight: tall ? size.rowTall : size.row },
    !first && styles.rowDivider,
  ];
  if (!onPress) {
    return (
      <View style={style} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && { opacity: opacity.onAccentSub }]}
    >
      {body}
    </Pressable>
  );
}

/* ───────────── Avatar ───────────── */

export function Avatar({
  initials,
  size: s = 'avatar',
  tone = 'raised',
  dashed,
}: {
  readonly initials: string;
  readonly size?: 'avatar' | 'avatarL' | 'avatarS' | 'avatarXL';
  /** `accent` for "you" or active; `onAccent` for avatars drawn on lime. */
  readonly tone?: 'raised' | 'accent' | 'onAccent';
  readonly dashed?: boolean;
}) {
  const d = size[s];
  const bg =
    tone === 'accent' ? color.accent : tone === 'onAccent' ? color.onAccent : color.bg.raised;
  const fg = tone === 'accent' ? 'onAccent' : tone === 'onAccent' ? 'accent' : 'text';
  const variant: TypeName =
    s === 'avatarXL' ? 'subhead' : s === 'avatarS' ? 'smallStrong' : 'captionStrong';
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        { width: d, height: d, borderRadius: d / 2, backgroundColor: bg },
        dashed && styles.dashed,
      ]}
    >
      <Text variant={variant} tone={fg} style={styles.avatarText}>
        {initials}
      </Text>
    </View>
  );
}

/* ───────────── Buttons ───────────── */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tonal'
  | 'ghost'
  | 'onAccent'
  | 'soft'
  | 'danger';

const BUTTON = {
  primary: {
    bg: color.accent,
    fg: color.onAccent,
    pressedBg: color.accent,
    pressedFg: color.onAccent,
  },
  secondary: {
    bg: color.text,
    fg: color.bg.card,
    pressedBg: color.accent,
    pressedFg: color.onAccent,
  },
  tonal: {
    bg: color.bg.raised,
    fg: color.text,
    pressedBg: color.bg.shimmer,
    pressedFg: color.text,
  },
  ghost: {
    bg: color.transparent,
    fg: color.textMuted,
    pressedBg: color.transparent,
    pressedFg: color.text,
  },
  onAccent: {
    bg: color.onAccent,
    fg: color.accent,
    pressedBg: color.onAccentPressed,
    pressedFg: color.accent,
  },
  soft: {
    bg: color.onAccentSoft,
    fg: color.onAccent,
    pressedBg: color.perforation,
    pressedFg: color.onAccent,
  },
  danger: {
    bg: color.bg.card,
    fg: color.danger,
    pressedBg: color.bg.raised,
    pressedFg: color.danger,
  },
} as const;

const BUTTON_SIZE = {
  cta: { height: size.cta, radius: radius.cta, type: 'cta' },
  large: { height: size.buttonL, radius: radius.key, type: 'bodyStrong' },
  medium: { height: size.buttonM, radius: radius.control, type: 'captionStrong' },
  small: { height: size.buttonS, radius: radius.chip, type: 'smallStrong' },
} as const;

export function Button({
  label,
  variant = 'primary',
  size: s = 'cta',
  icon,
  disabled,
  onPress,
  accessibilityLabel,
  flex,
  style,
}: {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly size?: keyof typeof BUTTON_SIZE;
  readonly icon?: IconName;
  /** Greyed look; still pressable so screens can explain why (e.g. a toast). */
  readonly disabled?: boolean;
  readonly onPress?: PressableProps['onPress'];
  readonly accessibilityLabel?: string;
  readonly flex?: number;
  readonly style?: ViewStyle;
}) {
  const v = BUTTON[variant];
  const z = BUTTON_SIZE[s];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          height: z.height,
          borderRadius: z.radius,
          backgroundColor: disabled ? color.bg.raised : pressed ? v.pressedBg : v.bg,
        },
        flex !== undefined && { flex },
        variant === 'ghost' && styles.ghost,
        style,
      ]}
    >
      {({ pressed }) => {
        const fg = disabled ? color.textMuted : pressed ? v.pressedFg : v.fg;
        return (
          <>
            <Text variant={z.type} style={{ color: fg }}>
              {label}
            </Text>
            {icon ? <Icon name={icon} tint={fg} /> : null}
          </>
        );
      }}
    </Pressable>
  );
}

/* ───────────── Chips, segmented, switch ───────────── */

export function Chip({
  label,
  selected,
  onPress,
  tag,
  height = 'pill',
}: {
  readonly label: string;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  /** Mono tag after the label: ₹ % × (split modes, 13 §6). */
  readonly tag?: string;
  /** `pill`: 32 px category pill; `tile`: 36 px radius-12 mode chip; `grid`: 44 px template tile. */
  readonly height?: 'pill' | 'tile' | 'grid';
}) {
  const h = height === 'pill' ? space.s32 : height === 'tile' ? size.buttonS : size.buttonM;
  const r = height === 'pill' ? radius.pill : height === 'tile' ? radius.chip : radius.control;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={[
        styles.chip,
        { height: h, borderRadius: r, backgroundColor: selected ? color.accent : color.bg.card },
        height === 'grid' && styles.chipGrid,
      ]}
    >
      <Text
        variant={height === 'pill' ? 'smallStrong' : 'captionStrong'}
        tone={selected ? 'onAccent' : 'text'}
      >
        {label}
      </Text>
      {tag ? (
        <Text
          variant="labelS"
          tone={selected ? 'onAccent' : 'text'}
          style={{ opacity: opacity.onAccentMuted }}
        >
          {tag}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange?: (v: T) => void;
  readonly disabled?: boolean;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: !!disabled }}
            onPress={() => !disabled && onChange?.(o.value)}
            style={[styles.segment, { backgroundColor: on ? color.accent : color.transparent }]}
          >
            <Text variant="captionStrong" tone={on ? 'onAccent' : 'text'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Switch({
  value,
  onChange,
  label,
}: {
  readonly value: boolean;
  readonly onChange: (v: boolean) => void;
  readonly label: string;
}) {
  const { duration } = useMotion();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: duration(dur.tap), easing: easing('move') });
  }, [value, x, duration]);
  const travel = size.switchTrack.width - size.switchThumb - space.s6;
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: space.s2 + x.value * travel }],
  }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={space.s8}
      style={[styles.switchTrack, { backgroundColor: value ? color.accent : color.bg.raised }]}
    >
      <Animated.View style={[styles.switchThumb, thumb]} />
    </Pressable>
  );
}

/* ───────────── Progress ───────────── */

export function ProgressBar({
  fraction,
  tone = 'accent',
  thick,
}: {
  /** 0…1 (display only; money is never a float). */
  readonly fraction: number;
  readonly tone?: 'accent' | 'text' | 'warning' | 'onAccent';
  readonly thick?: boolean;
}) {
  const { duration } = useMotion();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, fraction)), {
      duration: duration(dur.ring),
      easing: easing('screen'),
    });
  }, [fraction, w, duration]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const h = thick ? size.barThick : size.bar;
  const tint =
    tone === 'accent'
      ? color.accent
      : tone === 'warning'
        ? color.warning
        : tone === 'onAccent'
          ? color.onAccent
          : color.text;
  return (
    <View style={[styles.bar, { height: h, borderRadius: h }]} accessible={false}>
      <Animated.View style={[{ height: h, borderRadius: h, backgroundColor: tint }, fill]} />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Kitty ring: 140 px, stroke 14, round cap (13 §6). */
export function Ring({
  fraction,
  warning,
  children,
}: {
  readonly fraction: number;
  readonly warning?: boolean;
  readonly children?: ReactNode;
}) {
  const { duration } = useMotion();
  const d = size.ring;
  const r = (d - size.ringStroke) / 2 - space.s2 / 2;
  const circumference = 2 * Math.PI * r;
  const f = useSharedValue(0);
  useEffect(() => {
    f.value = withTiming(Math.max(0, Math.min(1, fraction)), {
      duration: duration(dur.ring),
      easing: easing('screen'),
    });
  }, [fraction, f, duration]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - f.value) }));
  return (
    <View style={{ width: d, height: d }}>
      <Svg width={d} height={d} style={styles.ringSvg}>
        <Circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          stroke={color.bg.raised}
          strokeWidth={size.ringStroke}
          fill="none"
        />
        <AnimatedCircle
          cx={d / 2}
          cy={d / 2}
          r={r}
          stroke={warning ? color.warning : color.accent}
          strokeWidth={size.ringStroke}
          strokeLinecap="round"
          strokeDasharray={[circumference, circumference]}
          fill="none"
          animatedProps={props}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/* ───────────── Banner, stamp ───────────── */

export function Banner({
  children,
  tone = 'info',
  icon,
  action,
}: {
  readonly children: ReactNode;
  readonly tone?: 'info' | 'warning' | 'offline';
  readonly icon?: IconName;
  readonly action?: ReactNode;
}) {
  const glyph =
    icon ?? (tone === 'warning' ? 'warning' : tone === 'offline' ? 'offline' : undefined);
  return (
    <View
      style={styles.banner}
      accessible={!action}
      accessibilityRole={tone === 'warning' ? 'alert' : 'summary'}
    >
      {glyph ? (
        <Icon name={glyph} tint={tone === 'warning' ? color.warning : color.textMuted} />
      ) : null}
      <View style={styles.bannerText}>
        {typeof children === 'string' ? <Text variant="caption">{children}</Text> : children}
      </View>
      {action}
    </View>
  );
}

/** Rubber stamp: SETTLED / PAID / SQUARE, rotated −12°, pops in (13 §6, §7.3). */
export function Stamp({
  label,
  tone = 'onAccent',
  animate = true,
  delay = 0,
}: {
  readonly label: string;
  readonly tone?: 'onAccent' | 'muted' | 'accent';
  readonly animate?: boolean;
  readonly delay?: number;
}) {
  const { reduced } = useMotion();
  const p = useSharedValue(animate && !reduced ? 0 : 1);
  useEffect(() => {
    if (!animate || reduced) return;
    const t = setTimeout(() => {
      p.value = withTiming(1, { duration: dur.ticket, easing: easing('pop') });
    }, delay);
    return () => clearTimeout(t);
  }, [animate, reduced, delay, p]);
  // 2.4 → 0.92 → 1 and −30° → −12° come from ease.pop overshooting (13 §7.3).
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.6),
    transform: [{ scale: 2.4 - 1.4 * p.value }, { rotate: `${-30 + 18 * p.value}deg` }],
  }));
  const tint =
    tone === 'onAccent' ? color.onAccent : tone === 'accent' ? color.accent : color.textMuted;
  return (
    <Animated.View style={[styles.stamp, { borderColor: tint }, style]}>
      <Text variant="monoL" style={{ color: tint, letterSpacing: space.s2 / 2 }}>
        {label}
      </Text>
    </Animated.View>
  );
}

/** Lays out children in a row with the standard tight gap. */
export function Inline({
  children,
  gap = space.stackTight,
}: {
  readonly children: ReactNode;
  readonly gap?: number;
}) {
  return <View style={[styles.inline, { gap }]}>{Children.toArray(children)}</View>;
}

const styles = StyleSheet.create({
  iconButton: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.control,
    backgroundColor: color.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedRaised: { backgroundColor: color.bg.shimmer },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingTop: space.s8,
    paddingBottom: space.s12,
  },
  headerText: { flex: 1, minWidth: 0 },
  card: { backgroundColor: color.bg.card },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.s10,
    paddingBottom: space.s4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  rowDivider: { borderTopWidth: size.hairline, borderTopColor: color.divider },
  rowText: { flex: 1, minWidth: 0 },
  rowRight: { alignItems: 'flex-end' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { textAlign: 'center' },
  dashed: { borderWidth: size.hairline, borderStyle: 'dashed', borderColor: color.textMuted },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s10,
    paddingHorizontal: space.s16,
  },
  ghost: { paddingHorizontal: space.s8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s6,
    paddingHorizontal: space.s12,
  },
  chipGrid: { flex: 1, paddingHorizontal: space.s4 },
  segmented: {
    flexDirection: 'row',
    padding: space.s4,
    borderRadius: radius.control,
    backgroundColor: color.bg.base,
  },
  segment: {
    flex: 1,
    height: size.buttonS,
    borderRadius: radius.chip - space.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: {
    width: size.switchTrack.width,
    height: size.switchTrack.height,
    borderRadius: size.switchTrack.height / 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: size.switchThumb,
    height: size.switchThumb,
    borderRadius: size.switchThumb / 2,
    backgroundColor: color.text,
  },
  bar: { backgroundColor: color.bg.raised, overflow: 'hidden' },
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    paddingHorizontal: space.s14,
    paddingVertical: space.s12,
    borderRadius: radius.key,
    backgroundColor: color.bg.raised,
  },
  bannerText: { flex: 1 },
  stamp: {
    paddingHorizontal: space.s10,
    paddingVertical: space.s6,
    borderWidth: size.stampBorder,
    borderRadius: radius.chip - space.s2,
    alignSelf: 'flex-start',
  },
  inline: { flexDirection: 'row', alignItems: 'center' },
});
