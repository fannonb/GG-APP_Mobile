import React, { useEffect } from 'react'
import { ActivityIndicator, NativeModules, Platform, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree'
import { QueryClientProvider } from '@tanstack/react-query'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Constants from 'expo-constants'
import { configure, setTokenStorage } from '@gg/shared-api'
import { queryClient } from '@/lib/query-client'
import { mobileTokenStorage } from '@/lib/token-storage'
import { SessionBootstrap } from '@/providers/SessionBootstrap'
import { RootNavigator } from '@/navigation/RootNavigator'
import { linking } from '@/navigation/linking'
import type { RootStackParamList } from '@/navigation/types'
import { openPatientNotification } from '@/lib/patient-notification-routing'
import { registerPushSubscription, subscribeToNotificationResponses } from '@/services/notifications'
import type { Notification } from '@gg/shared-types'

const API_PORT = 3001
const API_PATH = '/api/v1'

/**
 * The Android emulator's alias for the host machine's loopback. It resolves
 * ONLY inside the emulator — on a physical phone it routes nowhere and every
 * request fails with ERR_NETWORK.
 */
const EMULATOR_HOST_ALIAS = '10.0.2.2'

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function isLoopback(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

/**
 * WSL / Hyper-V vEthernet. Expo often advertises this on Windows and it is not
 * reachable from either a phone or the emulator.
 */
function isUnroutableHost(host: string) {
  if (!host) return true
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
}

/**
 * The host that actually delivered this JS bundle — proven reachable from this
 * device, because we are running the code it served. In Expo Go on a phone this
 * is the dev machine's LAN IP, and it stays correct across DHCP changes.
 */
function getMetroHost(): string | null {
  let fromBundle: string | null = null
  try {
    const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL
    fromBundle = scriptURL ? new URL(scriptURL).hostname : null
  } catch {
    fromBundle = null
  }
  const fromConfig = Constants.expoConfig?.hostUri?.split(':')[0] ?? null

  for (const host of [fromBundle, fromConfig]) {
    if (host && !isUnroutableHost(host)) return host
  }
  return null
}

function getMobileApiBaseUrl() {
  const metroHost = getMetroHost()

  // Reaching Metro over a real LAN address means this is a physical device.
  // (An emulator reaches Metro via the alias or loopback instead, so those two
  // cases are excluded here rather than sniffed via Constants.isDevice, which
  // Expo deprecated — it reads `undefined`, and `undefined === false` is false,
  // which silently misclassified every phone as "not an emulator".)
  const onPhysicalDevice =
    !!metroHost && !isLoopback(metroHost) && metroHost !== EMULATOR_HOST_ALIAS

  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
  const envHost = envBaseUrl ? hostOf(envBaseUrl) : null

  // Release builds have no Metro host to discover: the API target is fixed at
  // build time by EXPO_PUBLIC_API_BASE_URL. Failing loudly here is deliberate —
  // a test APK that silently points at localhost/10.0.2.2 is useless and hides
  // the misconfiguration until runtime.
  if (!__DEV__) {
    if (!envBaseUrl || !envHost || isUnroutableHost(envHost)) {
      throw new Error(
        '[GG Mobile] Release builds must set EXPO_PUBLIC_API_BASE_URL to the deployed API base URL ' +
          '(e.g. https://api-production-<service>.up.railway.app/api/v1) at build time.',
      )
    }
    return envBaseUrl
  }

  // A .env pointing at the emulator alias cannot work on a phone. Honouring it
  // guarantees ERR_NETWORK, so ignore it and fall through to the Metro host.
  // This is what makes the app self-healing when .env goes stale.
  const envUnusableHere = onPhysicalDevice && envHost === EMULATOR_HOST_ALIAS

  const candidates: string[] = []
  const metroApiUrl = metroHost ? `http://${metroHost}:${API_PORT}${API_PATH}` : null
  // Metro host delivered this bundle — always prefer it over a stale .env LAN IP.
  if (metroApiUrl) candidates.push(metroApiUrl)
  if (envBaseUrl && !envUnusableHere && envBaseUrl !== metroApiUrl) {
    candidates.push(envBaseUrl)
  }
  if (Platform.OS === 'android' && !onPhysicalDevice) {
    candidates.push(`http://${EMULATOR_HOST_ALIAS}:${API_PORT}${API_PATH}`)
  }
  candidates.push(`http://localhost:${API_PORT}${API_PATH}`)

  for (const url of candidates) {
    const host = hostOf(url)
    if (host && !isUnroutableHost(host)) {
      if (__DEV__) {
        console.log(
          `[GG Mobile] API base URL: ${url}\n` +
            `  metroHost=${metroHost ?? 'none'} physicalDevice=${onPhysicalDevice}\n` +
            `  env=${envBaseUrl ?? 'unset'}${envUnusableHere ? ' (IGNORED: emulator-only address on a real device)' : ''}`,
        )
      }
      return url
    }
  }

  return `http://${Platform.OS === 'android' ? EMULATOR_HOST_ALIAS : 'localhost'}:${API_PORT}${API_PATH}`
}

const apiBaseUrl = getMobileApiBaseUrl()
const navigationRef = createNavigationContainerRef<RootStackParamList>()

configure({
  baseUrl: apiBaseUrl,
  mockApi: process.env.EXPO_PUBLIC_MOCK_API === 'true',
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '',
})
setTokenStorage(mobileTokenStorage)

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GG Mobile render error]', error.stack ?? error.message)
    console.error('[GG Mobile component stack]', info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.loading}>
          <StatusBar style="light" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
        </View>
      )
    }

    return this.props.children
  }
}

export default function App() {
  // Opens the right screen when the user taps a push notification.
  useEffect(() => {
    let sub: { remove: () => void } | null = null

    void subscribeToNotificationResponses(response => {
      const data = response.notification.request.content.data as
        | { notification?: Notification }
        | undefined
      const notification = data?.notification
      if (!notification || !navigationRef.isReady()) return

      openPatientNotification(
        {
          navigate: (name, params) => {
            ;(navigationRef.navigate as (routeName: string, params?: unknown) => void)(
              'App',
              { screen: name, params },
            )
          },
        },
        notification,
      )
    }).then(handle => {
      sub = handle
    })

    // Register for push once on launch; SessionBootstrap re-attempts on login.
    void registerPushSubscription()

    return () => sub?.remove()
  }, [])

  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  })

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color="#38B6FF" />
      </View>
    )
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <SessionBootstrap />
            <NavigationContainer ref={navigationRef} linking={linking}>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#091C44',
  },
  loading: {
    flex: 1,
    backgroundColor: '#091C44',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    textAlign: 'center',
  },
})
