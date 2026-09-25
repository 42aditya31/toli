import {
  Button,
  color,
  Screen,
  space,
  Text,
  ToastProvider,
  toliFonts,
  Wordmark,
} from '@toli/design-system';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Gallery } from './src/dev/Gallery.tsx';
import { SqliteMoneySpike } from './src/spikes/sqlite-money.tsx';

type DevScreen = 'menu' | 'gallery' | 'spike3';

// Dev build only until M7 brings the real screens: a menu for the gallery and the M0 spike.
export default function App() {
  const [fontsLoaded] = useFonts(toliFonts);
  const [screen, setScreen] = useState<DevScreen>('menu');
  if (!fontsLoaded) return <View style={styles.boot} />;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          {screen === 'gallery' ? (
            <Gallery onBack={() => setScreen('menu')} />
          ) : screen === 'spike3' ? (
            <SqliteMoneySpike />
          ) : (
            <Screen>
              <View style={styles.menu}>
                <Wordmark size={80} />
                <Text variant="label" tone="muted">
                  DEV BUILD · M3
                </Text>
                <Button label="Component gallery" onPress={() => setScreen('gallery')} />
                <Button
                  label="Spike 3 · SQLite + money"
                  variant="tonal"
                  onPress={() => setScreen('spike3')}
                />
              </View>
            </Screen>
          )}
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  boot: { flex: 1, backgroundColor: color.bg.base },
  menu: { flex: 1, justifyContent: 'center', padding: space.gutter, gap: space.s16 },
});
