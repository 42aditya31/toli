import { color, TearOverlay, ToastProvider, toliFonts } from '@toli/design-system';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import migrations from '../drizzle/migrations';
import { db } from '../src/data/db.ts';
import { useTear } from '../src/state/tear.ts';

function Tear() {
  const tear = useTear((s) => s.tear);
  const done = useTear((s) => s.done);
  return tear ? <TearOverlay {...tear} onDone={done} /> : null;
}

export default function RootLayout() {
  const [fonts] = useFonts(toliFonts);
  const { success, error } = useMigrations(db, migrations);
  if (error) throw error;
  if (!fonts || !success) return <View style={styles.boot} />;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: color.bg.base },
            }}
          />
          <Tear />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg.base },
  boot: { flex: 1, backgroundColor: color.bg.base },
});
