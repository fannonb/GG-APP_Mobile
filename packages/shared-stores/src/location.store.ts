import { create } from 'zustand'
import type { GeoPosition } from '@gg/shared-utils'

export type LocState = 'idle' | 'loading' | 'active' | 'denied' | 'skipped'

interface LocationStore {
  position: GeoPosition | null
  locState: LocState
  error: string | null
  setPosition: (position: GeoPosition) => void
  setDenied: (error: string) => void
  setLoading: () => void
  skip: () => void
  reset: () => void
}

export const useLocationStore = create<LocationStore>((set) => ({
  position: null,
  locState: 'idle',
  error: null,

  setPosition: (position) =>
    set({ position, locState: 'active', error: null }),

  setDenied: (error) =>
    set({ position: null, locState: 'denied', error }),

  setLoading: () =>
    set({ locState: 'loading', error: null }),

  skip: () =>
    set({ position: null, locState: 'skipped' }),

  reset: () =>
    set({ position: null, locState: 'idle', error: null }),
}))
