import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { animateNextLayout } from '@/lib/motion'
import { colors, fontWeights } from '@/theme'
import { hapticSelection } from '@/lib/haptics'

interface TabItem {
  label: string
  count?: number
}

interface SegmentedTabsProps {
  tabs: TabItem[]
  activeIndex: number
  onSelect: (index: number) => void
}

export default function SegmentedTabs({ tabs, activeIndex, onSelect }: SegmentedTabsProps) {
  const handleSelect = (index: number) => {
    if (index !== activeIndex) {
      hapticSelection()
    }
    animateNextLayout()
    onSelect(index)
  }

  return (
    <View style={styles.container}>
      {tabs.map((tab, i) => {
        const active = i === activeIndex
        return (
          <Pressable
            key={i}
            onPress={() => handleSelect(i)}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.tabActive : styles.tabInactive,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.tabText, active ? styles.textActive : styles.textInactive]}>
              {tab.label}
            </Text>
            {tab.count != null && (
              <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
                <Text
                  style={[
                    styles.badgeText,
                    active ? styles.badgeTextActive : styles.badgeTextInactive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  tabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  tabActive: {
    backgroundColor: colors.navy,
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
  },
  textActive: {
    color: '#FFFFFF',
    fontFamily: fontWeights.bold,
  },
  textInactive: {
    color: colors.textSub,
    fontFamily: fontWeights.medium,
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
