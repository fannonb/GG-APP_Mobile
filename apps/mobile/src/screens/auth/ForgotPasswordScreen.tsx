import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { Screen, ScrollArea, AppBar, Field, MBtn } from '@/components'
import { LockIcon } from '@/icons'
import { authService } from '@gg/shared-api'
import type { AuthScreenProps } from '@/navigation/types'

export function ForgotPasswordScreen() {
  const navigation = useNavigation<AuthScreenProps<'ForgotPassword'>['navigation']>()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim())
      setSuccess(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset link. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.bg}>
      <AppBar
        title="Forgot Password"
        subtitle="Reset your account password"
        dark
        back={() => navigation.navigate('Login')}
      />

      <ScrollArea gap={16} py={28} px={20}>
        {/* Lock icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <LockIcon size={30} color={colors.blue} />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Forgot your password?</Text>

        {/* Description */}
        <Text style={styles.description}>
          Enter your email address and we'll send you a link to reset your
          password.
        </Text>

        {/* Email field */}
        <Field
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          required
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Error message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Success message */}
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Reset link sent! Check your email.
            </Text>
          </View>
        ) : null}

        {/* Submit button */}
        <MBtn variant="primary" fullWidth onPress={handleSubmit} disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </MBtn>

        {/* Back to sign in */}
        <Pressable
          style={styles.linkRow}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Back to Sign In</Text>
        </Pressable>
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
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: colors.successBg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  successText: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.success,
    textAlign: 'center',
  },
  linkRow: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
})
