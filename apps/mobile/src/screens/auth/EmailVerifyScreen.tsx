import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Linking } from 'react-native'
import Pressable from '@/components/Pressable'
import { useNavigation, useRoute } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { Field } from '@/components'
import { AuthShell, AuthButton, AuthLink, AuthNotice } from '@/components/AuthShell'
import { useVerifyEmailMutation } from '@gg/shared-hooks'
import { authService } from '@gg/shared-api'
import { isValidEmail, normalizeEmail } from '@/lib/validation'
import type { AuthScreenProps } from '@/navigation/types'

const RESEND_COOLDOWN_SECONDS = 60

export function EmailVerifyScreen() {
  const navigation = useNavigation<AuthScreenProps<'EmailVerify'>['navigation']>()
  const route = useRoute<AuthScreenProps<'EmailVerify'>['route']>()
  const token = route.params?.token?.trim()
  const verifyMutation = useVerifyEmailMutation()

  const [email, setEmail] = useState(route.params?.email ?? '')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  const knownEmail = Boolean(route.params?.email)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    setVerifyError(null)
    verifyMutation
      .mutateAsync(token)
      .then(() => {
        if (!cancelled) setVerified(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setVerifyError(
            err instanceof Error ? err.message : 'Verification failed. The link may have expired.',
          )
        }
      })

    return () => {
      cancelled = true
    }
    // Run once when a verification token is present.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const goToLogin = () => navigation.replace('Login')

  const handleResend = async () => {
    setResendError(null)
    setResendMessage(null)
    if (!isValidEmail(email)) {
      setEmailError('Enter the email address you registered with.')
      return
    }
    setEmailError(null)
    setResending(true)
    try {
      const result = await authService.resendVerification(normalizeEmail(email))
      setResendMessage(result.message)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : 'We could not send the email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const resendDisabled = resending || cooldown > 0
  const resendLabel = resending
    ? 'Sending…'
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : 'Resend verification email'

  const resendBlock = (
    <View style={styles.resendBlock}>
      {!knownEmail && (
        <Field
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={v => { setEmail(v); setEmailError(null) }}
          error={emailError ?? undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          variant="dark"
        />
      )}
      {resendMessage ? <AuthNotice tone="success">{resendMessage}</AuthNotice> : null}
      {resendError ? <AuthNotice tone="error">{resendError}</AuthNotice> : null}
      <Pressable
        onPress={handleResend}
        disabled={resendDisabled}
        hitSlop={8}
        style={styles.resendRow}
        accessibilityRole="button"
        accessibilityState={{ disabled: resendDisabled }}
      >
        <Text style={styles.resendText}>
          Didn't receive it?{' '}
          <Text style={[styles.resendLink, resendDisabled && styles.resendLinkDisabled]}>{resendLabel}</Text>
        </Text>
      </Pressable>
    </View>
  )

  if (token) {
    return (
      <AuthShell
        title={verified ? 'Email' : verifyMutation.isPending ? 'Verifying your' : 'Link not'}
        highlight={verified ? 'verified.' : verifyMutation.isPending ? 'email…' : 'valid.'}
        subtitle={
          verified
            ? 'Your account is active. Sign in to continue.'
            : verifyMutation.isPending
              ? 'This only takes a moment.'
              : 'This verification link has expired or was already used. Request a new one below, or sign in if you have already verified.'
        }
        onBack={goToLogin}
      >
        {verifyError && !verified ? <AuthNotice tone="error">{verifyError}</AuthNotice> : null}
        <AuthButton onPress={goToLogin}>{verified ? 'Continue to sign in' : 'Back to sign in'}</AuthButton>
        {!verified && !verifyMutation.isPending ? resendBlock : null}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Check your"
      highlight="email."
      subtitle={
        knownEmail
          ? `We sent a verification link to ${email}. Open it on this phone to activate your account.`
          : 'We sent a verification link to your email. Open it on this phone to activate your account.'
      }
      onBack={goToLogin}
    >
      <AuthButton onPress={() => Linking.openURL('mailto:')}>Open email app</AuthButton>
      {resendBlock}
      <AuthLink onPress={goToLogin}>Back to sign in</AuthLink>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  resendBlock: {
    marginTop: 20,
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  resendLink: {
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  resendLinkDisabled: {
    color: 'rgba(255,255,255,0.45)',
  },
})
