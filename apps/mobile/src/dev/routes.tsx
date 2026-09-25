// Dev-only routes (not in the beta build).
import { router } from 'expo-router';
import { SqliteMoneySpike } from '../spikes/sqlite-money.tsx';
import { Gallery } from './Gallery.tsx';

export const GalleryRoute = () => <Gallery onBack={() => router.back()} />;
export const Spike3Route = () => <SqliteMoneySpike />;
