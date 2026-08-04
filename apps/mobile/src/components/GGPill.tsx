import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'

type PillType =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'open'
  | 'closed'
  | 'purple'
  | 'pending'
  | 'authorized'
  | 'teal'

interface GGPillProps {
  type?: PillType
  children: React.ReactNode
}

const pillColorMap: Record<PillType, { text: string; bg: string }> = {
  success:    { text: colors.success,  bg: colors.successBg },
  warning:    { text: colors.warning,  bg: colors.warningBg },
  error:      { text: colors.error,    bg: colors.errorBg },
  info:       { text: colors.info,     bg: colors.infoBg },
  open:       { text: colors.success,  bg: colors.successBg },
  closed:     { text: colors.error,    bg: colors.errorBg },
  purple:     { text: colors.purple,   bg: colors.purpleBg },
  pending:    { text: colors.warning,  bg: colors.warningBg },
  authorized: { text: colors.info,     bg: colors.infoBg },
  teal:       { text: colors.teal,     bg: colors.tealBg },
  default:    { text: colors.textSub,  bg: colors.surfaceMuted },
}

export default function GGPill({ type = 'default', children }: GGPillProps) {
  const scheme = pillColorMap[type] ?? pillColorMap.default

  return (
    <View style={[styles.pill, { backgroundColor: scheme.bg }]}>
      <Text style={[styles.text, { color: scheme.text }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fontWeights.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
})
