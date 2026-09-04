import React from 'react'
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'
import { hapticSelection } from '@/lib/haptics'

interface FilterItem {
  label: string
  count?: number
}

interface FilterChipsProps {
  items: FilterItem[]
  activeIndex: number
  onSelect: (index: number) => void
}

export default function FilterChips({ items, activeIndex, onSelect }: FilterChipsProps) {
  const handleSelect = (index: number) => {
    if (index !== activeIndex) {
      hapticSelection()
    }
    onSelect(index)
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {items.map((item, i) => {
        const active = i === activeIndex
        return (
          <Pressable
            key={i}
            onPress={() => handleSelect(i)}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : styles.chipInactive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, active ? styles.textActive : styles.textInactive]}>
              {item.label}
            </Text>
            {item.count != null && (
              <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
                <Text
                  style={[
                    styles.badgeText,
                    active ? styles.badgeTextActive : styles.badgeTextInactive,
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 6,
  },
  chipPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.88,
  },
  chipActive: {
    backgroundColor: colors.navy,
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    color: colors.textSub,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeInactive: {
    backgroundColor: colors.bg,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: colors.textSub,
  },
})
