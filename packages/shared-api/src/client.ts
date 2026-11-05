import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getApiBaseUrl, getIsMockApi, getGoogleClientId } from './config'
import { getTokenStorage } from './token-storage'
import { ApiError } from './api-error'
import type { AuthSession } from '@gg/shared-types'

let refreshPromise: Promise<AuthSession | null> | null = null
let refreshTokenInFlight: string | null = null

export const apiClient = axios.create({
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getApiBaseUrl()
  if (getIsMockApi()) return config
  const token = getTokenStorage().getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

async function performRefresh(): Promise<AuthSession | null> {
  const storage = getTokenStorage()
  const refreshToken = storage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<AuthSession>(
      `${getApiBaseUrl()}/auth/refresh`,
      { refreshToken },
      { timeout: 10_000 },
    )
    // A logout/account change during the request must not restore the old session.
    if (storage.getRefreshToken() !== refreshToken) return null
    storage.setSession(data)
    return data
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if ((status === 401 || status === 403) && storage.getRefreshToken() === refreshToken) storage.clear()
    throw new ApiError(status === 401 || status === 403 ? 'Your session has expired. Please sign in again.' : 'Unable to reconnect. Your saved session is still available.', status ?? 0)
  }
}

/** Share token rotation between bootstrap, reconnect, and simultaneous 401s. */
export function refreshAuthSession(): Promise<AuthSession | null> {
  const token = getTokenStorage().getRefreshToken()
  if (!refreshPromise || refreshTokenInFlight !== token) {
    refreshTokenInFlight = token
    const pending = performRefresh().finally(() => {
      if (refreshPromise === pending) { refreshPromise = null; refreshTokenInFlight = null }
    })
    refreshPromise = pending
  }
  return refreshPromise
}

function isAuthPublicPath(url?: string) {
  if (!url) return false
  return /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-email|google)/i.test(
    url,
  )
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const message = (data as { message?: unknown }).message
  if (typeof message === 'string' && message.trim()) return message
  if (Array.isArray(message) && message.length > 0) return message.map(String).join(', ')
  return fallback
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status
    const requestUrl = `${original?.baseURL ?? getApiBaseUrl()}${original?.url ?? ''}`
    const currentToken = getTokenStorage().getAccessToken()
    const belongsToCurrentSession = !!currentToken && original?.headers?.Authorization === `Bearer ${currentToken}`

    // Never try token refresh on public auth calls (especially failed login → 401).
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !getIsMockApi() &&
      belongsToCurrentSession &&
      !isAuthPublicPath(original.url)
    ) {
      original._retry = true
      const session = await refreshAuthSession()
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`
        return apiClient(original)
      }
    }
    const latestToken = getTokenStorage().getAccessToken()
    if (status === 401 && latestToken && original?.headers?.Authorization === `Bearer ${latestToken}` && !isAuthPublicPath(original?.url)) getTokenStorage().clear()

    const rawMessage = extractErrorMessage(
      error.response?.data,
      error.message ?? 'An unexpected error occurred',
    )

    // Axios surfaces offline / unreachable hosts as the opaque "Network Error".
    const isNetworkFailure =
      !error.response &&
      (error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        /network error/i.test(rawMessage))

    const message = isNetworkFailure
      ? `Network error — cannot reach ${getApiBaseUrl()}. Is the backend running?`
      : rawMessage

    if (isNetworkFailure && typeof console !== 'undefined') {
      console.warn('[GG API] Network failure', {
        code: error.code,
        method: original?.method,
        url: requestUrl,
        baseUrl: getApiBaseUrl(),
      })
    }

    return Promise.reject(new ApiError(message, status ?? (isNetworkFailure ? 0 : 500)))
  },
)

export function getGoogleOAuthUrl(redirectUri: string): string | null {
  const clientId = getGoogleClientId()
  if (!clientId) return null
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
