import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'

interface ScreenProps {
  children: React.ReactNode
  bg?: string
  headerPattern?: 'default' | 'dark-curve'
}

export default function Screen({ children, bg = colors.bg, headerPattern = 'default' }: ScreenProps) {
  const insets = useSafeAreaInsets()

  if (headerPattern === 'dark-curve') {
    return (
      <View style={[styles.fill, { backgroundColor: bg }]}>
        <View style={[styles.darkCurveHeader, { height: insets.top + 280 }]} />
        {children}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={[styles.fill, { backgroundColor: bg }]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  darkCurveHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
})
