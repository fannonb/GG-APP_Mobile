import { AccessibilityInfo, LayoutAnimation, Platform, UIManager } from 'react-native'

/**
 * Shared motion helpers. Everything here respects the system "Reduce motion"
 * setting, so animated layout changes become instant for people who turn it on.
 */
let reduceMotion = false

AccessibilityInfo.isReduceMotionEnabled()
  .then(value => {
    reduceMotion = value
  })
  .catch(() => {})
AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
  reduceMotion = value
})

// Old-architecture Android needs this switch; the new architecture ignores it.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  } catch {
    // no-op on the new architecture
  }
}

export function prefersReducedMotion(): boolean {
  return reduceMotion
}

/**
 * Call right before a state change that adds, removes or resizes content
 * (dismissing an alert, expanding a record, switching a filter). The next
 * layout pass animates instead of jumping.
 */
export function animateNextLayout(duration = 220): void {
  if (reduceMotion) return
  LayoutAnimation.configureNext({
    duration,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  })
}
