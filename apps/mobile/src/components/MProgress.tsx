import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '@/theme'

interface MProgressProps {
  value: number
  max: number
  color?: string
  height?: number
  bgColor?: string
}

export default function MProgress({
  value,
  max,
  color = colors.blue,
  height = 6,
  bgColor = 'rgba(0,0,0,0.1)',
}: MProgressProps) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0

  return (
    <View style={[styles.track, { height, borderRadius: height, backgroundColor: bgColor }]}>
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
})
