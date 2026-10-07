import React from 'react'
import { Text, TextStyle, StyleSheet } from 'react-native'
import { colors, fontWeights } from '@/theme'
import { displayCurrencySymbol } from '@gg/shared-utils'

interface MoneyTextProps {
  amount: number | string
  currency?: string
  style?: TextStyle | TextStyle[]
  symbolStyle?: TextStyle | TextStyle[]
  size?: 'sm' | 'md' | 'lg' | 'hero'
  color?: string
}

export default function MoneyText({
  amount,
  currency = 'Ksh.',
  style,
  symbolStyle,
  size = 'md',
  color = colors.navy,
}: MoneyTextProps) {
  const numericVal = typeof amount === 'number' ? amount : parseFloat(amount) || 0
  const symbol = displayCurrencySymbol(currency)
  const formattedVal = numericVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const sizeStyles = {
    sm: { fontSize: 13, symbolSize: 11 },
    md: { fontSize: 16, symbolSize: 13 },
    lg: { fontSize: 20, symbolSize: 15 },
    hero: { fontSize: 28, symbolSize: 18 },
  }[size]

  return (
    <Text style={[styles.container, { color }, { fontSize: sizeStyles.fontSize }, style]}>
      <Text style={[styles.currencySymbol, { fontSize: sizeStyles.symbolSize }, symbolStyle]}>
        {symbol}{' '}
      </Text>
      {formattedVal}
    </Text>
  )
}

const styles = StyleSheet.create({
  container: {
    fontFamily: fontWeights.bold,
    letterSpacing: -0.2,
  },
  currencySymbol: {
    fontFamily: fontWeights.medium,
    opacity: 0.85,
  },
})
