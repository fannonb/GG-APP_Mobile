import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'
import ChevronRightIcon from '@/icons/ChevronRightIcon'

interface CategoryCardProps {
  icon: React.ReactNode
  label: string
  desc: string
  count: number
  isComingSoon?: boolean
  disabled?: boolean
  onPress?: () => void
}

export default function CategoryCard({
  icon,
  label,
  desc,
  count,
  isComingSoon,
  disabled,
  onPress,
}: CategoryCardProps) {
  const isEmpty = !isComingSoon && count === 0
  const inactive = Boolean(isComingSoon || disabled || isEmpty)

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.card,
        pressed && !inactive && styles.cardPressed,
        inactive && styles.cardDisabled,
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {desc}
      </Text>
      <View style={styles.bottom}>
        {isComingSoon ? (
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        ) : (
          <Text style={[styles.count, isEmpty && styles.countMuted]}>
            {isEmpty ? 'None nearby' : `${count} provider${count !== 1 ? 's' : ''}`}
          </Text>
        )}
        <ChevronRightIcon size={16} color={colors.textLight} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: '#F8FAFC',
    borderColor: colors.blue100,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
    marginBottom: 12,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.blue,
  },
  comingSoonPill: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  countMuted: {
    color: colors.textLight,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.warning,
  },
})
