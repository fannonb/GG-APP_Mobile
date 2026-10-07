import React, { forwardRef, useState } from 'react'
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
  /** Autofill hints so password managers and the OS keyboard can fill the field. */
  autoComplete?: TextInputProps['autoComplete']
  textContentType?: TextInputProps['textContentType']
  autoCorrect?: boolean
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: () => void
  /** Keep the keyboard open when "next" moves focus to another field. */
  submitBehavior?: TextInputProps['submitBehavior']
  maxLength?: number
  variant?: 'light' | 'dark'
}

const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
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
    autoComplete,
    textContentType,
    autoCorrect,
    returnKeyType,
    onSubmitEditing,
    submitBehavior,
    maxLength,
    variant = 'light',
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false)
  const isDark = variant === 'dark'

  const getBorderColor = () => {
    if (error) return isDark ? colors.errorOnDark : colors.error
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
          !editable && (isDark ? styles.inputLockedDark : styles.inputLocked),
          { borderColor: getBorderColor() },
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, isDark && styles.inputDark, !editable && styles.inputTextLocked]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : colors.textLight}
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
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={submitBehavior}
          maxLength={maxLength}
          accessibilityLabel={required ? `${label}, required` : label}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled: !editable }}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {/* Error text */}
      {error ? (
        <Text style={[styles.error, isDark && styles.errorDark]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {/* Hint text */}
      {hint && !error ? (
        <Text style={[styles.hint, isDark && styles.hintDark]}>{hint}</Text>
      ) : null}
    </View>
  )
})

export default Field

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
  inputLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  inputLockedDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
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
  inputTextLocked: {
    opacity: 0.7,
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
  errorDark: {
    color: colors.errorOnDark,
  },
  hint: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  hintDark: {
    color: 'rgba(255,255,255,0.6)',
  },
})
