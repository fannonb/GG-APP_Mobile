import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights } from '@/theme'
import { Screen, AppBar, MBtn } from '@/components'
import { useVerifyEmailMutation } from '@gg/shared-hooks'
import { getIsMockApi } from '@gg/shared-api'
import type { AuthScreenProps } from '@/navigation/types'

function MailIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke={colors.blue}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke={colors.blue}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function EmailVerifyScreen() {
  const navigation = useNavigation<AuthScreenProps<'EmailVerify'>['navigation']>()
  const route = useRoute<AuthScreenProps<'EmailVerify'>['route']>()
  const token = route.params?.token?.trim()
  const verifyMutation = useVerifyEmailMutation()

  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

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

  const handleOpenEmail = () => {
    Linking.openURL('mailto:')
  }

  const handleContinue = () => {
    // Mirrors the PWA: the onboarding wizard follows email verification in
    // demo/mock mode, while the real backend routes to sign-in.
    if (getIsMockApi()) {
      navigation.replace('Onboarding')
      return
    }
    navigation.navigate('Login')
  }
  const handleResend = async () => {
    setResending(true)
    // Backend resend endpoint is not exposed yet — keep UX feedback only.
    await new Promise(resolve => setTimeout(resolve, 1000))
    setResending(false)
    setResent(true)
  }

  return (
    <Screen bg={colors.bg}>
      <AppBar
        title="Verify Email"
        back={() => navigation.navigate('Login')}
      />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MailIcon />
        </View>

        {token ? (
          <>
            <Text style={styles.title}>
              {verified ? 'Email Verified' : verifyMutation.isPending ? 'Verifying…' : 'Verify Email'}
            </Text>
            <Text style={styles.description}>
              {verified
                ? 'Your email has been verified. You can sign in to continue.'
                : verifyMutation.isPending
                  ? 'Please wait while we verify your email address.'
                  : 'We could not complete verification automatically. Try again from the link in your email, or sign in if you already verified.'}
            </Text>
            {verifyError ? <Text style={styles.errorText}>{verifyError}</Text> : null}
            <MBtn
              variant="primary"
              onPress={handleContinue}
              style={styles.openBtn}
            >
              {verified ? 'Continue to Sign In →' : 'Back to Sign In'}
            </MBtn>
          </>
        ) : (
          <>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.description}>
              We've sent a verification link to your email. Click the link to verify your account.
            </Text>

            <MBtn variant="primary" onPress={handleOpenEmail} style={styles.openBtn}>
              Open Email App
            </MBtn>

            <Pressable onPress={handleResend} disabled={resending}>
              <Text style={styles.resendText}>
                Didn't receive it?{' '}
                <Text style={styles.resendLink}>
                  {resending ? 'Sending...' : resent ? 'Sent!' : 'Resend'}
                </Text>
              </Text>
            </Pressable>

            <MBtn
              variant="secondary"
              onPress={handleContinue}
              style={styles.backBtn}
            >
              Back to Sign In
            </MBtn>
          </>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  openBtn: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  resendText: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginBottom: 16,
  },
  resendLink: {
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  backBtn: {
    paddingHorizontal: 32,
  },
})
