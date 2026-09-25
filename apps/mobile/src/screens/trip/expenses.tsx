// screens/all-expenses.md — every expense: search, filter by person and category, sort.

import { FlashList } from '@shopify/flash-list';
import { Card, Chip, Header, Screen, Sheet, space, Text, useLayout } from '@toli/design-system';
import { formatMoney } from '@toli/engine';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { titleOf, useTrip } from '../../state/trip.ts';
import { ExpenseRow, Field, useTripId } from '../../ui/parts.tsx';
import { Gone } from './common.tsx';

type Sort = 'newest' | 'oldest' | 'largest' | 'smallest';
const SORT_LABEL: Record<Sort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  largest: 'Largest',
  smallest: 'Smallest',
};

export function AllExpensesScreen() {
  const id = useTripId();
  const v = useTrip(id);
  const { gutter } = useLayout();
  const [q, setQ] = useState('');
  const [person, setPerson] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const [sheet, setSheet] = useState<'person' | 'category' | 'sort' | null>(null);

  const shown = useMemo(() => {
    if (!v) return [];
    const needle = q.trim().toLowerCase();
    const list = v.expenses.filter((e) => {
      const title = titleOf(
        e.revision.description,
        v.categoryLabel(e.revision.category_id),
      ).toLowerCase();
      const names = e.payers.map((p) => v.name(p.memberId).toLowerCase()).join(' ');
      if (
        needle &&
        !title.includes(needle) &&
        !names.includes(needle) &&
        !v.categoryLabel(e.revision.category_id).toLowerCase().includes(needle)
      )
        return false;
      if (
        person &&
        !e.payers.some((p) => p.memberId === person) &&
        !e.shares.some((s) => s.memberId === person)
      )
        return false;
      if (category && (e.revision.category_id ?? 'misc') !== category) return false;
      return true;
    });
    const by = {
      newest: (a: (typeof list)[number], b: (typeof list)[number]) =>
        a.revision.spent_at < b.revision.spent_at ? 1 : -1,
      oldest: (a: (typeof list)[number], b: (typeof list)[number]) =>
        a.revision.spent_at < b.revision.spent_at ? -1 : 1,
      largest: (a: (typeof list)[number], b: (typeof list)[number]) =>
        a.baseAmount < b.baseAmount ? 1 : -1,
      smallest: (a: (typeof list)[number], b: (typeof list)[number]) =>
        a.baseAmount < b.baseAmount ? -1 : 1,
    }[sort];
    return [...list].sort(by);
  }, [v, q, person, category, sort]);

  if (!v) return <Gone />;
  const ccy = v.trip.base_currency;
  const sum = shown.reduce((a, e) => a + e.baseAmount, 0n);
  const filtered = !!(q || person || category);
  return (
    <Screen>
      <Header
        title="All expenses"
        subtitle={`${v.trip.name} · ${v.expenses.length} expenses`}
        onBack={() => router.back()}
      />
      <View style={{ paddingHorizontal: gutter, gap: space.stackTight }}>
        <Field
          value={q}
          onChangeText={setQ}
          placeholder="Search expenses"
          accessibilityLabel="Search expenses"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label={person ? v.name(person) : 'Person ▾'}
            selected={!!person}
            onPress={() => setSheet('person')}
          />
          <Chip
            label={category ? v.categoryLabel(category) : 'Category ▾'}
            selected={!!category}
            onPress={() => setSheet('category')}
          />
          <Chip label={`Sort: ${SORT_LABEL[sort]} ▾`} onPress={() => setSheet('sort')} />
        </ScrollView>
        <Text variant="caption" tone="muted">
          {filtered
            ? `Showing ${shown.length} of ${v.expenses.length} · ${formatMoney(sum, ccy)}`
            : `${v.expenses.length} expenses · ${formatMoney(sum, ccy)}`}
          {filtered ? (
            <Text
              variant="caption"
              tone="accent"
              onPress={() => {
                setQ('');
                setPerson(null);
                setCategory(null);
              }}
            >
              {'  Clear'}
            </Text>
          ) : null}
        </Text>
      </View>
      <View style={[styles.list, { paddingHorizontal: gutter }]}>
        {shown.length === 0 ? (
          <Text variant="body" tone="muted" style={styles.none}>
            {v.expenses.length === 0
              ? 'No expenses yet'
              : 'Nothing matches. Try a different word or clear the filters.'}
          </Text>
        ) : (
          <Card padded={false} style={styles.card}>
            <FlashList
              data={shown}
              keyExtractor={(e) => e.id}
              renderItem={({ item, index }) => (
                <View style={styles.pad}>
                  <ExpenseRow
                    v={v}
                    e={item}
                    first={index === 0}
                    withTime
                    onPress={() => router.push(`/trip/${v.trip.id}/expense/${item.id}`)}
                  />
                </View>
              )}
            />
          </Card>
        )}
      </View>
      <Sheet visible={sheet === 'person'} onClose={() => setSheet(null)} title="Show expenses for">
        <View style={styles.chips}>
          <Chip
            label="Everyone"
            selected={!person}
            onPress={() => {
              setPerson(null);
              setSheet(null);
            }}
          />
          {v.members.map((m) => (
            <Chip
              key={m.id}
              label={m.display_name}
              selected={person === m.id}
              onPress={() => {
                setPerson(m.id);
                setSheet(null);
              }}
            />
          ))}
        </View>
      </Sheet>
      <Sheet visible={sheet === 'category'} onClose={() => setSheet(null)} title="Category">
        <View style={styles.chips}>
          <Chip
            label="All"
            selected={!category}
            onPress={() => {
              setCategory(null);
              setSheet(null);
            }}
          />
          {v.categories.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              selected={category === c.id}
              onPress={() => {
                setCategory(c.id);
                setSheet(null);
              }}
            />
          ))}
        </View>
      </Sheet>
      <Sheet visible={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort">
        <View style={styles.chips}>
          {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
            <Chip
              key={s}
              label={`${SORT_LABEL[s]} first`}
              selected={sort === s}
              onPress={() => {
                setSort(s);
                setSheet(null);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  list: { flex: 1, paddingTop: space.s12, paddingBottom: space.s24 },
  card: { flex: 1, overflow: 'hidden' },
  pad: { paddingHorizontal: space.cardPad },
  none: { textAlign: 'center', paddingTop: space.s40 },
});
