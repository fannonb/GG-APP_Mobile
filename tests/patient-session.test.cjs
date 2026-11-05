const { test } = require('node:test')
const assert = require('node:assert/strict')
const axios = require('axios')
const { QueryClient, onlineManager } = require('@tanstack/react-query')
const crypto = require('node:crypto')
const load = require('./load-ts.cjs')
const { ApiError } = load('packages/shared-api/src/api-error.ts')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function sessionClient(post, adapter) {
  let session = { accessToken: 'old-access', refreshToken: 'old-refresh', role: 'patient', expiresAt: 100 }
  let clears = 0
  const storage = {
    getSession: () => session,
    getAccessToken: () => session?.accessToken ?? null,
    getRefreshToken: () => session?.refreshToken ?? null,
    setSession: value => { session = value },
    clear: () => { session = null; clears++ },
  }
  const client = load('packages/shared-api/src/client.ts', {
    axios: { ...axios, create: config => axios.create({ ...config, adapter }), post },
    './config': { getApiBaseUrl: () => 'https://test.invalid/api', getIsMockApi: () => false, getGoogleClientId: () => '' },
    './token-storage': { getTokenStorage: () => storage },
    './api-error': { ApiError },
  })
  return { ...client, storage, clears: () => clears }
}

function axiosFailure(status, config = {}) {
  return new axios.AxiosError('Request failed', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config, {}, status ? { status, data: {}, headers: {}, config } : undefined)
}

test('simultaneous expired patient reads rotate a refresh token only once', async () => {
  let refreshes = 0
  const next = { accessToken: 'new-access', refreshToken: 'new-refresh', role: 'patient', expiresAt: 200 }
  const client = sessionClient(async () => { refreshes++; await delay(10); return { data: next } }, async config => {
    if (config.headers.Authorization !== 'Bearer new-access') throw axiosFailure(401, config)
    return { status: 200, data: { ok: true }, headers: {}, config }
  })
  const results = await Promise.all([client.apiClient.get('/patient/profile'), client.apiClient.get('/patient/invoices')])
  assert.equal(refreshes, 1)
  assert.equal(results.every(result => result.data.ok), true)
  assert.equal(client.storage.getAccessToken(), 'new-access')
  assert.equal(client.clears(), 0)
})

test('network/server refresh failures preserve tokens; rejected credentials clear them', async () => {
  for (const status of [undefined, 503, 401, 403]) {
    const client = sessionClient(async () => { throw axiosFailure(status) })
    await assert.rejects(client.refreshAuthSession(), error => error instanceof ApiError && error.status === (status ?? 0))
    assert.equal(client.clears(), status === 401 || status === 403 ? 1 : 0)
    assert.equal(client.storage.getAccessToken(), status === 401 || status === 403 ? null : 'old-access')
  }
})

test('logout while refresh is running cannot restore the old session', async () => {
  let complete
  const client = sessionClient(() => new Promise(resolve => { complete = resolve }))
  const refreshing = client.refreshAuthSession()
  client.storage.clear()
  complete({ data: { accessToken: 'late-access', refreshToken: 'late-refresh', role: 'patient' } })
  assert.equal(await refreshing, null)
  assert.equal(client.storage.getSession(), null)
})

test('an old account response cannot clear the newly signed-in account', async () => {
  let finish
  const client = sessionClient(async () => { throw new Error('Should not refresh') }, config => new Promise((resolve, reject) => { finish = () => reject(axiosFailure(401, config)) }))
  const read = client.apiClient.get('/patient/profile')
  await delay(0)
  client.storage.setSession({ accessToken: 'different-account', refreshToken: 'different-refresh', role: 'patient' })
  finish()
  await assert.rejects(read)
  assert.equal(client.storage.getAccessToken(), 'different-account')
  assert.equal(client.clears(), 0)
})

test('failed login never refreshes a previous patient session', async () => {
  let refreshes = 0
  const client = sessionClient(async () => { refreshes++; return {} }, async config => { throw axiosFailure(401, config) })
  await assert.rejects(client.apiClient.post('/auth/login', {}))
  assert.equal(refreshes, 0)
  assert.equal(client.clears(), 0)
})

test('offline mutation is rejected before its function, even with a per-screen onMutate', async () => {
  const { queryClient } = load('apps/mobile/src/lib/query-client.ts', { '@gg/shared-api': { ApiError } })
  let submissions = 0
  onlineManager.setOnline(false)
  try {
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => { submissions++; return true },
      onMutate: () => {},
    })
    await assert.rejects(mutation.execute(), /Reconnect before/)
    assert.equal(submissions, 0)
    onlineManager.setOnline(true)
    await delay(0)
    assert.equal(submissions, 0, 'reconnect must not submit a previously rejected payment')
  } finally { onlineManager.setOnline(true); queryClient.clear() }
})

