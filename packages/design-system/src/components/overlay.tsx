import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { easing, Text, textStyle, useLayout, useMotion } from '../foundation.tsx';
import { color, dur, frame, opacity, radius, shadow, size, space, tear } from '../tokens.ts';
import { Avatar, Button } from './basic.tsx';
import { Icon } from './Icon.tsx';
import { Perforation, Zigzag } from './ticket.tsx';

const shadowStyle = (s: (typeof shadow)[keyof typeof shadow]): ViewStyle => ({
  shadowColor: color.onAccentPressed,
  shadowOffset: { width: s.x, height: s.y },
  shadowRadius: s.blur / 2,
  shadowOpacity: 0.4,
  elevation: s.elevation,
});

/* ───────────── Sheet ───────────── */

/** Bottom sheet over `color.scrim`, radius.sheet on top, traps focus (13 §6). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
        {title ? (
          <Text variant="header" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {children}
      </SafeAreaView>
    </Modal>
  );
}

/* ───────────── Toast ───────────── */

type ToastItem = { readonly id: number; readonly message: string; readonly undo?: () => void };
const ToastContext = createContext<(message: string, opts?: { undo?: () => void }) => void>(
  () => {},
);

/** "Show a toast" from anywhere: `useToast()('Saved')`. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, opts?: { undo?: () => void }) => {
    if (timer.current) clearTimeout(timer.current);
    setItem({ id: Date.now(), message, ...(opts?.undo ? { undo: opts.undo } : {}) });
    timer.current = setTimeout(() => setItem(null), opts?.undo ? dur.toastUndo : dur.toast);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <ToastContext.Provider value={show}>
      {children}
      {item ? <Toast key={item.id} item={item} onDone={() => setItem(null)} /> : null}
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { readonly item: ToastItem; readonly onDone: () => void }) {
  const { gutter } = useLayout();
  const { reduced } = useMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.value = withTiming(1, { duration: dur.fast, easing: easing('pop') });
  }, [p, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.5),
    transform: [{ translateY: space.s20 * (1 - p.value) }, { scale: 0.95 + 0.05 * p.value }],
  }));
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, { left: gutter, right: gutter }, shadowStyle(shadow.toast), style]}
    >
      <Text variant="bodyStrong" style={styles.toastText}>
        {item.message}
      </Text>
      {item.undo ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            item.undo?.();
            onDone();
          }}
          hitSlop={space.s10}
        >
          <Text variant="bodyStrong" style={styles.toastUndo}>
            Undo
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/* ───────────── Skeleton, SyncPill ───────────── */

/** Shimmer placeholder: bg.raised → bg.shimmer → bg.raised, 1.3 s linear (13 §6). */
export function Skeleton({
  width = '100%',
  height,
  radiusSize = radius.badge,
  circle,
}: {
  readonly width?: number | `${number}%`;
  readonly height: number;
  readonly radiusSize?: number;
  readonly circle?: boolean;
}) {
  const { reduced } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduced)
      t.value = withRepeat(withTiming(1, { duration: dur.shimmer, easing: Easing.linear }), -1);
  }, [t, reduced]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value,
      [0, 0.5, 1],
      [color.bg.raised, color.bg.shimmer, color.bg.raised],
    ),
  }));
  return (
    <Animated.View
      accessible={false}
      style={[{ width, height, borderRadius: circle ? height / 2 : radiusSize }, style]}
    />
  );
}

/** "Syncing Goa Weekend · 3 changes" (13 §6 `SyncPill`). */
export function SyncPill({ label }: { readonly label: string }) {
  const { reduced } = useMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!reduced)
      turn.value = withRepeat(
        withTiming(1, { duration: dur.ticket + 200, easing: Easing.linear }),
        -1,
      );
  }, [turn, reduced]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <View style={styles.pill} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Animated.View style={[styles.spinner, spin]} />
      <Text variant="captionStrong" style={{ color: color.bg.card }}>
        {label}
      </Text>
    </View>
  );
}

/* ───────────── TabBar ───────────── */

