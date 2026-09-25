// screens/join-in-app.md — paste the link or type the 6-character code. Finding a trip needs the
// server (04 §3); until the backend is live this step says so honestly.
import { INVITE_ALPHABET } from '@toli/config';
import {
  Button,
  font,
  Header,
  Screen,
  space,
  Text,
  textStyle,
  useLayout,
  useToast,
} from '@toli/design-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Field, Footer } from '../ui/parts.tsx';

const clean = (s: string) => {
  const raw = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = raw.slice(0, 3).replace(/[^A-Z]/g, '');
  const code = raw
    .slice(prefix.length)
    .split('')
    .filter((c) => INVITE_ALPHABET.includes(c))
    .join('')
    .slice(0, 6);
  return prefix.length === 3 ? `${prefix}-${code}` : prefix;
};

export function JoinScreen() {
  const { gutter } = useLayout();
  const toast = useToast();
  const [code, setCode] = useState('');
  const full = /^[A-Z]{3}-[0-9A-Z]{6}$/.test(code);
  return (
    <Screen>
      <Header title="Join a trip" onBack={() => router.back()} />
      <View style={{ flex: 1, paddingHorizontal: gutter, gap: space.s16 }}>
        <Text variant="body" tone="muted">
          Paste the invite link or type the code your friend shared.
        </Text>
        <Field
          big
          value={code}
          onChangeText={(v) => setCode(clean(v))}
          placeholder="GOA-7K2PXQ"
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Invite code"
          style={[textStyle('title'), { fontFamily: font.monoBold, letterSpacing: space.s2 }]}
        />
        <Text variant="small" tone="muted">
          No link? Ask whoever made the trip to tap Invite.
        </Text>
      </View>
      <Footer>
        <Button
          label="Find trip"
          disabled={!full}
          onPress={() =>
            full
              ? toast(
                  'Joining needs the internet and the Toli server, which arrives in the next build.',
                )
              : toast('Type the full code, like GOA-7K2PXQ')
          }
        />
      </Footer>
    </Screen>
  );
}
