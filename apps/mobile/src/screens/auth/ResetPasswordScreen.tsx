import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { Screen, ScrollArea, AppBar, Field, MBtn } from '@/components'
import { LockIcon } from '@/icons'
import { authService } from '@gg/shared-api'
import type { AuthStackParamList, AuthScreenProps } from '@/navigation/types'

/* ------------------------------------------------------------------ */
/*  Password strength (same logic as RegisterScreen)                   */
/* ------------------------------------------------------------------ */
function getPasswordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const STRENGTH_COLORS = [colors.error, colors.warning, colors.blue, colors.success]
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong']

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export function ResetPasswordScreen() {
  const navigation = useNavigation<AuthScreenProps<'ResetPassword'>['navigation']>()
  const route = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>()
  const token = route.params?.token ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pwStrength = getPasswordStrength(password)

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Invalid or missing reset token.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      // Navigate to Login with implicit success
      navigation.navigate('Login')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Password reset failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.bg}>
      <AppBar
        title="Reset Password"
        subtitle="Create a new password"
        dark
      />

      <ScrollArea gap={16} py={28} px={20}>
        {/* Lock icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <LockIcon size={30} color={colors.blue} />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Create New Password</Text>

        {/* Description */}
        <Text style={styles.description}>
          Enter a strong password for your account.
        </Text>

        {/* Password fields */}
        <Field
          label="New Password"
          placeholder={'••••••••'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          required
        />

        <Field
          label="Confirm Password"
          placeholder={'••••••••'}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          required
        />

        {/* Password strength indicator (4 bars) */}
        {password.length > 0 && (
          <View style={styles.strengthSection}>
            <View style={styles.strengthBars}>
              {[0, 1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        i < pwStrength
                          ? STRENGTH_COLORS[pwStrength - 1]
                          : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            {pwStrength > 0 && (
              <Text
                style={[
                  styles.strengthLabel,
                  { color: STRENGTH_COLORS[pwStrength - 1] },
                ]}
              >
                {STRENGTH_LABELS[pwStrength - 1]}
              </Text>
            )}
          </View>
        )}

        {/* Error message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Submit button */}
        <MBtn variant="primary" fullWidth onPress={handleReset} disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </MBtn>
      </ScrollArea>
    </Screen>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  strengthSection: {
    gap: 6,
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
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },
})
