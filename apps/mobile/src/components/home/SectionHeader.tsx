import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights } from '@/theme'

/** Title row for a home section, with an optional "See all"-style link. */
export default function SectionHeader({
  title,
  count,
  action,
  onAction,
  onDark,
}: {
  title: string
  count?: number
  action?: string
  onAction?: () => void
  /** For headings drawn over the navy header curve. */
  onDark?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.title, onDark && styles.titleOnDark]} accessibilityRole="header">
        {title}
        {count != null && count > 0 ? <Text style={styles.count}>{`  ${count}`}</Text> : null}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
          <Text style={[styles.action, onDark && styles.actionOnDark]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  title: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.text,
  },
  titleOnDark: {
    color: '#FFFFFF',
  },
  count: {
    fontFamily: fontWeights.semiBold,
    fontSize: 15,
    color: colors.textLight,
  },
  action: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.blueInk,
  },
  actionOnDark: {
    color: colors.blue,
  },
})
