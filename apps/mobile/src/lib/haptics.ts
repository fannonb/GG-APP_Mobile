import * as Haptics from 'expo-haptics'

export function hapticLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {
    // Graceful fallback on web or unsupported devices
  }
}

export function hapticMedium(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  } catch {
    // Graceful fallback
  }
}

export function hapticSelection(): void {
  try {
    void Haptics.selectionAsync()
  } catch {
    // Graceful fallback
  }
}
