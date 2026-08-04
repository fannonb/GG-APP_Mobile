import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'

interface TimelineStepProps {
  label: string
  sublabel: string
  completed?: boolean
  active?: boolean
  isLast?: boolean
}

export default function TimelineStep({
  label,
  sublabel,
  completed,
  active,
  isLast,
}: TimelineStepProps) {
  const dotColor = completed ? colors.blue : active ? colors.warning : colors.border
  const lineColor = completed ? colors.blue : colors.border
  const isBold = completed || active

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={[styles.line, { backgroundColor: lineColor }]} />}
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, isBold && styles.labelBold]}>{label}</Text>
        <Text style={styles.sublabel}>{sublabel}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  track: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    width: 2,
    height: 32,
  },
  content: {
    flex: 1,
    paddingTop: -1,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.text,
  },
  labelBold: {
    fontFamily: fontWeights.bold,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
})
