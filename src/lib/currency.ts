// Static pricing table + country→currency detection for the marketing
// landing page. Intentionally NOT tied to live FX rates — the amounts
// per currency were tuned by hand for local perception, not for a
// running $25 conversion.

export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'XAF'
  | 'NGN'
  | 'KES'
  | 'GHS'
  | 'ZAR'
  | 'CAD'
  | 'AUD';

export type PriceEntry = {
  currency: CurrencyCode;
  amount: number;
  // Rendered exactly as-is, so the character order and spacing already
  // match local convention (no need to Intl-format).
  display: string;
};

export const PRICE_TABLE: Record<CurrencyCode, PriceEntry> = {
  USD: { currency: 'USD', amount: 25,     display: '$25' },
  EUR: { currency: 'EUR', amount: 22,     display: '€22' },
  GBP: { currency: 'GBP', amount: 19,     display: '£19' },
  XAF: { currency: 'XAF', amount: 15000,  display: '15,000 XAF' },
  NGN: { currency: 'NGN', amount: 38000,  display: '₦38,000' },
  KES: { currency: 'KES', amount: 3200,   display: '3,200 KES' },
  GHS: { currency: 'GHS', amount: 400,    display: '400 GHS' },
  ZAR: { currency: 'ZAR', amount: 450,    display: 'R450' },
  CAD: { currency: 'CAD', amount: 34,     display: 'CA$34' },
  AUD: { currency: 'AUD', amount: 38,     display: 'AU$38' },
};

// Country → currency. Any missing code → USD fallback. Country codes
// are ISO 3166-1 alpha-2 as returned by Vercel's x-vercel-ip-country.
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD',
  // EU eurozone (per spec)
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  GB: 'GBP',
  // Central African CFA franc zone (BEAC)
  CM: 'XAF',
  TD: 'XAF',
  GA: 'XAF',
  CG: 'XAF',
  CF: 'XAF',
  GQ: 'XAF',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  ZA: 'ZAR',
  CA: 'CAD',
  AU: 'AUD',
};

export function currencyForCountry(country: string | null): CurrencyCode {
  if (!country) return 'USD';
  const upper = country.toUpperCase();
  return COUNTRY_CURRENCY[upper] ?? 'USD';
}

export function isCurrencyCode(v: string): v is CurrencyCode {
  return v in PRICE_TABLE;
}

export function priceFor(currency: CurrencyCode): PriceEntry {
  return PRICE_TABLE[currency] ?? PRICE_TABLE.USD;
}

// Alternate currencies to show as an equivalence line beneath the main
// price when the visitor's currency isn't USD. Kept small to avoid
// noise — two contrasting regions the visitor probably recognises.
export function alternateDisplays(mainCurrency: CurrencyCode): string[] {
  if (mainCurrency === 'USD') return [];
  const preferred: CurrencyCode[] = ['USD', 'XAF', 'EUR', 'GBP'];
  return preferred
    .filter((c) => c !== mainCurrency)
    .slice(0, 2)
    .map((c) => PRICE_TABLE[c].display);
}

export const ALL_CURRENCIES: CurrencyCode[] = Object.keys(
  PRICE_TABLE,
) as CurrencyCode[];
