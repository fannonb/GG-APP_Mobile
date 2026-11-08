import React, { createContext } from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'
import { OfflineBanner } from './OfflineBanner'
import AppHeader, { type HeaderGreeting, type HeaderVariant } from './AppHeader'

interface ScreenProps {
  children: React.ReactNode
  bg?: string
  /**
   * The app bar every screen opens with. `tabRoot` for the five tab roots,
   * `detail` for pushed screens, `modal` for task screens that slide up, and
   * `auth` for sign-in and onboarding. `none` paints only the status-bar strip
   * (the splash screen).
   */
  header?: HeaderVariant | 'none'
  /** Screen-specific action on the right of the bar, after the market flag. */
  headerRight?: React.ReactNode
  /** Greeting in the bar, just before the market flag. Only the dashboard passes one. */
  headerGreeting?: HeaderGreeting
  /** Replaces the default back or close action (navigation.goBack). */
  onBack?: () => void
  /** Navy curve behind the content. Defaults to `dark-curve` on tab roots. */
  headerPattern?: 'default' | 'dark-curve'
  /** How far the dark curve reaches below the header, in points. */
  curveDepth?: number
}

/**
 * Set by a `dark-curve` screen. ScrollArea reads it and draws the navy curve
 * inside its scrolling content, so the curve scrolls away with the cards
 * instead of staying pinned behind them mid-page. PageTitle reads it too, to
 * draw its heading in white on the navy.
 */
export const DarkCurveContext = createContext<number | null>(null)

/**
 * True inside a `header="none"` Screen, which already paints the status-bar strip.
 * Lets any bar rendered inside it skip its own top inset, so it isn't added twice.
 */
export const StatusStripContext = createContext(false)

export default function Screen({
  children,
  bg = colors.bg,
  header = 'none',
  headerRight,
  headerGreeting,
  onBack,
  headerPattern,
  curveDepth = 200,
}: ScreenProps) {
  const pattern = headerPattern ?? (header === 'tabRoot' ? 'dark-curve' : 'default')
  const curve = pattern === 'dark-curve' ? curveDepth : null

  if (header === 'none') {
    return (
      <DarkCurveContext.Provider value={curve}>
        <DefaultScreen bg={bg}>{children}</DefaultScreen>
      </DarkCurveContext.Provider>
    )
  }

  return (
    <DarkCurveContext.Provider value={curve}>
      <View style={[styles.fill, { backgroundColor: bg }]}>
        <AppHeader variant={header} right={headerRight} onBack={onBack} greeting={headerGreeting} />
        <OfflineBanner />
        {children}
      </View>
    </DarkCurveContext.Provider>
  )
}

/** Navy status-bar strip (the app uses light status-bar icons), then the screen. */
function DefaultScreen({ bg, children }: { bg: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <StatusStripContext.Provider value>
      <View style={[styles.safe, { backgroundColor: bg }]}>
        <View style={{ height: insets.top, backgroundColor: colors.navy }} />
        <OfflineBanner />
        <View style={[styles.fill, { backgroundColor: bg }]}>{children}</View>
      </View>
    </StatusStripContext.Provider>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
})
