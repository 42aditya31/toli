// Small screen parts shared by several screens. Tokens only (13: no raw values in apps/).
import {
  Avatar,
  color,
  Money,
  Row,
  radius,
  size,
  space,
  Text,
  textStyle,
  useLayout,
} from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import type { Expense } from '../data/repo.ts';
import { type TripView, titleOf } from '../state/trip.ts';

export const useTripId = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id;
};

/** Scrollable screen body with the gutter, stack gaps and room for the tab bar (13 §9). */
export function Body({
  children,
  gap = space.stack,
  tabBar,
}: {
  readonly children: ReactNode;
  readonly gap?: number;
  readonly tabBar?: boolean;
}) {
  const { gutter } = useLayout();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: gutter,
        paddingTop: space.s2,
        paddingBottom: tabBar ? space.tabBarClearance : space.s24,
        gap,
      }}
    >
      {children}
    </ScrollView>
  );
}

/** Fixed bottom area for the primary action (e.g. "Create trip"). */
export function Footer({ children }: { readonly children: ReactNode }) {
  const { gutter } = useLayout();
  return (
    <View
      style={{
        paddingHorizontal: gutter,
        paddingTop: space.s10,
        paddingBottom: space.s24,
        gap: space.s10,
      }}
    >
      {children}
    </View>
  );
}

/** The 2-letter mono mark on a category tile: "ST", "FO", "TR" (screens/trip-home). */
export function CategoryTile({
  label,
  pending,
}: {
  readonly label: string;
  readonly pending?: boolean;
}) {
  return (
    <View style={[styles.tile, pending && { backgroundColor: color.accent }]}>
      <Text variant="mono" tone={pending ? 'onAccent' : 'text'}>
        {label.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export function SavedOnPhone() {
  return (
    <Text variant="label" tone="accent" numberOfLines={1}>
      SAVED ON PHONE · WILL SYNC
    </Text>
  );
}

export function ExpenseRow({
  v,
  e,
  first,
  onPress,
  withTime,
}: {
  readonly v: TripView;
  readonly e: Expense;
  readonly first?: boolean;
  readonly onPress?: () => void;
  readonly withTime?: boolean;
}) {
  const ccy = v.trip.base_currency;
  const label = v.categoryLabel(e.revision.category_id);
  const title = titleOf(e.revision.description, label);
  const mine = v.me ? e.shares.find((s) => s.memberId === v.me?.id)?.base : undefined;
  const people = e.shares.length;
  const payers = e.payers.map((p) => p.memberId);
  const who = e.revision.paid_from_kitty
    ? 'Paid from kitty'
    : payers.length > 1
      ? `${payers.length} people paid`
      : `${v.name(payers[0] ?? '')} paid`;
  const meta = `${who} · ${people} ${people === 1 ? 'person' : 'people'}${withTime ? ` · ${e.revision.spent_at.slice(11, 16)}` : ''}`;
  return (
    <Row
      first={!!first}
      tall
      leading={<CategoryTile label={label} pending={e.pending} />}
      title={title}
      subtitle={e.pending ? <SavedOnPhone /> : meta}
      value={<Money variant="mono" amount={e.baseAmount} currency={ccy} />}
      caption={mine !== undefined ? `yours ${formatShort(mine, ccy)}` : 'not in this'}
      accessibilityLabel={`${title}, ${meta}`}
      {...(onPress ? { onPress } : {})}
    />
  );
}

const formatShort = (v: bigint, ccy: string) => formatMoney(v, ccy);

/** One member's balance row (Trip home "Balances", 13 §2: sign + word, never colour alone). */
export function BalanceRow({
  v,
  memberId,
  first,
  onPress,
}: {
  readonly v: TripView;
  readonly memberId: string;
  readonly first?: boolean;
  readonly onPress?: () => void;
}) {
  const m = v.members.find((x) => x.id === memberId);
  const net = v.balances.trip[memberId] ?? 0n;
  const word = net > 0n ? 'gets back' : net < 0n ? 'owes' : 'settled';
  const isMe = memberId === v.me?.id;
  const name = isMe ? `${v.name(memberId)} (you)` : v.name(memberId);
  const sub = m?.user_id ? 'On Toli' : 'Ghost · not on Toli yet';
  return (
    <Row
      first={!!first}
      leading={<Avatar initials={v.initialsOf(memberId)} tone={isMe ? 'accent' : 'raised'} />}
      title={name}
      subtitle={sub}
      value={
        <Money
          variant="mono"
          tone={net > 0n ? 'accent' : 'text'}
          amount={net}
          currency={v.trip.base_currency}
          signed
          countUp
          spokenPrefix={`${v.name(memberId)} ${word}`}
        />
      }
      caption={word}
      accessibilityHint="Double tap to trace"
      {...(onPress ? { onPress } : {})}
    />
  );
}

/** Text input on the dark card surface (radius.control, 48 high). */
export function Field(props: TextInputProps & { readonly big?: boolean }) {
  const { big, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={color.textMuted}
      selectionColor={color.accent}
      {...rest}
      style={[
        big ? [textStyle('title'), styles.bigField] : [textStyle('body'), styles.field],
        { color: color.text },
        style,
      ]}
    />
  );
}

export function Caption({ children }: { readonly children: ReactNode }) {
  return (
    <Text variant="small" tone="muted">
      {children}
    </Text>
  );
}

export function Tile({
  label,
  value,
  onPress,
}: {
  readonly label: string;
  readonly value: string;
  readonly onPress?: () => void;
}) {
  const body = (
    <>
      <Text variant="micro" tone="muted">
        {label}
      </Text>
      <Text variant="bodyStrong" numberOfLines={1}>
        {value}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      style={styles.tile2}
    >
      {body}
    </Pressable>
  ) : (
    <View style={styles.tile2}>{body}</View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: space.s32 + space.s4,
    height: space.s32 + space.s4,
    borderRadius: radius.chip,
    backgroundColor: color.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    height: size.buttonM + space.s4,
    borderRadius: radius.control,
    backgroundColor: color.bg.raised,
    paddingHorizontal: space.s14,
  },
  bigField: {
    borderBottomWidth: size.perforation,
    borderBottomColor: color.accent,
    paddingTop: space.s4,
    paddingBottom: space.s8,
  },
  tile2: {
    flex: 1,
    paddingVertical: space.s12,
    paddingHorizontal: space.s14,
    borderRadius: radius.control,
    backgroundColor: color.bg.card,
    gap: space.s2,
  },
});
