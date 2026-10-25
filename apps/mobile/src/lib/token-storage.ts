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
    console.warn('[token-storage] SecureStore read failed; session cleared in memory')
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
    // THIS_DEVICE_ONLY keeps access/refresh tokens out of iCloud Keychain
    // sync and device backups — a session restored onto another device would
    // outlive its jti context anyway (the cache AES key is device-only too).
    // Android Keystore-encrypted storage is unaffected by this option.
    const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    SecureStore.setItemAsync(KEYS.ACCESS, session.accessToken, secureOptions).catch(err =>
      console.warn('[token-storage] SecureStore write failed (access token)', err),
    )
    SecureStore.setItemAsync(KEYS.REFRESH, session.refreshToken, secureOptions).catch(err =>
      console.warn('[token-storage] SecureStore write failed (refresh token)', err),
    )
    SecureStore.setItemAsync(KEYS.ROLE, session.role).catch(err =>
      console.warn('[token-storage] SecureStore write failed (role)', err),
    )
    SecureStore.setItemAsync(KEYS.EXPIRES, String(session.expiresAt)).catch(err =>
      console.warn('[token-storage] SecureStore write failed (expiry)', err),
    )
  },

  clear(): void {
    cache = null
    SecureStore.deleteItemAsync(KEYS.ACCESS).catch(err =>
      console.warn('[token-storage] SecureStore delete failed (access token)', err),
    )
    SecureStore.deleteItemAsync(KEYS.REFRESH).catch(err =>
      console.warn('[token-storage] SecureStore delete failed (refresh token)', err),
    )
    SecureStore.deleteItemAsync(KEYS.ROLE).catch(err =>
      console.warn('[token-storage] SecureStore delete failed (role)', err),
    )
    SecureStore.deleteItemAsync(KEYS.EXPIRES).catch(err =>
      console.warn('[token-storage] SecureStore delete failed (expiry)', err),
    )
  },

  getAccessToken(): string | null {
    return cache?.accessToken ?? null
  },

  getRefreshToken(): string | null {
    return cache?.refreshToken ?? null
  },
}
