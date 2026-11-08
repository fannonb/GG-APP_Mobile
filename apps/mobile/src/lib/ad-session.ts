import { create } from 'zustand'
import { useAuthStore } from '@gg/shared-stores'

/**
 * Whether the patient closed the home ad carousel. Kept in memory only, so it is
 * shown again on a cold start, and it is reset whenever the patient signs in or out.
 */
interface AdSessionState {
  adsClosed: boolean
  closeAds: () => void
  reset: () => void
}

export const useAdSessionStore = create<AdSessionState>(set => ({
  adsClosed: false,
  closeAds: () => set({ adsClosed: true }),
  reset: () => set({ adsClosed: false }),
}))

// Subscribed once, when this module loads: any sign-in or sign-out shows the ads again.
useAuthStore.subscribe((state, prev) => {
  if (state.loggedIn !== prev.loggedIn) useAdSessionStore.getState().reset()
})
