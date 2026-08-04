import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getApiBaseUrl, getIsMockApi, getGoogleClientId } from './config'
import { getTokenStorage } from './token-storage'
import { ApiError } from './api-error'
import type { AuthSession } from '@gg/shared-types'

let refreshPromise: Promise<AuthSession | null> | null = null

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

async function refreshAccessToken(): Promise<AuthSession | null> {
  const storage = getTokenStorage()
  const refreshToken = storage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<AuthSession>(
      `${getApiBaseUrl()}/auth/refresh`,
      { refreshToken },
    )
    storage.setSession(data)
    return data
  } catch {
    storage.clear()
    return null
  }
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

    // Never try token refresh on public auth calls (especially failed login → 401).
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !getIsMockApi() &&
      !isAuthPublicPath(original.url)
    ) {
      original._retry = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const session = await refreshPromise
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`
        return apiClient(original)
      }
    }

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
