import { AirplaneTilt } from 'phosphor-react-native/src/icons/AirplaneTilt';
import { ArrowCounterClockwise } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { Camera } from 'phosphor-react-native/src/icons/Camera';
import { CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { CloudCheck } from 'phosphor-react-native/src/icons/CloudCheck';
import { CloudSlash } from 'phosphor-react-native/src/icons/CloudSlash';
import { CurrencyInr } from 'phosphor-react-native/src/icons/CurrencyInr';
import { DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { GearSix } from 'phosphor-react-native/src/icons/GearSix';
import { Minus } from 'phosphor-react-native/src/icons/Minus';
import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { Scan } from 'phosphor-react-native/src/icons/Scan';
import { Scissors } from 'phosphor-react-native/src/icons/Scissors';
import { Trash } from 'phosphor-react-native/src/icons/Trash';
import { UsersThree } from 'phosphor-react-native/src/icons/UsersThree';
import { WarningCircle } from 'phosphor-react-native/src/icons/WarningCircle';
import { X } from 'phosphor-react-native/src/icons/X';
import { color, icon } from '../tokens.ts';

/**
 * One icon set, Phosphor "bold", through one component (13 §5). Names are meanings, not
 * glyphs, so a screen asks for "back", never for "CaretLeft".
 */
const ICONS = {
  back: CaretLeft,
  close: X,
  more: DotsThree,
  tear: Scissors,
  repeat: ArrowCounterClockwise,
  members: UsersThree,
  settings: GearSix,
  scan: Scan,
  camera: Camera,
  warning: WarningCircle,
  offline: CloudSlash,
  synced: CloudCheck,
  delete: Trash,
  flight: AirplaneTilt,
  upi: CurrencyInr,
  add: Plus,
  subtract: Minus,
  check: Check,
  forward: CaretRight,
  expand: CaretDown,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 'm',
  tint = color.text,
}: {
  readonly name: IconName;
  readonly size?: keyof typeof icon;
  readonly tint?: string;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={icon[size]} color={tint} weight="bold" />;
}
