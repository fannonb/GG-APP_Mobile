import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { Field } from '@/components'
import { AuthShell, AuthButton, AuthLink, AuthNotice } from '@/components/AuthShell'
import { authService } from '@gg/shared-api'
import { isValidEmail, normalizeEmail } from '@/lib/validation'
import type { AuthScreenProps } from '@/navigation/types'

export function ForgotPasswordScreen() {
  const navigation = useNavigation<AuthScreenProps<'ForgotPassword'>['navigation']>()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError('Enter the email address you signed up with.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await authService.forgotPassword(normalizeEmail(email))
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'We could not send the link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Forgot your"
      highlight="password?"
      subtitle={
        sent
          ? 'If an account uses that email, a reset link is on its way. Open it on this phone to choose a new password.'
          : "Enter your email and we'll send you a link to choose a new one."
      }
      onBack={() => navigation.navigate('Login')}
    >
      {sent ? (
        <AuthNotice tone="success">Check your inbox, including spam, for the reset link.</AuthNotice>
      ) : (
        <Field
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={v => { setEmail(v); setError(null) }}
          error={error ?? undefined}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          variant="dark"
        />
      )}

      {sent ? (
        <AuthButton onPress={() => navigation.navigate('Login')}>Back to sign in</AuthButton>
      ) : (
        <AuthButton onPress={handleSubmit} disabled={loading} busy={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </AuthButton>
      )}

      {sent ? (
        <AuthLink onPress={() => { setSent(false); setEmail('') }}>Use a different email</AuthLink>
      ) : (
        <AuthLink onPress={() => navigation.navigate('Login')}>Back to sign in</AuthLink>
      )}
    </AuthShell>
  )
}
