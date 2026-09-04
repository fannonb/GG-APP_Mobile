const fs = require('fs')
const path = require('path')

const webFile = path.join(__dirname, '../../gg-app/src/config/countries.ts')
const outFile = path.join(__dirname, '../packages/shared-config/src/world-countries.ts')

const src = fs.readFileSync(webFile, 'utf8')
const start = src.indexOf('export const WORLD_COUNTRIES')
const end = src.indexOf('export function getWorldCountryByCode')
if (start < 0 || end < 0) {
  throw new Error('Could not find WORLD_COUNTRIES block')
}
const block = src.slice(start, end).trim()

const out = `import type { CountryCode } from './countries'

export interface WorldCountry {
  code: string
  name: string
  dial: string
}

/** ISO 3166-1 alpha-2 countries for residence selection (includes operating markets) with ITU dial codes. */
${block}

export function getWorldCountryByCode(code: string): WorldCountry | undefined {
  return WORLD_COUNTRIES.find(c => c.code === code)
}

export function getWorldCountryByName(name: string): WorldCountry | undefined {
  return WORLD_COUNTRIES.find(c => c.name.toLowerCase() === name.trim().toLowerCase())
}

export function isOperatingCountryCode(code: string): code is CountryCode {
  return code === 'KE' || code === 'ZW' || code === 'ZM'
}

/** Resolve current residence to a world country code for select controls. */
export function resolveResidenceSelectCode(params: {
  residesAbroad?: boolean
  residenceCountry?: string
  countryCode?: string
  country?: string
}): string {
  const name = params.residenceCountry ?? params.country
  if (name) {
    const byName = getWorldCountryByName(name)
    if (byName) return byName.code
  }
  if (!params.residesAbroad && params.countryCode && isOperatingCountryCode(params.countryCode)) {
    return params.countryCode
  }
  return params.countryCode && getWorldCountryByCode(params.countryCode)
    ? params.countryCode
    : 'KE'
}
`

fs.writeFileSync(outFile, out)
console.log('wrote', outFile)