export type Tab = { readonly key: string; readonly label: string };

/** Tab list is config; R1a/R1b: Trip · (+) · Members (13 §6, OQ-P11). */
export function TabBar({
  tabs,
  active,
  onTab,
  onAdd,
  hideAdd,
}: {
  readonly tabs: readonly Tab[];
  readonly active: string;
  readonly onTab: (key: string) => void;
  readonly onAdd: () => void;
  readonly hideAdd?: boolean;
}) {
  const { width } = useWindowDimensions();
  const mid = Math.ceil(tabs.length / 2);
  const item = (t: Tab) => {
    const on = t.key === active;
    return (
      <Pressable
        key={t.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t.label}
        onPress={() => onTab(t.key)}
        style={styles.tab}
      >
        <Text variant="captionStrong" tone={on ? 'accent' : 'muted'}>
          {t.label}
        </Text>
        <View style={[styles.tabDot, { backgroundColor: on ? color.accent : color.transparent }]} />
      </Pressable>
    );
  };
  return (
    <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.tabWrap}>
      <Svg
        width={width}
        height={space.tabBarClearance}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="tabfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.bg.base} stopOpacity={0} />
            <Stop offset="0.45" stopColor={color.bg.base} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={space.tabBarClearance} fill="url(#tabfade)" />
      </Svg>
      <View style={styles.tabBar} accessibilityRole="tablist">
        {tabs.slice(0, mid).map(item)}
        {hideAdd ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add expense"
            onPress={onAdd}
            style={({ pressed }) => [
              styles.fab,
              shadowStyle(shadow.fab),
              pressed && {
                transform: [{ translateY: -size.fabRaise + space.s2 }, { scale: 0.94 }],
              },
            ]}
          >
            <Icon name="add" size="l" tint={color.onAccent} />
          </Pressable>
        )}
        {tabs.slice(mid).map(item)}
      </View>
    </SafeAreaView>
  );
}

/* ───────────── DateCurrencyChip, PayerSheet ───────────── */

