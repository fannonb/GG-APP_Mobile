import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { Field } from '@/components'
import { AuthShell, AuthButton, AuthLink, AuthNotice } from '@/components/AuthShell'
import { authService } from '@gg/shared-api'
import type { AuthStackParamList, AuthScreenProps } from '@/navigation/types'

/* Password strength (same logic as RegisterScreen) */
function getPasswordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

// Same on-navy palette as RegisterScreen's strength meter.
const STRENGTH_COLORS = [colors.errorOnDark, '#F5B54A', colors.blue, '#4ADE9B']
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong']

export function ResetPasswordScreen() {
  const navigation = useNavigation<AuthScreenProps<'ResetPassword'>['navigation']>()
  const route = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>()
  const token = route.params?.token ?? ''
  const confirmRef = useRef<TextInput>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const pwStrength = getPasswordStrength(password)

  const handleReset = async () => {
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('This reset link is incomplete. Request a new one from the sign-in screen.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Password" highlight="updated." subtitle="You can now sign in with your new password.">
        <AuthButton onPress={() => navigation.replace('Login')}>Continue to sign in</AuthButton>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new"
      highlight="password."
      subtitle="Use at least 8 characters. Mixing in capitals, numbers and symbols makes it stronger."
      onBack={() => navigation.navigate('Login')}
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      <Field
        label="New Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        variant="dark"
      />

      {password.length > 0 && (
        <View style={styles.strengthSection}>
          <View style={styles.strengthBars}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  { backgroundColor: i < pwStrength ? STRENGTH_COLORS[pwStrength - 1] : 'rgba(255,255,255,0.1)' },
                ]}
              />
            ))}
          </View>
          {pwStrength > 0 && (
            <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[pwStrength - 1] }]}>
              {STRENGTH_LABELS[pwStrength - 1]}
            </Text>
          )}
        </View>
      )}

      <Field
        ref={confirmRef}
        label="Confirm Password"
        placeholder="••••••••"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleReset}
        variant="dark"
      />

      <AuthButton onPress={handleReset} disabled={loading} busy={loading}>
        {loading ? 'Saving…' : 'Save new password'}
      </AuthButton>
      <AuthLink onPress={() => navigation.navigate('Login')}>Back to sign in</AuthLink>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  strengthSection: {
    gap: 6,
    marginTop: -6,
    marginBottom: 14,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
  },
})
