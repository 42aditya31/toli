/**
 * Toli design tokens: the single source of every colour, size, radius, shadow, easing and
 * duration (docs/13-design-system.md). Each token has exactly one value. Screens in apps/ may not
 * use raw values; if a value is missing, add a token here first (and to 13).
 */

export const color = {
  bg: {
    base: '#2B2F36',
    card: '#212429',
    raised: '#393E47',
    shimmer: '#474D57',
    bezel: '#0E0F11',
    overlayNotch: '#16181B',
  },
  accent: '#D4F26A',
  onAccent: '#1F2A00',
  onAccentPressed: '#000000',
  text: '#F2F4F6',
  textMuted: '#A3A9B3',
  /** Alias of bg.base: 1 px row separators inside cards. */
  divider: '#2B2F36',
  warning: '#F2B54A',
  onWarning: '#2A1C00',
  danger: '#FF7A6B',
  focus: '#D4F26A',
  scrim: 'rgba(14,15,17,0.70)',
  scrimStrong: 'rgba(20,22,25,0.90)',
  perforation: 'rgba(31,42,0,0.35)',
  onAccentSoft: 'rgba(31,42,0,0.12)',
  transparent: 'transparent',
} as const;

export const opacity = {
  disabled: 0.45,
  /** Secondary text on lime (the "LIVE" label, sub-lines on tickets). */
  onAccentMuted: 0.7,
  onAccentSub: 0.75,
} as const;

