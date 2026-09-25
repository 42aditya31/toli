/**
 * Shared constants used by the phone and the server (02 §3, 04 §2.1 "Fixed limits").
 * Changing one here changes it everywhere.
 */
export const LIMITS = {
  membersPerTrip: 50,
  receiptPhotosPerExpense: 5,
  fileBytes: 10 * 1024 * 1024,
  descriptionChars: 120,
  tripNameChars: 60,
  memberNameChars: 30,
  /** Keypad cap (D-013): 9,99,99,999 major units. */
  amountDigits: 8,
  /** "Already logged?" window (06 §5, PRD F3). */
  duplicateWindowMinutes: 10,
  /** Remove a draft after this long (screens/add-expense). */
  draftKeepMinutes: 10,
} as const;

/** The minimum app build the server accepts (D-026); bumped by the server, mirrored here. */
export const CLIENT_VERSION = '0.1.0';

export type TemplateKey = 'beach' | 'road' | 'trek' | 'wedding' | 'offsite' | 'other';

export const TEMPLATES: readonly { readonly key: TemplateKey; readonly label: string }[] = [
  { key: 'beach', label: 'Beach trip' },
  { key: 'road', label: 'Road trip' },
  { key: 'trek', label: 'Trek' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'offsite', label: 'Office offsite' },
  { key: 'other', label: 'Other' },
];

export type CategoryKey =
  | 'food'
  | 'drinks'
  | 'travel'
  | 'stay'
  | 'activities'
  | 'shopping'
  | 'fuel'
  | 'tolls'
  | 'tips'
  | 'misc';

export const CATEGORY_LABELS: Readonly<Record<CategoryKey, string>> = {
  food: 'Food',
  drinks: 'Drinks',
  travel: 'Travel',
  stay: 'Stay',
  activities: 'Activities',
  shopping: 'Shopping',
  fuel: 'Fuel',
  tolls: 'Tolls',
  tips: 'Tips',
  misc: 'Misc',
};

const BASE: readonly CategoryKey[] = [
  'food',
  'drinks',
  'travel',
  'stay',
  'activities',
  'shopping',
  'fuel',
  'misc',
];

/**
 * Categories seeded from the template on trip.create (features/trips TR-3, 03 §5.8). The docs
 * name the base list (screens/add-expense) and that Tolls/Tips appear "if the template includes
 * them"; which templates do is recorded in features/trips.md.
 */
export const TEMPLATE_CATEGORIES: Readonly<Record<TemplateKey, readonly CategoryKey[]>> = {
  beach: BASE,
  road: [...BASE.slice(0, 7), 'tolls', 'misc'],
  trek: BASE,
  wedding: [...BASE.slice(0, 7), 'tips', 'misc'],
  offsite: BASE,
  other: BASE,
};

/** Default split per template (a config constant, 04 §2.1). Equal everywhere in R1a. */
export const TEMPLATE_DEFAULT_SPLIT: Readonly<Record<TemplateKey, 'equal'>> = {
  beach: 'equal',
  road: 'equal',
  trek: 'equal',
  wedding: 'equal',
  offsite: 'equal',
  other: 'equal',
};

/** The 31-character invite-code alphabet: no 0/O/1/I/L (03 §4.3). */
export const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
