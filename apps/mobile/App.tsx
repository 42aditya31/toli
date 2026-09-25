import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

// M1 placeholder. Real screens arrive in M7, built only from @toli/design-system tokens (M3).
export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>toli</Text>
      <StatusBar style="light" />
    </View>
  );
}
