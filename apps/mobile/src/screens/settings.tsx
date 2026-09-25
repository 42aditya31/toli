// screens/settings-profile.md — name, UPI ID, "Tap instead of hold". Account linking needs the
// backend (M6); the card says so honestly.
import { LIMITS } from '@toli/config';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Header,
  Row,
  Screen,
  Sheet,
  Switch,
  space,
  Text,
  useToast,
} from '@toli/design-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { kvGet, kvSet } from '../data/identity.ts';
import { useLive } from '../state/live.ts';
import { Body, Field } from '../ui/parts.tsx';

export function SettingsScreen() {
  const toast = useToast();
  const name = useLive(() => kvGet('display_name') ?? '', []);
  const upi = useLive(() => kvGet('upi_id') ?? '', []);
  const tapInstead = useLive(() => kvGet('tap_instead_of_hold') === 'true', []);
  const [sheet, setSheet] = useState<'name' | 'upi' | null>(null);
  const [value, setValue] = useState('');
  const soon = () => toast('Saving your account arrives with the online backend.');
  return (
    <Screen>
      <Header title="You" onBack={() => router.back()} />
      <Body gap={space.s14}>
        <Card style={styles.profile}>
          <Avatar
            initials={(name || 'Y').slice(0, 1).toUpperCase()}
            size="avatarXL"
            tone="accent"
          />
          <View style={styles.fill}>
            <Text variant="header">{name || 'Add your name'}</Text>
            <Text variant="small" tone="muted">
              Not saved yet · only on this phone
            </Text>
          </View>
          <Button
            label="Edit"
            variant="tonal"
            size="medium"
            onPress={() => {
              setValue(name);
              setSheet('name');
            }}
          />
        </Card>
        <Card style={styles.save}>
          <Text variant="bodyStrong">Save my account</Text>
          <Text variant="caption" tone="muted">
            Right now this phone is your only key. Link an account so you can get your trips back on
            a new phone.
          </Text>
          <Button label="Continue with Google" variant="secondary" size="medium" onPress={soon} />
          <Button label="Use email instead" variant="ghost" size="medium" onPress={soon} />
        </Card>
        <Card>
          <CardHeader title="Payments" />
          <Row
            title="UPI ID"
            value={
              <Text variant="mono" tone={upi ? 'text' : 'muted'}>
                {upi || 'Add'}
              </Text>
            }
            onPress={() => {
              setValue(upi);
              setSheet('upi');
            }}
          />
        </Card>
        <Card>
          <CardHeader title="Accessibility" />
          <Row
            title="Tap instead of hold"
            subtitle="Hold buttons become tap, then confirm"
            value={
              <Switch
                value={tapInstead}
                onChange={(v) => kvSet('tap_instead_of_hold', String(v))}
                label="Tap instead of hold"
              />
            }
          />
        </Card>
        {__DEV__ ? (
          <Card>
            <CardHeader title="Developer" right="Dev build only" />
            <Row title="Component gallery" onPress={() => router.push('/dev/gallery')} />
            <Row title="Spike 3 · SQLite + money" onPress={() => router.push('/dev/spike3')} />
          </Card>
        ) : null}
      </Body>
      <Sheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'upi' ? 'UPI ID' : 'Your name'}
      >
        <Field
          value={value}
          onChangeText={setValue}
          placeholder={sheet === 'upi' ? 'name@bank' : 'Your name'}
          autoCapitalize={sheet === 'upi' ? 'none' : 'words'}
          maxLength={sheet === 'upi' ? 60 : LIMITS.memberNameChars}
          autoFocus
        />
        <Button
          label="Save"
          onPress={() => {
            const v = value.trim();
            if (sheet === 'upi' && v && !/^[\w.-]+@[\w.-]+$/.test(v))
              return toast('That doesn’t look like a UPI ID (name@bank)');
            kvSet(sheet === 'upi' ? 'upi_id' : 'display_name', v);
            setSheet(null);
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.cardPad },
  save: { padding: space.cardPad, gap: space.s10 },
});
