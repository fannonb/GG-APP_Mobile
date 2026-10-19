import React from 'react'
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native'
import { fontWeights } from '@/theme'

export const BRAND_TAGLINE = 'Making Access to Quality Care Possible, for all in Africa'

/** The GG'APP promise line, shown on the intro and sign-in screens. Sits on navy. */
export default function BrandTagline({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.text, style]}>{BRAND_TAGLINE}</Text>
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
  },
})
