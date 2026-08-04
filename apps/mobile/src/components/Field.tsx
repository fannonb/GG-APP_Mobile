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
}: FieldProps) {
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.navy
    : colors.border

  return (
    <View style={styles.wrapper}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.asterisk}> *</Text>}
      </View>

      {/* Input container */}
      <View style={[styles.inputContainer, { borderColor }]}>
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
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
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
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
  input: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: colors.text,
    padding: 0,
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
})

