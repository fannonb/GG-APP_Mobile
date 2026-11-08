import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { apiClient, getIsMockApi, getTokenStorage } from '@gg/shared-api'
import type * as Notifications from 'expo-notifications'

/**
 * Expo push notifications for the patient app.
 *
 * IMPORTANT (Expo Go / SDK 53+): remote push notification support was removed
 * from Expo Go on Android. Loading `expo-notifications` inside Expo Go logs a
 * runtime warning/red-box, so this module never imports it there. Push
 * registration only happens in development/native builds (expo-dev-client or
 * a standalone build), where the native module is actually available.
 *
 * The backend contract mirrors the PWA's Web Push endpoints:
 *   POST /notifications/push/subscribe   { provider: 'expo', token }
 *   POST /notifications/push/unsubscribe { token }
 */

/** True when running inside the Expo Go client, where expo-notifications push is unavailable. */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
}

let handlerConfigured = false
let registeredToken: string | null = null
let registration: Promise<boolean> | null = null
export const NOTIFICATION_CHANNEL_ID = 'ggapp-alerts'

async function loadNotifications(): Promise<typeof Notifications | null> {
  if (Platform.OS === 'web' || isExpoGo()) return null
  const mod = await import('expo-notifications')
  if (!handlerConfigured) {
    handlerConfigured = true
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  }
  return mod
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const mod = await loadNotifications()
  if (!mod) return false

  // Android 13+ will not show its permission prompt before a channel exists.
  if (Platform.OS === 'android') {
    await mod.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "GG'APP alerts",
      importance: mod.AndroidImportance.HIGH,
      sound: 'default',
    })
  }
  const current = await mod.getPermissionsAsync()
  if (current.granted || current.ios?.status === mod.IosAuthorizationStatus.PROVISIONAL) return true
  if (!current.canAskAgain) return false
  const result = await mod.requestPermissionsAsync()
  return result.granted || result.ios?.status === mod.IosAuthorizationStatus.PROVISIONAL
}

export async function getExpoPushToken(): Promise<string | null> {
  const mod = await loadNotifications()
  if (!mod) return null

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    if (__DEV__) {
      console.warn('[notifications] EAS projectId not configured; skipping push token.')
    }
    return null
  }
  try {
    const { data } = await mod.getExpoPushTokenAsync({ projectId })
    return data
  } catch (error) {
    console.warn('[notifications] Could not obtain Expo push token', error)
    return null
  }
}

/**
 * Requests permission, obtains the Expo push token and registers it with the
 * backend. No-op in Expo Go and in mock mode; failures are swallowed so the
 * app keeps working when the push backend is unavailable.
 */
export function registerPushSubscription(): Promise<boolean> {
  if (registration) return registration
  registration = registerDevice().finally(() => { registration = null })
  return registration
}

async function registerDevice(): Promise<boolean> {
  if (getIsMockApi() || isExpoGo() || Platform.OS === 'web') return false
  const storage = getTokenStorage()
  const session = storage.getSession()
  if (!session) return false

  try {
    if (!await ensureNotificationPermissions()) return false
    const token = await getExpoPushToken()
    // Permission/token retrieval can outlive the session that started it.
    if (!token || storage.getSession()?.refreshToken !== session.refreshToken) return false

    const { data } = await apiClient.post<{ success: boolean }>('/notifications/push/subscribe', {
      provider: 'expo',
      token,
    })
    if (!data.success) return false
    registeredToken = token
    return true
  } catch (error) {
    console.warn('[notifications] Push subscription failed', error)
    return false
  }
}

export async function unregisterPushSubscription(token?: string): Promise<void> {
  if (getIsMockApi() || isExpoGo() || Platform.OS === 'web') return
  // Finish any in-flight registration before removing this phone. This keeps
  // a late subscription response from re-enabling alerts after explicit logout.
  await registration
  token ??= registeredToken ?? await getExpoPushToken() ?? undefined
  registeredToken = null
  if (!token) return
  try {
    await apiClient.post('/notifications/push/unsubscribe', { token })
  } catch {
    // Best-effort; the backend may not be reachable.
  }
}

/** Native tokens can rotate while the app is running. */
export async function subscribeToPushTokenChanges(): Promise<{ remove: () => void }> {
  const mod = await loadNotifications()
  if (!mod) return { remove: () => {} }
  return mod.addPushTokenListener(() => { void registerPushSubscription() })
}

export async function subscribeToReceivedNotifications(listener: () => void): Promise<{ remove: () => void }> {
  const mod = await loadNotifications()
  return mod?.addNotificationReceivedListener(listener) ?? { remove: () => {} }
}

export async function subscribeToNotificationResponses(
  listener: (response: Notifications.NotificationResponse) => void,
): Promise<{ remove: () => void }> {
  const mod = await loadNotifications()
  if (!mod) {
    return { remove: () => {} }
  }
  let active = true
  const seen = new Set<string>()
  const deliver = (response: Notifications.NotificationResponse) => {
    const id = `${response.notification.request.identifier}:${response.actionIdentifier}`
    if (!active || seen.has(id)) return
    seen.add(id)
    listener(response)
    void mod.clearLastNotificationResponseAsync().catch(() => {})
  }
  const subscription = mod.addNotificationResponseReceivedListener(deliver)
  // The tap that launched a terminated app predates listener registration.
  void mod.getLastNotificationResponseAsync().then(response => {
    if (response) deliver(response)
  }).catch(() => {})
  return { remove: () => { active = false; subscription.remove() } }
}
