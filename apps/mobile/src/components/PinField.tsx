import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { colors, fontWeights, radii } from '@/theme'

interface PinFieldProps {
  label: string
  value: string
  onChange: (digits: string) => void
  /** Number of boxes, and the maximum digits accepted. */
  length?: number
  hint?: string
  error?: string
  autoFocus?: boolean
}

/**
 * The app's one way to type a PIN outside the payment keypad: a row of boxes
 * that fill with dots, over a hidden number-pad input. Replaces plain text
 * boxes ("----") and the warning-coloured "Not Set" pills on empty fields.
 */
export default function PinField({ label, value, onChange, length = 4, hint, error, autoFocus }: PinFieldProps) {
  const [focused, setFocused] = useState(false)
  const activeIndex = Math.min(value.length, length - 1)

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length
          const isActive = focused && i === activeIndex && value.length < length
          return (
            <View
              key={i}
              style={[
                styles.box,
                filled && styles.boxFilled,
                isActive && styles.boxActive,
                error ? styles.boxError : null,
              ]}
            >
              {filled ? <View style={styles.dot} /> : null}
            </View>
          )
        })}
        {/* Transparent input over the boxes: taps open the number pad; paste and autofill work. */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={length}
          secureTextEntry
          autoFocus={autoFocus}
          caretHidden
          textContentType="oneTimeCode"
          autoComplete="off"
          accessibilityLabel={`${label}, ${value.length} of ${length} digits entered`}
          accessibilityHint={error ?? hint}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.navy,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  box: {
    flex: 1,
    maxWidth: 56,
    height: 54,
    borderRadius: radii.default,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.borderStrong,
  },
  boxActive: {
    borderColor: colors.navy,
  },
  boxError: {
    borderColor: colors.error,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.navy,
  },
  input: {
    ...StyleSheet.absoluteFill,
    opacity: 0.02,
    color: 'transparent',
  },
  hint: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 6,
  },
  error: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
})