test('the tap that launches a terminated app is delivered once and listeners stop after cleanup', async () => {
  let liveListener
  let clears = 0
  let removals = 0
  const response = { notification: { request: { identifier: 'push-1' } }, actionIdentifier: 'default' }
  const received = []
  const { subscribeToNotificationResponses } = load('apps/mobile/src/services/notifications.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { __esModule: true, default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'store' } },
    '@gg/shared-api': {},
    'expo-notifications': {
      setNotificationHandler() {},
      addNotificationResponseReceivedListener: listener => { liveListener = listener; return { remove: () => { removals++ } } },
      getLastNotificationResponseAsync: async () => response,
      clearLastNotificationResponseAsync: async () => { clears++ },
    },
  })
  const subscription = await subscribeToNotificationResponses(item => received.push(item))
  await delay(0)
  liveListener(response)
  assert.equal(received.length, 1)
  assert.equal(clears, 1)
  subscription.remove()
  liveListener({ ...response, actionIdentifier: 'another' })
  assert.equal(received.length, 1)
  assert.equal(removals, 1)
})

test('encrypted saved reads restore only to the same patient and are purged on logout', async () => {
  const disk = new Map()
  const secrets = new Map()
  const queryClient = new QueryClient()
  const state = {}
  class File {
    constructor() { this.path = 'cache' }
    get exists() { return disk.has(this.path) }
    get size() { return Buffer.byteLength(disk.get(this.path) ?? '') }
    async text() { return disk.get(this.path) }
    create() { disk.set(this.path, '') }
    write(text) { assert.equal(this.exists, true); disk.set(this.path, text) }
    delete() { disk.delete(this.path) }
  }
  class Key {
    constructor(bytes) { this.value = bytes }
    static async generate() { return new Key(crypto.randomBytes(32)) }
    static async import(value) { return new Key(Buffer.from(value, 'base64')) }
    async encoded() { return this.value.toString('base64') }
  }
  const encryption = {
    AESEncryptionKey: Key,
    AESSealedData: { fromCombined: data => Buffer.from(data, 'base64') },
    aesEncryptAsync: async (plaintext, key) => {
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', key.value, iv)
      const encrypted = Buffer.concat([iv, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
      return { combined: async () => encrypted.toString('base64') }
    },
    aesDecryptAsync: async (data, key) => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key.value, data.subarray(0, 12))
      decipher.setAuthTag(data.subarray(-16))
      return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()])
    },
  }
  const cache = load('apps/mobile/src/lib/patient-query-cache.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-file-system': { File, Paths: { cache: 'cache' } },
    'expo-crypto': encryption,
    'expo-secure-store': {
      getItemAsync: async key => secrets.get(key), setItemAsync: async (key, value) => secrets.set(key, value), deleteItemAsync: async key => secrets.delete(key),
    },
    '@gg/shared-api': { getApiBaseUrl: () => 'https://test.invalid/api' },
    './query-client': { queryClient },
    './connection': { useConnectionStore: { setState: value => Object.assign(state, value) } },
    './patient-cache-policy': load('apps/mobile/src/lib/patient-cache-policy.ts'),
  })
  const session = sub => ({ accessToken: `h.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.s`, role: 'patient' })
  try {
    await cache.restorePatientQueryCache(session('alice'))
    queryClient.setQueryData(['patient', 'profile', 'existing'], { user: { name: 'Alice Private' }, beneficiaries: [] })
    queryClient.setQueryData(['patient', 'invoice', 'INV-1', 'attachment'], { dataUrl: 'data:SECRET' })
    await delay(1150)
    assert.equal(disk.size, 1)
    assert.equal([...disk.values()][0].includes('Alice'), false)
    queryClient.clear()
    await cache.restorePatientQueryCache(session('bob'))
    assert.equal(queryClient.getQueryData(['patient', 'profile', 'existing']), undefined)
    await cache.restorePatientQueryCache(session('alice'))
    assert.equal(queryClient.getQueryData(['patient', 'profile', 'existing']).user.name, 'Alice Private')
    assert.equal(queryClient.getQueryData(['patient', 'invoice', 'INV-1', 'attachment']), undefined)
    queryClient.setQueryData(['patient', 'profile', 'existing'], { user: { name: 'Pending update' } })
    await cache.clearPatientQueryCache()
    await delay(1100)
    assert.equal(disk.size, 0)
    assert.equal(secrets.size, 0)
    assert.equal(state.savedAt, null)
  } finally { await cache.clearPatientQueryCache(); queryClient.clear() }
})
