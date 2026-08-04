import React from 'react'
import { ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { colors } from '@/theme'

interface ScrollAreaProps {
  children: React.ReactNode
  gap?: number
  px?: number
  py?: number
  refreshing?: boolean
  onRefresh?: () => void
}

export default function ScrollArea({
  children,
  gap = 12,
  px = 16,
  py = 16,
  refreshing,
  onRefresh,
}: ScrollAreaProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{
        paddingHorizontal: px,
        paddingVertical: py,
        gap,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
})
