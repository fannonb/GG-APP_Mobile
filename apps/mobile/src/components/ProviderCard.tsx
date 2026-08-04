import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'
import Stars from './Stars'
import GGPill from './GGPill'

interface ProviderCardProps {
  name: string
  category: string
  distance: string
  rating: number
  reviews: number
  status: 'open' | 'closed'
  logoUrl?: string
  onPress?: () => void
}

export default function ProviderCard({
  name,
  category,
  distance,
  rating,
  reviews,
  status,
  onPress,
}: ProviderCardProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {category} &middot; {distance}
        </Text>
      </View>

      <View style={styles.right}>
        <Stars rating={rating} count={reviews} />
        <GGPill type={status === 'open' ? 'open' : 'closed'}>
          {status === 'open' ? 'Open' : 'Closed'}
        </GGPill>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
})
