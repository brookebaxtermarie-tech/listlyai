// Shared platform + locale reference. Used by onboarding, settings and upload.
// Fashion-resale platforms only (MVP scope).

export interface Platform {
  id: string
  label: string
}

export const ALL_PLATFORMS: Platform[] = [
  { id: 'ebay',          label: 'eBay' },
  { id: 'vinted',        label: 'Vinted' },
  { id: 'depop',         label: 'Depop' },
  { id: 'poshmark',      label: 'Poshmark' },
  { id: 'mercari',       label: 'Mercari' },
  { id: 'leboncoin',     label: 'Leboncoin' },
  { id: 'wallapop',      label: 'Wallapop' },
  { id: 'kleinanzeigen', label: 'Kleinanzeigen' },
  { id: 'allegro',       label: 'Allegro' },
]

export const FASHION_CATEGORIES = [
  { id: 'womenswear',  label: 'Womenswear' },
  { id: 'menswear',    label: 'Menswear' },
  { id: 'shoes',       label: 'Shoes' },
  { id: 'bags',        label: 'Bags' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'jewellery',   label: 'Jewellery' },
  { id: 'kidswear',    label: 'Kidswear' },
  { id: 'vintage',     label: 'Vintage & designer' },
]

export const SELLER_INTENTS = [
  { id: 'casual',     label: 'Clearing my closet', desc: 'Selling a few things I no longer wear' },
  { id: 'side_hustle', label: 'A side hustle',     desc: 'Reselling regularly for extra income' },
  { id: 'full_time',  label: 'My business',        desc: 'This is how I make my living' },
]

export interface CountryInfo {
  code: string
  label: string
  language: string         // default description language (ISO 639-1)
  platforms: string[]      // suggested platforms, in priority order
}

// Common markets first; "other" is the fallback.
export const COUNTRIES: CountryInfo[] = [
  { code: 'US', label: 'United States',  language: 'en', platforms: ['ebay', 'depop', 'poshmark', 'mercari'] },
  { code: 'GB', label: 'United Kingdom', language: 'en', platforms: ['vinted', 'ebay', 'depop'] },
  { code: 'FR', label: 'France',         language: 'fr', platforms: ['vinted', 'leboncoin', 'ebay'] },
  { code: 'DE', label: 'Germany',        language: 'de', platforms: ['vinted', 'kleinanzeigen', 'ebay'] },
  { code: 'ES', label: 'Spain',          language: 'es', platforms: ['vinted', 'wallapop', 'ebay'] },
  { code: 'IT', label: 'Italy',          language: 'it', platforms: ['vinted', 'ebay', 'depop'] },
  { code: 'NL', label: 'Netherlands',    language: 'nl', platforms: ['vinted', 'ebay', 'kleinanzeigen'] },
  { code: 'PL', label: 'Poland',         language: 'pl', platforms: ['vinted', 'allegro', 'ebay'] },
  { code: 'other', label: 'Somewhere else', language: 'en', platforms: ['vinted', 'ebay', 'depop'] },
]

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt', label: 'Português' },
]

export function countryByCode(code: string | null | undefined): CountryInfo {
  return COUNTRIES.find(c => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1]
}
