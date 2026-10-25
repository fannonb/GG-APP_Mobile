import type { StoredSession } from '@gg/shared-types'

export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

/** Used only to scope cached data; never used as proof of authentication. */
export function patientCacheIdentity(session: StoredSession, apiBaseUrl: string): string | null {
  if (session.role !== 'patient') return null
  try {
    const encoded = session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
    return typeof payload.sub === 'string' && payload.sub ? `${apiBaseUrl}|patient|${payload.sub}` : null
  } catch { return null }
}

export function canCachePatientQuery(key: readonly unknown[]) {
  if (key[0] !== 'patient') return false
  if (key[1] === 'invoice' && key.includes('attachment')) return false
  // Grants, PIN status and access logs must always come from the server.
  if (key[1] === 'ledger') return key[2] !== 'status' && key[2] !== 'access'
  return ['profile', 'dashboard', 'appointments', 'transactions', 'notifications', 'invoices', 'invoice', 'prescription-requests', 'credit'].includes(String(key[1]))
}

export function stripCachedFiles(value: unknown): unknown {
  if (typeof value === 'string' && /^(data:|file:|content:|blob:)/i.test(value)) return undefined
  if (Array.isArray(value)) return value.map(stripCachedFiles)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    // nationalId and beneficiary identifiers are identity documents; the
    // cache holds whatever the profile/dashboard surfaces returned, so
    // anything document-like is stripped rather than persisted even in the
    // encrypted blob.
    !['password', 'pin', 'currentPin', 'confirmPin', 'accessToken', 'refreshToken', 'nationalId', 'idNumber'].includes(key))
    .map(([key, item]) => [key, stripCachedFiles(item)]))
}

export function cacheIsCurrent(owner: string, expectedOwner: string, timestamp: number, now = Date.now()) {
  const age = now - timestamp
  return owner === expectedOwner && Number.isFinite(age) && age >= 0 && age <= CACHE_MAX_AGE
}
