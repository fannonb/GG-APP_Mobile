import React, { createContext } from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'

interface ScreenProps {
  children: React.ReactNode
  bg?: string
  headerPattern?: 'default' | 'dark-curve'
  /** How far the dark curve reaches below the header, in points. */
  curveDepth?: number
}

/**
 * Set by `<Screen headerPattern="dark-curve">`. ScrollArea reads it and draws the
 * navy curve inside its scrolling content, so the curve scrolls away with the
 * cards instead of staying pinned behind them mid-page. The screen's header
 * (AppBar or custom) paints its own navy background above it.
 */
export const DarkCurveContext = createContext<number | null>(null)

/**
 * True inside a default `<Screen>`, which already paints the status-bar strip.
 * AppBar reads it so the top inset isn't added twice (that left a light band
 * behind the white status-bar icons and an over-tall header on phones).
 */
export const StatusStripContext = createContext(false)

export default function Screen({
  children,
  bg = colors.bg,
  headerPattern = 'default',
  curveDepth = 200,
}: ScreenProps) {
  if (headerPattern === 'dark-curve') {
    return (
      <DarkCurveContext.Provider value={curveDepth}>
        <View style={[styles.fill, { backgroundColor: bg }]}>{children}</View>
      </DarkCurveContext.Provider>
    )
  }

  return <DefaultScreen bg={bg}>{children}</DefaultScreen>
}

/** Navy status-bar strip (the app uses light status-bar icons), then the screen. */
function DefaultScreen({ bg, children }: { bg: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <StatusStripContext.Provider value>
      <View style={[styles.safe, { backgroundColor: bg }]}>
        <View style={{ height: insets.top, backgroundColor: colors.navy }} />
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
