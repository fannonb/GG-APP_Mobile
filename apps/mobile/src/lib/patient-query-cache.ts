import { Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync } from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { dehydrate, hydrate, type DehydratedState } from '@tanstack/react-query'
import { getApiBaseUrl } from '@gg/shared-api'
import type { StoredSession } from '@gg/shared-types'
import { queryClient } from './query-client'
import { useConnectionStore } from './connection'
import { cacheIsCurrent, canCachePatientQuery, patientCacheIdentity, stripCachedFiles } from './patient-cache-policy'

const KEY = 'gg_patient_cache_aes_v1'
const MAX_BYTES = 2_000_000
let generation = 0
let unsubscribe: (() => void) | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let writes: Promise<void> = Promise.resolve()

const cacheFile = () => new File(Paths.cache, 'gg-patient-cache-v1.bin')

async function encryptionKey() {
  const stored = await SecureStore.getItemAsync(KEY)
  if (stored) return AESEncryptionKey.import(stored, 'base64')
  const key = await AESEncryptionKey.generate()
  await SecureStore.setItemAsync(KEY, await key.encoded('base64'), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
  return key
}

function stop() {
  generation++
  unsubscribe?.()
  unsubscribe = undefined
  if (timer) clearTimeout(timer)
  timer = undefined
}

/** Serialize purge behind pending writes so logout cannot resurrect patient data. */
export function clearPatientQueryCache(): Promise<void> {
  stop()
  useConnectionStore.setState({ savedAt: null })
  writes = writes.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return
    const file = cacheFile()
    try { if (file.exists) file.delete() }
    finally { await SecureStore.deleteItemAsync(KEY) }
  }).catch(() => { console.warn('[patient-cache] Could not remove saved data') })
  return writes
}

export async function restorePatientQueryCache(session: StoredSession) {
  stop()
  const current = generation
  const owner = patientCacheIdentity(session, getApiBaseUrl())
  if (!owner || Platform.OS === 'web') return
  await writes
  try {
    const file = cacheFile()
    const storedKey = await SecureStore.getItemAsync(KEY)
    if (file.exists && file.size <= MAX_BYTES * 2 && storedKey) {
      const sealed = AESSealedData.fromCombined(await file.text())
      const plaintext = await aesDecryptAsync(sealed, await AESEncryptionKey.import(storedKey, 'base64'))
      const saved = JSON.parse(new TextDecoder().decode(plaintext)) as { owner: string; timestamp: number; state: DehydratedState }
      if (current === generation && cacheIsCurrent(saved.owner, owner, saved.timestamp)) {
        // Only the allowlisted read queries can be restored. Never resume mutations.
        hydrate(queryClient, { mutations: [], queries: saved.state.queries.filter(query => canCachePatientQuery(query.queryKey)) })
        useConnectionStore.setState({ savedAt: saved.timestamp })
      }
    }
  } catch { console.warn('[patient-cache] Saved data unavailable; continuing without it') }
  if (current !== generation) return
  unsubscribe = queryClient.getQueryCache().subscribe(event => {
    if (event.type !== 'updated' || event.action.type !== 'success' || !canCachePatientQuery(event.query.queryKey)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      const state = stripCachedFiles(dehydrate(queryClient, {
        shouldDehydrateMutation: () => false,
        shouldDehydrateQuery: query => query.state.status === 'success' && canCachePatientQuery(query.queryKey),
      }))
      const timestamp = Date.now()
      const json = JSON.stringify({ owner, timestamp, state })
      const plaintext = new TextEncoder().encode(json)
      if (plaintext.byteLength > MAX_BYTES) return
      writes = writes.catch(() => {}).then(async () => {
        if (current !== generation) return
        const sealed = await aesEncryptAsync(plaintext, await encryptionKey())
        const encrypted = await sealed.combined('base64')
        if (current !== generation) return
        const file = cacheFile()
        if (!file.exists) file.create()
        await file.write(encrypted)
        useConnectionStore.setState({ savedAt: timestamp })
      }).catch(() => { console.warn('[patient-cache] Could not save data securely') })
    }, 1_000)
  })
}
