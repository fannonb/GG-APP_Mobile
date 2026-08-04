import * as SecureStore from 'expo-secure-store'
import type { ITokenStorage } from '@gg/shared-api'
import type { StoredSession, UserRole } from '@gg/shared-types'

const KEYS = {
  ACCESS: 'gg_access_token',
  REFRESH: 'gg_refresh_token',
  ROLE: 'gg_user_role',
  EXPIRES: 'gg_token_expires',
} as const

let cache: StoredSession | null = null

export async function loadSessionFromStore(): Promise<StoredSession | null> {
  try {
    const [access, refresh, role, expires] = await Promise.all([
      SecureStore.getItemAsync(KEYS.ACCESS),
      SecureStore.getItemAsync(KEYS.REFRESH),
      SecureStore.getItemAsync(KEYS.ROLE),
      SecureStore.getItemAsync(KEYS.EXPIRES),
    ])
    if (!access || !refresh || !role) {
      cache = null
      return null
    }
    cache = {
      accessToken: access,
      refreshToken: refresh,
      role: role as UserRole,
      expiresAt: expires ? Number(expires) : 0,
    }
    return cache
  } catch {
    cache = null
    return null
  }
}

export const mobileTokenStorage: ITokenStorage = {
  getSession(): StoredSession | null {
    return cache
  },

  setSession(session: StoredSession): void {
    cache = session
    SecureStore.setItemAsync(KEYS.ACCESS, session.accessToken).catch(() => {})
    SecureStore.setItemAsync(KEYS.REFRESH, session.refreshToken).catch(() => {})
    SecureStore.setItemAsync(KEYS.ROLE, session.role).catch(() => {})
    SecureStore.setItemAsync(KEYS.EXPIRES, String(session.expiresAt)).catch(() => {})
  },

  clear(): void {
    cache = null
    SecureStore.deleteItemAsync(KEYS.ACCESS).catch(() => {})
    SecureStore.deleteItemAsync(KEYS.REFRESH).catch(() => {})
    SecureStore.deleteItemAsync(KEYS.ROLE).catch(() => {})
    SecureStore.deleteItemAsync(KEYS.EXPIRES).catch(() => {})
  },

  getAccessToken(): string | null {
    return cache?.accessToken ?? null
  },

  getRefreshToken(): string | null {
    return cache?.refreshToken ?? null
  },
}
