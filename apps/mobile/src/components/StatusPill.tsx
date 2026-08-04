import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, fontWeights, radii } from '@/theme'

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'purple' | 'teal' | 'navy'

interface StatusPillProps {
  label: string
  tone?: StatusTone
  size?: 'sm' | 'md'
  style?: ViewStyle
  icon?: React.ReactNode
}

export default function StatusPill({
  label,
  tone = 'info',
  size = 'md',
  style,
  icon,
}: StatusPillProps) {
  const toneMap = {
    success: { bg: colors.successBg, text: colors.success },
    warning: { bg: colors.warningBg, text: colors.warning },
    error: { bg: colors.errorBg, text: colors.error },
    info: { bg: colors.infoBg, text: colors.info },
    purple: { bg: colors.purpleBg, text: colors.purple },
    teal: { bg: colors.tealBg, text: colors.teal },
    navy: { bg: colors.navy600, text: '#FFFFFF' },
  }[tone]

  const isSm = size === 'sm'

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: toneMap.bg },
        isSm ? styles.pillSm : styles.pillMd,
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[
          styles.label,
          { color: toneMap.text },
          isSm ? styles.labelSm : styles.labelMd,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.full,
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontFamily: fontWeights.semiBold,
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 12,
  },
})
