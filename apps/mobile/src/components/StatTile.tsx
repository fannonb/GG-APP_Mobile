import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, fontWeights, radii } from '@/theme'

interface StatTileProps {
  label: string
  value: string | React.ReactNode
  subtitle?: string
  icon?: React.ReactNode
  style?: ViewStyle
  dark?: boolean
}

export default function StatTile({
  label,
  value,
  subtitle,
  icon,
  style,
  dark = false,
}: StatTileProps) {
  const bgColor = dark ? colors.navy600 : colors.card
  const labelColor = dark ? 'rgba(255, 255, 255, 0.7)' : colors.textLight
  const valueColor = dark ? '#FFFFFF' : colors.navy
  const subColor = dark ? 'rgba(255, 255, 255, 0.6)' : colors.textSub

  return (
    <View style={[styles.tile, { backgroundColor: bgColor }, style]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      </View>
      <View style={styles.valueRow}>
        {typeof value === 'string' ? (
          <Text style={[styles.valueText, { color: valueColor }]}>{value}</Text>
        ) : (
          value
        )}
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
  },
  iconContainer: {
    marginLeft: 6,
  },
  valueRow: {
    marginTop: 2,
  },
  valueText: {
    fontFamily: fontWeights.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    marginTop: 4,
  },
})
