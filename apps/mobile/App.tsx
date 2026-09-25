import { StatusBar } from 'expo-status-bar';
import { SqliteMoneySpike } from './src/spikes/sqlite-money.tsx';

// TEMPORARY for Spike 3. Restore the M1 placeholder when the spike is done.
export default function App() {
  return (
    <>
      <SqliteMoneySpike />
      <StatusBar style="auto" />
    </>
  );
}
