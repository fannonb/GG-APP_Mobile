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
  onPress?: () => void
}

export default function CategoryCard({
  icon,
  label,
  desc,
  count,
  isComingSoon,
  onPress,
}: CategoryCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
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
          <Text style={styles.count}>
            {count} provider{count !== 1 ? 's' : ''}
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
  comingSoonText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.warning,
  },
})
