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
