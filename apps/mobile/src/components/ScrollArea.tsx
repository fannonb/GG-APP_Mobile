import React, { useContext } from 'react'
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native'
import { colors } from '@/theme'
import { DarkCurveContext } from './Screen'

/** Extra navy above the content so iOS overscroll bounce never shows a gap. */
const OVERSCROLL_COVER = 800

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
  const curveDepth = useContext(DarkCurveContext)

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
            tintColor={curveDepth != null ? '#FFFFFF' : colors.blue}
            colors={[colors.blue]}
          />
        ) : undefined
      }
    >
      {curveDepth != null ? (
        <View pointerEvents="none" style={[styles.curve, { height: OVERSCROLL_COVER + curveDepth }]} />
      ) : null}
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  // Absolute, so it takes no part in the content's gap or layout.
  curve: {
    position: 'absolute',
    top: -OVERSCROLL_COVER,
    left: 0,
    right: 0,
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
})
