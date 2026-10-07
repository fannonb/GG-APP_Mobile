import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights } from '@/theme'

interface ActionBarProps {
  children: React.ReactNode
  /** Shown directly above the buttons, so a failed submit is never off-screen. */
  error?: string | null
  /** The tab bar is visible below, so it already clears the home indicator. */
  aboveTabBar?: boolean
  /** Content above the buttons that gates them, e.g. a consent checkbox. */
  top?: React.ReactNode
}

/**
 * Pinned footer for a screen's main action ("Submit Request", "Authorize
 * Payment"), so it is always one tap away instead of at the end of a long
 * scroll. Render it as the last child of <Screen>, after <ScrollArea>.
 * Task screens hide the tab bar (see AppTabs), so this pads for the home
 * indicator itself.
 */
export default function ActionBar({ children, error, aboveTabBar, top }: ActionBarProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingBottom: aboveTabBar ? 12 : Math.max(insets.bottom, 12) + 4 }]}>
      {top ? <View style={styles.top}>{top}</View> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={styles.row}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  top: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  error: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
    marginBottom: 10,
  },
})