/** "Today · ₹ ▾" on Add expense; opens the date / currency sheet (13 §6). */
export function DateCurrencyChip({
  label,
  onPress,
}: {
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, change date or currency`}
      onPress={onPress}
      style={styles.dateChip}
    >
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Icon name="expand" size="s" tint={color.textMuted} />
    </Pressable>
  );
}

export type PayerOption = { readonly id: string; readonly name: string; readonly initials: string };

/** Payer picker: recent first, search above 8 members, + Add payer (13 §6). */
export function PayerSheet({
  visible,
  onClose,
  people,
  onPick,
  onAddPayer,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Already ordered by the caller: recent payers first. */
  readonly people: readonly PayerOption[];
  readonly onPick: (id: string) => void;
  readonly onAddPayer?: () => void;
}) {
  const [q, setQ] = useState('');
  const shown = useMemo(
    () => (q ? people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : people),
    [people, q],
  );
  return (
    <Sheet visible={visible} onClose={onClose} title="Paid by">
      {people.length > 8 ? (
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search"
          placeholderTextColor={color.textMuted}
          accessibilityLabel="Search people"
          style={[styles.input, textStyle('body')]}
        />
      ) : null}
      {shown.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          onPress={() => onPick(p.id)}
          style={styles.payerRow}
        >
          <Avatar initials={p.initials} />
          <Text variant="bodyStrong">{p.name}</Text>
        </Pressable>
      ))}
      {onAddPayer ? (
        <Button label="+ Add payer" variant="tonal" size="medium" onPress={onAddPayer} />
      ) : null}
    </Sheet>
  );
}

/* ───────────── TearOverlay ───────────── */

export type TearPiece = {
  readonly name: string;
  readonly initials: string;
  readonly amount: string;
};

export type TearOverlayProps = {
  readonly label: string;
  readonly tripName: string;
  readonly title: string;
  readonly amount: string;
  readonly sub: string;
  readonly pieces: readonly TearPiece[];
  /** Called once when the sequence ends or is skipped. The data is already saved. */
  readonly onDone: () => void;
  /** 1 = the documented timing. */
  readonly speed?: number;
};

type Phase = 'print' | 'tear' | 'split' | 'fly' | 'done';

/**
 * Tear stubs (13 §7.3, screens/tear-overlay): the ticket rises, the perforation tears, the pieces
 * split and fly to the avatars. It never blocks: any tap skips it. Reduce Motion: not shown at
 * all, and the caller's toast carries the message.
 */
export function TearOverlay({
  label,
  tripName,
  title,
  amount,
  sub,
  pieces,
  onDone,
  speed = 1,
}: TearOverlayProps) {
  const { reduced } = useMotion();
  const { width: W, height: H } = useWindowDimensions();
  const k = W / frame.width; // everything is laid out in reference units × k
  const y0 = Math.max(0, (H - frame.height * k) / 2);
  const T = 1 / speed;
  const n = pieces.length;
  const [phase, setPhase] = useState<Phase>('print');
  const [got, setGot] = useState<boolean[]>(() => pieces.map(() => false));
  const ended = useRef(false);

  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (reduced || n === 0) {
      end();
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms * T));
    at(tear.tearAt, () => setPhase('tear'));
    at(tear.splitAt, () => setPhase('split'));
    at(tear.flyAt, () => setPhase('fly'));
    for (let i = 0; i < n; i++) {
      at(tear.flyAt + tear.fly + i * tear.stagger, () =>
        setGot((g) => g.map((v, j) => (j === i ? true : v))),
      );
    }
    const last = tear.flyAt + tear.fly + n * tear.stagger + tear.settleAfterLast;
    at(last, () => setPhase('done'));
    at(last + tear.fadeOut, end);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      end();
      return true;
    });
    return () => {
      for (const t of timers) clearTimeout(t);
      back.remove();
    };
  }, [reduced, n, T, end]);

  const rise = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    rise.value = withTiming(1, { duration: tear.rise * T, easing: easing('screen') });
  }, [rise, T]);
  useEffect(() => {
    if (phase === 'done') fade.value = withTiming(0, { duration: tear.fadeOut * T });
  }, [phase, fade, T]);
  const layer = useAnimatedStyle(() => ({ opacity: fade.value }));
  const riseStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.value * 1.4),
    transform: [{ translateY: 160 * k * (1 - rise.value) }, { scale: 0.9 + 0.1 * rise.value }],
  }));

  if (reduced || n === 0) return null;

  const torn = phase !== 'print';
  const allGot = got.every(Boolean);
  const gap = Math.min(76, 320 / n);
  const avatarX = pieces.map((_, i) => 185 + (i - (n - 1) / 2) * gap);
  const base = Math.floor(310 / n);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.tearLayer, layer]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={end}
        accessibilityLabel="Skip"
        accessibilityRole="button"
      >
        <View
          style={{
            position: 'absolute',
            top: y0 + 58 * k,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Text variant="label" tone="muted" style={{ letterSpacing: 0.14 * 11 }}>
            {allGot ? 'STUBS READY' : 'TEARING'}
          </Text>
        </View>
        {pieces.map((p, i) => (
          <View
            key={`a${p.name}`}
            style={[
              styles.tearAvatar,
              { top: y0 + 80 * k, left: (avatarX[i] as number) * k - size.avatarXL / 2 },
            ]}
          >
            <Avatar initials={p.initials} size="avatarXL" tone={got[i] ? 'accent' : 'raised'} />
            <Text variant="smallStrong">{p.name}</Text>
            <Text variant="label" tone={got[i] ? 'accent' : 'muted'} style={styles.noCaps}>
              {got[i] ? p.amount : '·'}
            </Text>
          </View>
        ))}
        <Animated.View style={[StyleSheet.absoluteFill, riseStyle]} pointerEvents="none">
          <View
            style={[
              styles.tearTicket,
              {
                top: y0 + 234 * k,
                left: 30 * k,
                width: 310 * k,
                height: 190 * k,
                transform: [{ translateY: torn ? -8 : 0 }],
              },
            ]}
          >
            <View style={styles.tearTicketHead}>
              <View style={styles.tearPill}>
                <Text variant="smallStrong" tone="accent">
                  {label}
                </Text>
              </View>
              <Text
                variant="label"
                tone="onAccent"
                style={[styles.noCaps, { opacity: opacity.onAccentMuted }]}
              >
                {tripName}
              </Text>
            </View>
            <Text variant="header" tone="onAccent" numberOfLines={1}>
              {title}
            </Text>
            <Text variant="amountL" tone="onAccent">
              {amount}
            </Text>
            <Text variant="small" tone="onAccent" style={{ opacity: opacity.onAccentSub }}>
              {sub}
            </Text>
            <View style={styles.tearEdge}>
              {torn ? <Zigzag direction="down" /> : <Perforation inset={space.s8} />}
            </View>
            <View style={[styles.tearNotch, { left: -space.s12 }]} />
            <View style={[styles.tearNotch, { right: -space.s12 }]} />
          </View>
          {pieces.map((p, i) => {
            const w = i === n - 1 ? 310 - base * (n - 1) : base;
            const left = 30 + base * i;
            return (
              <FlyingStub
                key={`p${p.name}`}
                piece={p}
                index={i}
                count={n}
                phase={phase}
                landed={!!got[i]}
                k={k}
                top={y0 + 424 * k}
                left={left * k}
                width={w * k}
                dx={((avatarX[i] as number) - (left + w / 2)) * k}
                dy={(80 + 26 - (424 + 55)) * k}
                T={T}
              />
            );
          })}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function FlyingStub({
  piece,
  index: i,
  count: n,
  phase,
  landed,
  k,
  top,
  left,
  width,
  dx,
  dy,
  T,
}: {
  readonly piece: TearPiece;
  readonly index: number;
  readonly count: number;
  readonly phase: Phase;
  readonly landed: boolean;
  readonly k: number;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly dx: number;
  readonly dy: number;
  readonly T: number;
}) {
  const mid = i - (n - 1) / 2;
  const torn = phase !== 'print';
  const split = phase === 'split' || phase === 'fly' || phase === 'done';
  const flying = phase === 'fly' || phase === 'done';
  const delay = i * tear.stagger * T;
  const style = useAnimatedStyle(() => {
    const core =
      phase === 'tear'
        ? { y: 14 + 4 * i, x: 0, r: 2, s: 1 }
        : phase === 'split'
          ? { y: 30, x: mid * 14, r: mid * 7, s: 1 }
          : flying
            ? { y: 0, x: 0, r: mid * 22 + 10, s: 0.34 }
            : { y: 0, x: 0, r: 0, s: 1 };
    const pop = { duration: 420 * T, easing: easing('pop') };
    return {
      opacity: withTiming(landed ? 0 : 1, { duration: 150 }),
      transform: [
        {
          translateX: withDelay(
            flying ? delay : 0,
            withTiming(flying ? dx : 0, { duration: tear.fly * T, easing: easing('move') }),
          ),
        },
        {
          translateY: withDelay(
            flying ? delay : 0,
            withTiming(flying ? dy : 0, { duration: tear.fly * T, easing: easing('pop') }),
          ),
        },
        { translateX: withDelay(flying ? delay : 0, withTiming(core.x * k, pop)) },
        { translateY: withDelay(flying ? delay : 0, withTiming(core.y * k, pop)) },
        { rotate: withDelay(flying ? delay : 0, withTiming(`${core.r}deg`, pop)) },
        { scale: withDelay(flying ? delay : 0, withTiming(core.s, pop)) },
      ],
    };
  }, [phase, landed]);
  const outerRadius =
    n === 1
      ? { borderBottomLeftRadius: radius.cardS, borderBottomRightRadius: radius.cardS }
      : i === 0
        ? { borderBottomLeftRadius: radius.cardS }
        : i === n - 1
          ? { borderBottomRightRadius: radius.cardS }
          : {};
  return (
    <Animated.View style={[{ position: 'absolute', top, left, width, height: 110 * k }, style]}>
      {torn ? <Zigzag /> : null}
      <View
        style={[
          styles.flyStub,
          split
            ? {
                borderTopLeftRadius: radius.stub.topLeft,
                borderTopRightRadius: radius.stub.topRight,
                borderBottomLeftRadius: radius.stub.bottomLeft,
                borderBottomRightRadius: radius.stub.bottomRight,
                ...shadowStyle(shadow.stub),
              }
            : outerRadius,
        ]}
      >
        <Avatar initials={piece.initials} size="avatarS" tone="onAccent" />
        <Text variant="smallStrong" tone="onAccent" numberOfLines={1}>
          {piece.name}
        </Text>
        <Text variant="monoS" tone="onAccent" style={{ fontFamily: textStyle('mono').fontFamily }}>
          {piece.amount}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: color.scrim },
  sheet: {
    backgroundColor: color.bg.raised,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.s20,
    paddingTop: space.s20 + space.s2,
    paddingBottom: space.s28,
    gap: space.s12,
  },
  toast: {
    position: 'absolute',
    bottom: space.tabBarClearance + space.s2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    backgroundColor: color.text,
    borderRadius: radius.key,
    paddingVertical: space.s14,
    paddingHorizontal: space.s16,
    zIndex: 30,
  },
  toastText: { flex: 1, color: color.bg.card },
  toastUndo: { color: color.onAccent },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    alignSelf: 'center',
    paddingVertical: space.s10,
    paddingHorizontal: space.s16,
    borderRadius: radius.pill,
    backgroundColor: color.text,
  },
  spinner: {
    width: space.s14,
    height: space.s14,
    borderRadius: space.s14 / 2,
    borderWidth: size.perforation + space.s2 / 4,
    borderColor: color.textMuted,
    borderTopColor: color.bg.card,
  },
  tabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: space.tabBarClearance,
    justifyContent: 'flex-end',
    paddingHorizontal: size.tabBarInset,
    paddingBottom: space.s16,
    zIndex: 4,
  },
  tabBar: {
    height: size.tabBar,
    borderRadius: radius.card,
    backgroundColor: color.bg.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: space.s6,
  },
  tab: {
    minWidth: size.iconButton + space.s12,
    height: size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s4,
  },
  tabDot: { width: size.tabDot, height: size.tabDot, borderRadius: size.tabDot / 2 },
  fab: {
    width: size.fab,
    height: size.fab,
    borderRadius: size.fabRadius,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -size.fabRaise }],
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    height: size.buttonS,
    paddingHorizontal: space.s12,
    borderRadius: radius.chip,
    backgroundColor: color.bg.card,
  },
  input: {
    height: size.buttonL - space.s2,
    borderRadius: radius.control,
    backgroundColor: color.bg.card,
    color: color.text,
    paddingHorizontal: space.s14,
  },
  payerRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.row },
  tearLayer: { backgroundColor: color.scrimStrong, zIndex: 20 },
  tearAvatar: {
    position: 'absolute',
    width: size.avatarXL,
    alignItems: 'center',
    gap: space.s6,
    overflow: 'visible',
  },
  noCaps: { textTransform: 'none' },
  tearTicket: {
    position: 'absolute',
    backgroundColor: color.accent,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingVertical: space.s18,
    paddingHorizontal: space.s20,
    gap: space.s8,
  },
  tearTicketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tearPill: {
    backgroundColor: color.onAccent,
    borderRadius: radius.pill,
    paddingVertical: space.s4 + 1,
    paddingHorizontal: space.s10,
  },
  tearEdge: { position: 'absolute', left: space.s12, right: space.s12, bottom: -size.tooth.height },
  tearNotch: {
    position: 'absolute',
    bottom: 0,
    width: space.s24,
    height: space.s12,
    borderTopLeftRadius: space.s12,
    borderTopRightRadius: space.s12,
    backgroundColor: color.bg.overlayNotch,
  },
  flyStub: {
    flex: 1,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s4 + 1,
  },
});
