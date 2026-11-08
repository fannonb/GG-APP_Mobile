import type { StoredSession } from '@gg/shared-types'

export interface ITokenStorage {
  getSession(): StoredSession | null
  setSession(session: StoredSession): void
  clear(): void
  getAccessToken(): string | null
  getRefreshToken(): string | null
  /** Platform cleanup that needs authentication, before explicit sign-out. */
  beforeLogout?(): Promise<void>
}

let _storage: ITokenStorage | null = null

export function setTokenStorage(storage: ITokenStorage) {
  _storage = storage
}

export function getTokenStorage(): ITokenStorage {
  if (!_storage) {
    throw new Error('TokenStorage not initialized. Call setTokenStorage() at app startup.')
  }
  return _storage
}
