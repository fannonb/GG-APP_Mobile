import { useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { getApiBaseUrl, getTokenStorage } from '@gg/shared-api'
import { useAuthStore } from '@gg/shared-stores'
import { patientCacheIdentity } from './patient-cache-policy'
import {
  hashText,
  sanitizeDismissedMap,
  visibleAttention,
  withAttentionDismissed,
  type DismissedMap,
  type DismissibleAttentionItem,
} from './attention-dismissals'

/*
 * Storage: one SecureStore value per scope (the signed-in patient's id when the
 * session has one, otherwise the role, as on the PWA). Keys may contain only
 * alphanumerics, '.', '-' and '_'; the scope is hashed so it always does.
 *
 * Failures never block the UI: a failed read starts from an empty map, and a
 * failed write leaves the dismissal in memory for the rest of the session.
 */

const KEY_PREFIX = 'gg_attention_dismissed_'

function storageKey(scope: string): string {
  return `${KEY_PREFIX}${scope}`
}

async function loadSaved(scope: string): Promise<DismissedMap> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(scope))
    return raw ? sanitizeDismissedMap(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

async function saveMap(scope: string, map: DismissedMap): Promise<void> {
  try {
    await SecureStore.setItemAsync(storageKey(scope), JSON.stringify(map))
  } catch {
    // Storage unavailable: the in-memory copy still hides the notice this session.
  }
}

/** Signed-in patient id when available, otherwise the role. Never throws. */
export function attentionScope(role: string | null | undefined): string {
  try {
    const session = getTokenStorage().getSession()
    const identity = session ? patientCacheIdentity(session, getApiBaseUrl()) : null
    if (identity) return `id-${hashText(identity)}`
  } catch {
    // Token storage not ready yet: fall back to the role.
  }
  return role ?? 'guest'
}

interface AttentionDismissalsState {
  scope: string | null
  /** Null until this scope's saved dismissals have loaded. */
  map: DismissedMap | null
  load: (scope: string) => Promise<void>
  dismiss: (scope: string, item: DismissibleAttentionItem) => void
}

export const useAttentionDismissalsStore = create<AttentionDismissalsState>((set, get) => ({
  scope: null,
  map: null,
  load: async scope => {
    if (get().scope === scope) return
    set({ scope, map: null })
    const saved = await loadSaved(scope)
    // The account may have changed while the read was in flight.
    if (get().scope !== scope) return
    set({ map: saved })
  },
  dismiss: (scope, item) => {
    const state = get()
    // Notices only render once their scope has loaded, so a dismissal always has a base map.
    if (state.scope !== scope || !state.map) return
    const next = withAttentionDismissed(state.map, item)
    set({ map: next })
    void saveMap(scope, next)
  },
}))

/**
 * Dismissal state for the signed-in account. `filterVisible` drops notices the
 * patient dismissed and returns nothing until the saved state has loaded.
 * `dismiss` persists one notice; call it from the notice's × button.
 */
export function useAttentionDismissals() {
  const role = useAuthStore(state => state.userRole)
  const scope = attentionScope(role)
  const map = useAttentionDismissalsStore(state => (state.scope === scope ? state.map : null))

  useEffect(() => {
    void useAttentionDismissalsStore.getState().load(scope)
  }, [scope])

  return {
    ready: map !== null,
    filterVisible: <T extends DismissibleAttentionItem>(items: T[]): T[] =>
      map ? visibleAttention(items, map) : [],
    dismiss: (item: DismissibleAttentionItem): void =>
      useAttentionDismissalsStore.getState().dismiss(scope, item),
  }
}