/** Font family names registered by `toliFonts` (one family per weight; Android needs this). */
export const font = {
  regular: 'BricolageGrotesque_400Regular',
  semibold: 'BricolageGrotesque_600SemiBold',
  extrabold: 'BricolageGrotesque_800ExtraBold',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type TypeToken = {
  readonly fontFamily: string;
  readonly fontSize: number;
  /** In em, as in 13 §3; converted to px by `textStyle`. */
  readonly tracking: number;
  /** Line height as a multiple of the size. */
  readonly line: number;
  readonly uppercase?: boolean;
  /** Dynamic-type cap (13 §3). */
  readonly maxScale?: number;
};

export const type = {
  hero: { fontFamily: font.extrabold, fontSize: 72, tracking: -0.04, line: 0.9, maxScale: 1.3 },
  amountXL: { fontFamily: font.extrabold, fontSize: 64, tracking: -0.04, line: 1, maxScale: 1.3 },
  currencyXL: { fontFamily: font.semibold, fontSize: 34, tracking: 0, line: 1 },
  display: { fontFamily: font.extrabold, fontSize: 52, tracking: -0.04, line: 0.95, maxScale: 1.3 },
  amountL: { fontFamily: font.extrabold, fontSize: 48, tracking: -0.03, line: 1 },
  amountM: { fontFamily: font.extrabold, fontSize: 40, tracking: -0.03, line: 1 },
  titleL: { fontFamily: font.extrabold, fontSize: 36, tracking: -0.03, line: 1 },
  title: { fontFamily: font.extrabold, fontSize: 28, tracking: -0.02, line: 1.1 },
  amountS: { fontFamily: font.extrabold, fontSize: 22, tracking: -0.02, line: 1.1 },
  header: { fontFamily: font.semibold, fontSize: 20, tracking: 0, line: 1.2 },
  subhead: { fontFamily: font.semibold, fontSize: 18, tracking: 0, line: 1.3 },
  /** 56 px CTA labels ("Create trip", "Save & tear stubs"): prototype 17/600. Added in M3. */
  cta: { fontFamily: font.semibold, fontSize: 17, tracking: 0, line: 1.2 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, tracking: 0, line: 1.35 },
  body: { fontFamily: font.regular, fontSize: 14, tracking: 0, line: 1.45 },
  caption: { fontFamily: font.regular, fontSize: 13, tracking: 0, line: 1.4 },
  /** Chips, template tiles, small buttons: prototype 13/600. Added in M3. */
  captionStrong: { fontFamily: font.semibold, fontSize: 13, tracking: 0, line: 1.3 },
  small: { fontFamily: font.regular, fontSize: 12, tracking: 0, line: 1.4 },
  /** Category chips, payment-card buttons: prototype 12/600. Added in M3. */
  smallStrong: { fontFamily: font.semibold, fontSize: 12, tracking: 0, line: 1.3 },
  micro: { fontFamily: font.regular, fontSize: 11, tracking: 0, line: 1.3 },
  monoL: { fontFamily: font.monoBold, fontSize: 16, tracking: 0, line: 1.3 },
  mono: { fontFamily: font.monoBold, fontSize: 14, tracking: 0, line: 1.3 },
  monoS: { fontFamily: font.monoMedium, fontSize: 13, tracking: 0, line: 1.3 },
  label: { fontFamily: font.monoBold, fontSize: 11, tracking: 0.12, line: 1.3, uppercase: true },
  labelS: { fontFamily: font.monoBold, fontSize: 10, tracking: 0.1, line: 1.3, uppercase: true },
} as const satisfies Record<string, TypeToken>;

export type TypeName = keyof typeof type;

/** The compact layout below 380 px (13 §9). */
export const compact = {
  breakpoint: 380,
  display: 44,
  amountXL: 54,
  gutter: 16,
} as const;

export const space = {
  s2: 2,
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s18: 18,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  gutter: 18,
  cardPad: 16,
  heroPad: 20,
  stack: 12,
  stackTight: 8,
  /** Bottom room for the floating tab bar (13 §9). */
  tabBarClearance: 110,
} as const;

export const radius = {
  badge: 8,
  chip: 12,
  control: 14,
  key: 16,
  cta: 18,
  cardS: 20,
  row: 22,
  card: 24,
  sheet: 28,
  pill: 999,
  /** `4 4 16 16` (13 §4). */
  stub: { topLeft: 4, topRight: 4, bottomLeft: 16, bottomRight: 16 },
} as const;

export const size = {
  iconButton: 44,
  cta: 56,
  buttonM: 44,
  buttonS: 36,
  /** Sheet buttons ("Same one, skip"): 50 high, radius.key (screens/add-expense). Added in M3. */
  buttonL: 50,
  row: 52,
  rowTall: 58,
  avatar: 34,
  avatarL: 40,
  avatarS: 28,
  avatarXL: 52,
  keyMin: 48,
  fab: 60,
  fabRadius: 22,
  fabRaise: 16,
  tabBar: 64,
  tabBarInset: 14,
  tabDot: 5,
  stampBorder: 3,
  hairline: 1,
  perforation: 2,
  bar: 6,
  barThick: 8,
  ring: 140,
  ringStroke: 14,
  notch: 20,
  notchS: 18,
  notchL: 32,
  holdButton: 60,
  tooth: { width: 9, height: 6 },
  caret: { width: 3, height: 52 },
  checkbox: 26,
  switchTrack: { width: 46, height: 28 },
  switchThumb: 22,
} as const;

export type Shadow = {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly color: string;
  /** Android elevation that approximates it. */
  readonly elevation: number;
};

export const shadow = {
  fab: { x: 0, y: 12, blur: 24, color: 'rgba(0,0,0,0.35)', elevation: 12 },
  toast: { x: 0, y: 16, blur: 32, color: 'rgba(0,0,0,0.40)', elevation: 16 },
  stub: { x: 0, y: 18, blur: 30, color: 'rgba(0,0,0,0.40)', elevation: 18 },
} as const satisfies Record<string, Shadow>;

export const icon = { s: 16, m: 20, l: 24 } as const;

/** Cubic-bezier control points (13 §7.1): the only easings allowed. */
export const ease = {
  enter: [0.33, 1, 0.68, 1],
  move: [0.65, 0, 0.35, 1],
  pop: [0.34, 1.56, 0.64, 1],
  screen: [0.2, 0.9, 0.3, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const dur = {
  tap: 180,
  fast: 280,
  base: 380,
  count: 400,
  ticket: 500,
  hold: 900,
  toast: 2800,
  toastUndo: 5000,
  /** Reduce Motion replaces sequences with this crossfade (13 §7.3). */
  reduced: 200,
  shimmer: 1300,
  caretBlink: 1000,
  ring: 900,
} as const;

/** The tear-stubs sequence (13 §7.3, screens/tear-overlay.md), in ms before the 1/speed factor. */
export const tear = {
  rise: 500,
  tearAt: 550,
  splitAt: 950,
  flyAt: 1350,
  fly: 780,
  stagger: 130,
  settleAfterLast: 800,
  fadeOut: 420,
} as const;

/** Reference frame of the UI reference: the 370 px wide screen (13 §9). */
export const frame = { width: 370, height: 780 } as const;
