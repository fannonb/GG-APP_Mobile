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

/** A completed action: payment authorized, PIN saved. */
export function hapticSuccess(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    // Graceful fallback
  }
}

/** A rejected action: wrong PIN, failed submit. */
export function hapticError(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  } catch {
    // Graceful fallback
  }
}
