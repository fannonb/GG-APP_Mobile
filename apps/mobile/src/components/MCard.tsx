import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radii, shadows } from '@/theme'

interface MCardProps {
  children: React.ReactNode
  padding?: number
  style?: ViewStyle
}

export default function MCard({ children, padding = 16, style }: MCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
})
