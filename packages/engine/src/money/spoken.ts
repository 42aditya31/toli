import { currencyExponent, pow10 } from './currency.ts';

// Screen-reader wording for money (13 §10): "Rahul owes one thousand two hundred rupees".
const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n: number): string[] {
  const out: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) out.push(ONES[hundreds] as string, 'hundred');
  if (rest >= 20) {
    out.push(TENS[Math.floor(rest / 10)] as string);
    if (rest % 10) out.push(ONES[rest % 10] as string);
  } else if (rest) {
    out.push(ONES[rest] as string);
  }
  return out;
}

function indian(n: bigint): string[] {
  const out: string[] = [];
  const crore = n / 10_000_000n;
  let rest = n % 10_000_000n;
  if (crore) out.push(...indian(crore), 'crore');
  const lakh = Number(rest / 100_000n);
  rest %= 100_000n;
  if (lakh) out.push(...under1000(lakh), 'lakh');
  const thousand = Number(rest / 1000n);
  if (thousand) out.push(...under1000(thousand), 'thousand');
  out.push(...under1000(Number(rest % 1000n)));
  return out;
}

function western(n: bigint): string[] {
  const out: string[] = [];
  const scales: [bigint, string][] = [
    [1_000_000_000n, 'billion'],
    [1_000_000n, 'million'],
    [1000n, 'thousand'],
  ];
  let rest = n;
  for (const [size, name] of scales) {
    const count = rest / size;
    rest %= size;
    if (count) out.push(...(count >= 1000n ? western(count) : under1000(Number(count))), name);
  }
  out.push(...under1000(Number(rest)));
  return out;
}

type Units = { one: string; many: string; minorOne: string; minorMany: string };
const UNITS: Record<string, Units> = {
  INR: { one: 'rupee', many: 'rupees', minorOne: 'paisa', minorMany: 'paise' },
  USD: { one: 'dollar', many: 'dollars', minorOne: 'cent', minorMany: 'cents' },
  EUR: { one: 'euro', many: 'euros', minorOne: 'cent', minorMany: 'cents' },
  GBP: { one: 'pound', many: 'pounds', minorOne: 'penny', minorMany: 'pence' },
  JPY: { one: 'yen', many: 'yen', minorOne: '', minorMany: '' },
};
const FRACTION_NAME: Record<number, [string, string]> = {
  2: ['hundredth', 'hundredths'],
  3: ['thousandth', 'thousandths'],
  4: ['ten thousandth', 'ten thousandths'],
};

export function spokenMoney(amount: bigint, currency: string): string {
  const e = currencyExponent(currency);
  const abs = amount < 0n ? -amount : amount;
  const major = abs / pow10(e);
  const frac = abs % pow10(e);
  const [fracOne, fracMany] = FRACTION_NAME[e] ?? ['', ''];
  const units = UNITS[currency] ?? {
    one: currency,
    many: currency,
    minorOne: fracOne,
    minorMany: fracMany,
  };
  const words = (n: bigint) => {
    const w = currency === 'INR' ? indian(n) : western(n);
    return (w.length ? w : ['zero']).join(' ');
  };
  const parts: string[] = [];
  if (major > 0n || frac === 0n)
    parts.push(`${words(major)} ${major === 1n ? units.one : units.many}`);
  if (frac > 0n) parts.push(`${words(frac)} ${frac === 1n ? units.minorOne : units.minorMany}`);
  return `${amount < 0n ? 'minus ' : ''}${parts.join(' and ')}`;
}
