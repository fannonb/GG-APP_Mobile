const { test } = require('node:test')
const assert = require('node:assert/strict')
const load = require('./load-ts.cjs')

function notifications({ granted = false, mock = false, expoGo = false, rejected = false, platform = 'android' } = {}) {
  const calls = []
  let session = { accessToken: 'access', refreshToken: 'refresh' }
  const api = load('apps/mobile/src/services/notifications.ts', {
    'react-native': { Platform: { OS: platform } },
    'expo-constants': { __esModule: true, default: { executionEnvironment: expoGo ? 'store' : 'standalone', easConfig: { projectId: 'project' } }, ExecutionEnvironment: { StoreClient: 'store' } },
    '@gg/shared-api': {
      getIsMockApi: () => mock,
      getTokenStorage: () => ({ getSession: () => session }),
      apiClient: { post: async (url, data) => { calls.push([url, data]); return { data: { success: !rejected } } } },
    },
    'expo-notifications': {
      setNotificationHandler() {},
      AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
      setNotificationChannelAsync: async id => { calls.push(['channel', id]) },
      getPermissionsAsync: async () => { calls.push(['permission']); return { granted, canAskAgain: true } },
      requestPermissionsAsync: async () => { calls.push(['request']); return { granted: true } },
      getExpoPushTokenAsync: async args => { calls.push(['token', args]); return { data: 'ExponentPushToken[phone]' } },
    },
  })
  return { ...api, calls, clearSession: () => { session = null } }
}

test('Android creates its channel before permission and uses the EAS project token', async () => {
  const api = notifications()
  assert.equal(await api.registerPushSubscription(), true)
  assert.deepEqual(api.calls.map(call => call[0]), ['channel', 'permission', 'request', 'token', '/notifications/push/subscribe'])
  assert.deepEqual(api.calls[3][1], { projectId: 'project' })
})

test('granted permission is not requested again and concurrent registrations share one request', async () => {
  const api = notifications({ granted: true })
  assert.deepEqual(await Promise.all([api.registerPushSubscription(), api.registerPushSubscription()]), [true, true])
  assert.equal(api.calls.filter(call => call[0] === '/notifications/push/subscribe').length, 1)
  assert.equal(api.calls.some(call => call[0] === 'request'), false)
})

test('logged-out, Expo Go, mock and web sessions never register native push', async () => {
  for (const options of [{ mock: true }, { expoGo: true }, { platform: 'web' }, {}]) {
    const api = notifications(options)
    if (!Object.keys(options).length) api.clearSession()
    assert.equal(await api.registerPushSubscription(), false)
    assert.deepEqual(api.calls, [])
  }
})

test('a rejected backend subscription is not reported as enabled', async () => {
  const api = notifications({ rejected: true })
  assert.equal(await api.registerPushSubscription(), false)
})

test('logout waits for an in-flight registration and removes its actual Expo token', async () => {
  const api = notifications({ granted: true })
  const registering = api.registerPushSubscription()
  const unregistering = api.unregisterPushSubscription()
  await Promise.all([registering, unregistering])
  assert.deepEqual(api.calls.slice(-2), [
    ['/notifications/push/subscribe', { provider: 'expo', token: 'ExponentPushToken[phone]' }],
    ['/notifications/push/unsubscribe', { token: 'ExponentPushToken[phone]' }],
  ])
})

test('shared logout runs platform cleanup with authentication before clearing tokens', async () => {
  const calls = []
  let token = 'access'
  const storage = {
    beforeLogout: async () => { assert.equal(token, 'access'); calls.push('unsubscribe') },
    getAccessToken: () => token,
    getRefreshToken: () => 'refresh',
    clear: () => { token = null; calls.push('clear') },
  }
  const { authService } = load('packages/shared-api/src/services/auth.service.ts', {
    '../mock/delay': { mockDelay: async () => {} },
    '../config': { getIsMockApi: () => false },
    '../client': { apiClient: { post: async (url, data, options) => { calls.push(url); assert.equal(options.headers.Authorization, 'Bearer access') } } },
    '../token-storage': { getTokenStorage: () => storage },
  })
  await authService.logout()
  assert.deepEqual(calls, ['unsubscribe', 'clear', '/auth/logout'])
})

test('failed platform cleanup cannot prevent local logout', async () => {
  let cleared = false
  const { authService } = load('packages/shared-api/src/services/auth.service.ts', {
    '../mock/delay': { mockDelay: async () => {} },
    '../config': { getIsMockApi: () => false },
    '../client': { apiClient: { post: async () => {} } },
    '../token-storage': { getTokenStorage: () => ({
      beforeLogout: async () => { throw new Error('Offline') },
      getAccessToken: () => 'access', getRefreshToken: () => 'refresh',
      clear: () => { cleared = true },
    }) },
  })
  await authService.logout()
  assert.equal(cleared, true)
})
