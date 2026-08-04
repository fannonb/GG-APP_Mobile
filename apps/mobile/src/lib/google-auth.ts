import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import * as Crypto from 'expo-crypto'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { getGoogleClientId, getGoogleOAuthUrl } from '@gg/shared-api'

export interface GoogleAuthCodeResult {
  code: string
  redirectUri: string
  codeVerifier: string
  /** Google OAuth client ID used for the request — tells the backend which Google client to use. */
  clientId: string
}

/** Deep link used while running inside Expo Go (exp://…). Google rejects these URIs. */
function getExpoGoRedirectUri(): string {
  return Linking.createURL('auth/google')
}

/**
 * Redirect URI that Google sends the auth code back to.
 *
 * - Expo Go: `exp://…` — Google's OAuth policy blocks this, so Google sign-in
 *   cannot work in Expo Go (it needs a development/native build instead).
 * - Development/native build: reverse-DNS URI derived from the Android OAuth
 *   client ID (`com.googleusercontent.apps.<client-id>:/oauth2redirect`), the
 *   format Google documents for installed apps. The scheme must also be listed
 *   in app.json `expo.scheme`, and the URI authorized on the Android OAuth
 *   client in Google Cloud Console.
 */
export function getGoogleRedirectUri(): string {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return getExpoGoRedirectUri()
  }
  const clientId = getGoogleClientId()
  if (!clientId) return getExpoGoRedirectUri()
  const clientIdPrefix = clientId.replace(/\.apps\.googleusercontent\.com$/, '')
  return `com.googleusercontent.apps.${clientIdPrefix}:/oauth2redirect`
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Creates a PKCE S256 verifier/challenge pair. Google's OAuth policy requires
 * PKCE for these flows, so the verifier is kept for the backend token exchange.
 */
async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const bytes = Crypto.getRandomValues(new Uint8Array(32))
  const verifier = base64UrlEncode(bytes)
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  )
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return { verifier, challenge }
}

/**
 * Opens the Google OAuth authorization page (response_type=code, openid email
 * profile, PKCE S256) and resolves with the auth code + verifier when the user
 * completes the flow, or null when cancelled/failed.
 */
export async function startGoogleSignIn(): Promise<GoogleAuthCodeResult | null> {
  const clientId = getGoogleClientId()
  const redirectUri = getGoogleRedirectUri()
  const baseUrl = getGoogleOAuthUrl(redirectUri)
  if (!clientId || !baseUrl) return null

  const { verifier, challenge } = await createPkcePair()
  const sep = baseUrl.includes('?') ? '&' : '?'
  const url =
    `${baseUrl}${sep}code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`

  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri)
  if (result.type !== 'success' || !result.url) return null

  const parsed = Linking.parse(result.url)
  const params = parsed.queryParams as Record<string, unknown> | undefined
  const code = params?.code
  const error = params?.error

  if (error || typeof code !== 'string' || !code) return null
  return { code, redirectUri, codeVerifier: verifier, clientId }
}