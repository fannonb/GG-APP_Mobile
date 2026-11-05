import { create } from 'zustand'
import { onlineManager } from '@tanstack/react-query'
import { getApiBaseUrl, getIsMockApi } from '@gg/shared-api'

export const useConnectionStore = create<{
  reachable: boolean | null
  savedAt: number | null
  restoring: boolean
}>(() => ({ reachable: null, savedAt: null, restoring: true }))

export function setReachable(reachable: boolean) {
  useConnectionStore.setState({ reachable })
  onlineManager.setOnline(reachable)
}

let checking: Promise<boolean> | null = null

/** Probe our public API, not a third party; no extra native dependency is needed. */
export function checkConnection(): Promise<boolean> {
  checking ??= (async () => {
    if (getIsMockApi()) { setReachable(true); return true }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4_000)
    try {
      const response = await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/health`, { signal: controller.signal, cache: 'no-store' })
      setReachable(response.ok)
      return response.ok
    } catch {
      setReachable(false)
      return false
    } finally { clearTimeout(timeout) }
  })().finally(() => { checking = null })
  return checking
}
