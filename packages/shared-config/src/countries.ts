import { WORLD_COUNTRIES } from './world-countries'

export interface CountryConfig {
  code: 'KE' | 'ZW' | 'ZM'
  flag?: string
  name: string
  dial: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  phonePlaceholder: string
  creditLowBalanceThreshold: number
}

export type CountryCode = CountryConfig['code']

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'KE',
    flag: '🇰🇪',
    name: 'Kenya',
    dial: '+254',
    currencyCode: 'KES',
    currencySymbol: 'Ksh.',
    currencyName: 'Kenyan Shilling',
    phonePlaceholder: '7XX XXX XXX',
    creditLowBalanceThreshold: 5000,
  },
  {
    code: 'ZW',
    flag: '🇿🇼',
    name: 'Zimbabwe',
    dial: '+263',
    currencyCode: 'ZWG',
    currencySymbol: 'Z$',
    currencyName: 'Zimbabwe Gold',
    phonePlaceholder: '7X XXX XXXX',
    creditLowBalanceThreshold: 500,
  },
  {
    code: 'ZM',
    flag: '🇿🇲',
    name: 'Zambia',
    dial: '+260',
    currencyCode: 'ZMW',
    currencySymbol: 'ZK',
    currencyName: 'Zambian Kwacha',
    phonePlaceholder: '9X XXX XXXX',
    creditLowBalanceThreshold: 1000,
  },
]

export function getCountryByCode(code: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.code === code)
}

export function getCountryByName(name: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase())
}

export function flagUrl(code: string, size: 20 | 40 = 40): string {
  return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`
}

export const OPERATING_COUNTRY_OPTIONS = COUNTRIES.map(c => ({
  value: c.code,
  label: c.name,
}))

export const RESIDENCE_COUNTRY_OPTIONS = [
  ...OPERATING_COUNTRY_OPTIONS,
  { value: 'ABROAD' as const, label: 'Living abroad' },
]

/** Get dial prefix by country code or country name (e.g. 'ZW' -> '+263', 'Kenya' -> '+254'). */
export function getCountryDial(codeOrName: string | undefined | null): string {
  if (!codeOrName) return '+263'
  const normalized = codeOrName.trim().toUpperCase()
  const op = COUNTRIES.find(c => c.code === normalized || c.name.toUpperCase() === normalized)
  if (op) return op.dial
  const byCode = WORLD_COUNTRIES.find(c => c.code === normalized)
  if (byCode?.dial) return byCode.dial
  const byName = WORLD_COUNTRIES.find(c => c.name.toUpperCase() === normalized)
  if (byName?.dial) return byName.dial
  return '+263'
}

/** Get phone placeholder for a given country code or name. */
export function getCountryPhonePlaceholder(codeOrName: string | undefined | null): string {
  const normalized = (codeOrName ?? '').trim().toUpperCase()
  const op = COUNTRIES.find(c => c.code === normalized || c.name.toUpperCase() === normalized)
  return op?.phonePlaceholder ?? '7XX XXX XXX'
}

/**
 * Splits any stored phone number into its country code, dialing prefix, and editable remaining digits.
 */
export function splitPhonePrefix(
  phone: string | undefined | null,
  fallbackCountryCode = 'ZW',
): {
  countryCode: string
  dial: string
  digits: string
} {
  const raw = (phone ?? '').trim()
  const defaultDial = getCountryDial(fallbackCountryCode)

  if (!raw) {
    return {
      countryCode: fallbackCountryCode,
      dial: defaultDial,
      digits: '',
    }
  }

  if (raw.startsWith('+')) {
    const allMatches = [
      ...COUNTRIES.map(c => ({ code: c.code, dial: c.dial })),
      ...WORLD_COUNTRIES.map(c => ({ code: c.code, dial: c.dial })),
    ].sort((a, b) => b.dial.length - a.dial.length)

    const match = allMatches.find(m => raw.startsWith(m.dial))
    if (match) {
      const remaining = raw.slice(match.dial.length).replace(/\D/g, '').replace(/^0+/, '')
      return {
        countryCode: match.code,
        dial: match.dial,
        digits: remaining,
      }
    }

    const m = raw.match(/^(\+\d{1,4})(.*)$/)
    if (m) {
      return {
        countryCode: fallbackCountryCode,
        dial: m[1],
        digits: m[2].replace(/\D/g, '').replace(/^0+/, ''),
      }
    }
  }

  let digits = raw.replace(/\D/g, '')
  const dialDigits = defaultDial.replace(/\D/g, '')

  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
    digits = digits.slice(dialDigits.length)
  }

  digits = digits.replace(/^0+/, '')

  return {
    countryCode: fallbackCountryCode,
    dial: defaultDial,
    digits,
  }
}
