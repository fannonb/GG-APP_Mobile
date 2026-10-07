import * as SecureStore from 'expo-secure-store'

const INTRO_SEEN_KEY = 'gg_intro_seen'

/** Whether this device has already been through the welcome carousel. */
export function hasSeenIntro(): boolean {
  try {
    return SecureStore.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen(): void {
  try {
    SecureStore.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // Not critical: the carousel just shows again next launch.
  }
}
