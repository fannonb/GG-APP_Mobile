import React, { useContext } from 'react'
import { Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { colors, fontWeights } from '@/theme'
import { DarkCurveContext } from './Screen'

interface PageTitleProps {
  title: string
  subtitle?: string
  /** Optional content under the subtitle, such as a row of pills. */
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * The large heading that opens a screen's content, directly under the app bar.
 * White on the navy curve of a tab root, navy on the light surface of a detail
 * screen. It scrolls with the content, so the bar stays the only fixed chrome.
 */
export default function PageTitle({ title, subtitle, children, style }: PageTitleProps) {
  const onNavy = useContext(DarkCurveContext) != null
  return (
    <View style={[styles.wrap, style]}>
      <Text accessibilityRole="header" style={[styles.title, { color: onNavy ? '#FFFFFF' : colors.navy }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: onNavy ? 'rgba(255,255,255,0.72)' : colors.textSub }]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  title: {
    fontFamily: fontWeights.extraBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 15,
    lineHeight: 21,
  },
})
