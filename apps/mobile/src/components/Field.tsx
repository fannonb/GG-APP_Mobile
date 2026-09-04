import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { colors, fontWeights } from '@/theme'

interface FieldProps {
  label: string
  value?: string
  placeholder?: string
  onChangeText?: (text: string) => void
  onBlur?: () => void
  secureTextEntry?: boolean
  required?: boolean
  error?: string
  hint?: string
  right?: React.ReactNode
  editable?: boolean
  keyboardType?: TextInputProps['keyboardType']
  autoCapitalize?: TextInputProps['autoCapitalize']
  variant?: 'light' | 'dark'
}

export default function Field({
  label,
  value,
  placeholder,
  onChangeText,
  onBlur,
  secureTextEntry,
  required,
  error,
  hint,
  right,
  editable = true,
  keyboardType,
  autoCapitalize,
  variant = 'light',
}: FieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const isDark = variant === 'dark'

  const getBorderColor = () => {
    if (error) return colors.error
    if (isFocused) return isDark ? colors.blue : colors.navy
    return isDark ? 'rgba(255,255,255,0.1)' : colors.border
  }

  return (
    <View style={styles.wrapper}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
        {required && !isDark && <Text style={styles.asterisk}> *</Text>}
      </View>

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          isDark && styles.inputContainerDark,
          { borderColor: getBorderColor() },
        ]}
      >
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : colors.textLight}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            onBlur?.()
          }}
          secureTextEntry={secureTextEntry}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {/* Error text */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Hint text */}
      {hint && !error ? (
        <Text style={[styles.hint, isDark && styles.hintDark]}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.navy,
  },
  labelDark: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fontWeights.medium,
  },
  asterisk: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  inputContainerDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  inputDark: {
    color: '#FFFFFF',
  },
  right: {
    marginLeft: 10,
  },
  error: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  hint: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  hintDark: {
    color: 'rgba(255,255,255,0.5)',
  },
})

