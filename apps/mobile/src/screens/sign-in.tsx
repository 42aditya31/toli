// screens/sign-in.md — "I already have an account". Signing in needs the backend (M6, D-007);
// until then the buttons say so honestly instead of pretending.
import { Button, Header, Screen, space, Text, useLayout, useToast } from '@toli/design-system';
import { router } from 'expo-router';
import { View } from 'react-native';

export function SignInScreen() {
  const { gutter } = useLayout();
  const toast = useToast();
  const soon = () =>
    toast('Signing in arrives with the online backend. Your trips on this phone are safe.');
  return (
    <Screen>
      <Header title="" onBack={() => router.back()} />
      <View style={{ paddingHorizontal: gutter, gap: space.s12 }}>
        <Text variant="title">Welcome back</Text>
        <Text variant="body" tone="muted">
          Sign in with the account you saved on your other phone. Your trips come with you.
        </Text>
        <View style={{ height: space.s12 }} />
        <Button label="Continue with Google" variant="secondary" onPress={soon} />
        <Button label="Use email instead" variant="ghost" size="medium" onPress={soon} />
        <Text variant="small" tone="muted">
          By continuing you agree to the Privacy notice
        </Text>
      </View>
    </Screen>
  );
}
