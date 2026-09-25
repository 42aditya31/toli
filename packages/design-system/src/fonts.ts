import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { font } from './tokens.ts';

/** Pass to `useFonts` from expo-font once at the root (13 §3: Bricolage Grotesque + JetBrains Mono). */
export const toliFonts = {
  [font.regular]: BricolageGrotesque_400Regular,
  [font.semibold]: BricolageGrotesque_600SemiBold,
  [font.extrabold]: BricolageGrotesque_800ExtraBold,
  [font.monoMedium]: JetBrainsMono_500Medium,
  [font.monoBold]: JetBrainsMono_700Bold,
};
