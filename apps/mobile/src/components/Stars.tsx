import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights } from '@/theme'

interface StarsProps {
  rating?: number
  count?: number
}

const STAR_PATH = 'M6 1l1.4 3 3.6.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.6 4z'
// Brand blue, not amber. `blue` itself is only 2.3:1 on white and stars are a
// graphical element needing 3:1, so the ink variant is the one that qualifies.
const FILLED_COLOR = colors.blueInk
const EMPTY_COLOR = colors.borderStrong

function Star({ filled }: { filled: boolean }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 12 12">
      <Path d={STAR_PATH} fill={filled ? FILLED_COLOR : EMPTY_COLOR} />
    </Svg>
  )
}

export default function Stars({ rating = 4.5, count }: StarsProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} filled={star <= rating} />
      ))}
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      {count != null && <Text style={styles.count}>({count})</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontFamily: fontWeights.medium,
    fontSize: 11,
    color: colors.textSub,
    marginLeft: 3,
  },
  count: {
    fontFamily: fontWeights.regular,
    fontSize: 11,
    color: colors.textSub,
  },
})
