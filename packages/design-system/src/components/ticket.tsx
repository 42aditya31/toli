import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { color, radius, size, space } from '../tokens.ts';

/** The dashed perforation line on lime (13 §1): 2 px, `color.perforation`. */
export function Perforation({
  inset = space.s18,
  tint = color.perforation,
  dash = 6,
}: {
  readonly inset?: number;
  readonly tint?: string;
  readonly dash?: number;
}) {
  const [w, setW] = useState(0);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ height: size.perforation, marginHorizontal: inset }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 ? (
        <Svg width={w} height={size.perforation}>
          <Line
            x1={0}
            y1={size.perforation / 2}
            x2={w}
            y2={size.perforation / 2}
            stroke={tint}
            strokeWidth={size.perforation}
            strokeDasharray={[dash, dash]}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** A row of 9 × 6 teeth: the torn edge of a stub (13 §6 `Stub`). `up` points the teeth up. */
export function Zigzag({
  tint = color.accent,
  direction = 'up',
  inset = 0,
}: {
  readonly tint?: string;
  readonly direction?: 'up' | 'down';
  readonly inset?: number;
}) {
  const [w, setW] = useState(0);
  const { width: tw, height: th } = size.tooth;
  const teeth = Math.max(1, Math.floor(w / tw));
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const x = i * tw;
    d +=
      direction === 'up'
        ? `M${x} ${th} L${x + tw / 2} 0 L${x + tw} ${th} Z `
        : `M${x} 0 L${x + tw / 2} ${th} L${x + tw} 0 Z `;
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ height: th, marginHorizontal: inset }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 ? (
        <Svg width={teeth * tw} height={th}>
          <Path d={d} fill={tint} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Two semicircle cut-outs at a given height, in the colour of what's behind the ticket. */
export function Notches({
  top,
  diameter = size.notch,
  behind = color.bg.base,
}: {
  readonly top: number;
  readonly diameter?: number;
  readonly behind?: string;
}) {
  const style: ViewStyle = {
    position: 'absolute',
    top: top - diameter / 2,
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    backgroundColor: behind,
  };
  return (
    <>
      <View pointerEvents="none" style={[style, { left: -diameter / 2 }]} />
      <View pointerEvents="none" style={[style, { right: -diameter / 2 }]} />
    </>
  );
}

export type TicketCardProps = {
  /** Above the perforation. */
  readonly top: ReactNode;
  /** Below the perforation; omit for a ticket without one. */
  readonly bottom?: ReactNode;
  /** `payment` uses the smaller notch and row radius (settle-up cards). */
  readonly variant?: 'hero' | 'trip' | 'payment' | 'recap';
  /** What's behind the ticket, so the notches look cut out. */
  readonly behind?: string;
  /** Overlays such as a Stamp. */
  readonly children?: ReactNode;
  readonly style?: ViewStyle;
};

/** The signature card (13 §6): lime, perforation, side notches at the perforation. */
export function TicketCard({
  top,
  bottom,
  variant = 'hero',
  behind,
  children,
  style,
}: TicketCardProps) {
  const [topHeight, setTopHeight] = useState(0);
  const isPayment = variant === 'payment';
  return (
    <View style={[styles.ticket, { borderRadius: isPayment ? radius.row : radius.card }, style]}>
      <View onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}>{top}</View>
      {bottom !== undefined ? (
        <>
          <Perforation inset={isPayment ? space.s16 : space.s18} />
          {bottom}
          {topHeight > 0 ? (
            <Notches
              top={topHeight + size.perforation / 2}
              diameter={isPayment ? size.notchS : size.notch}
              {...(behind ? { behind } : {})}
            />
          ) : null}
        </>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { backgroundColor: color.accent, overflow: 'hidden' },
});
