import React, { useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, Field, MBtn } from '@/components'
import { authService, getApiBaseUrl, getIsMockApi } from '@gg/shared-api'
import { startGoogleSignIn } from '@/lib/google-auth'
import { useAuthStore } from '@gg/shared-stores'
import type { AuthScreenProps } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
        fill="#4285F4"
      />
      <Path
        d="M3.2 14.7l7.1 5.2C12 15.6 17.5 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 14.9 2 7.2 7.2 3.2 14.7z"
        fill="#EA4335"
      />
      <Path
        d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.5 37.1 26.9 38 24 38c-6 0-11.1-4-12.8-9.5l-7.1 5.5C7.8 41 15.2 46 24 46z"
        fill="#34A853"
      />
      <Path
        d="M44.5 20H24v8.5h11.8c-1 3.2-3.1 5.8-5.8 7.5l6.5 5.5C40.5 38 46 32 46 24c0-1.3-.2-2.7-.5-4h-1z"
        fill="#FBBC05"
      />
    </Svg>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke={colors.textLight}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={12} r={3} stroke={colors.textLight} strokeWidth={1.8} />
      </Svg>
    )
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
        stroke={colors.textLight}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function LoginScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<AuthScreenProps<'Login'>['navigation']>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      if (getIsMockApi()) {
        const result = await authService.loginWithGoogle({
          code: 'mock-code',
          redirectUri: 'ggapp://auth/google',
        })
        if (result.needsRegistration) {
          navigation.navigate('Register', {
            googleProfile: {
              firstName: result.firstName,
              lastName: result.lastName,
              email: result.email,
              googleIdToken: result.googleIdToken,
            },
          })
          return
        }
        useAuthStore.getState().setUserMode('existing')
        useAuthStore.getState().setSession(result.role)
        return
      }

      const auth = await startGoogleSignIn()
      if (!auth) {
        setError('Google sign-in was cancelled.')
        return
      }

      const result = await authService.loginWithGoogle(auth)
      if (result.needsRegistration) {
        navigation.navigate('Register', {
          googleProfile: {
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            googleIdToken: result.googleIdToken,
          },
        })
        return
      }

      useAuthStore.getState().setUserMode('existing')
      useAuthStore.getState().setSession(result.role)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.'
      setError(message)
    } finally {
      setGoogleLoading(false)
    }
  }
  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email address and password.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await authService.login({ email, password, role: 'patient' })
      useAuthStore.getState().setUserMode('existing')
      useAuthStore.getState().setSession('patient')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
      if (__DEV__) {
        console.warn('[Login] failed', { message, apiBaseUrl: getApiBaseUrl() })
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.bg}>
      {/* Navy Header Hero */}
      <View style={[styles.header, { paddingTop: insets.top + 32, paddingBottom: 48 }]}>
        {/* Decorative background circles */}
        <View style={[styles.decoCircle, styles.decoCircle1]} />
        <View style={[styles.decoCircle, styles.decoCircle2]} />

        <View style={styles.headerCenter}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
      </View>

      {/* Main Form Content Container */}
      <View style={styles.formContainer}>
        <ScrollArea gap={16} py={24} px={22}>
          {/* Welcome Titles */}
          <View style={styles.titleWrap}>
            <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
            <Text style={styles.welcomeSub}>Sign in to access your GG'APP patient account</Text>
          </View>

          {/* Email Field */}
          <Field
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            required
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Password Field with Show/Hide toggle */}
          <View>
            <Field
              label="Password"
              placeholder={'••••••••'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              required
              right={
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <EyeIcon visible={showPassword} />
                </Pressable>
              }
            />

            {/* Right-aligned Forgot Password Link */}
            <View style={styles.forgotRow}>
              <Pressable
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={8}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Sign In CTA Button */}
          <MBtn variant="primary" fullWidth onPress={handleLogin} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In →'}
          </MBtn>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google SSO Button */}
          <Pressable style={styles.googleBtn} onPress={handleGoogleLogin} disabled={googleLoading}>
            <GoogleIcon />
            <Text style={styles.googleText}>{googleLoading ? 'Signing in with Google\u2026' : 'Continue with Google'}</Text>
          </Pressable>

          {/* Register Link */}
          <Pressable
            style={styles.registerRow}
            onPress={() => navigation.navigate('Register')}
            hitSlop={10}
          >
            <Text style={styles.registerHint}>Don't have an account? </Text>
            <Text style={styles.registerLink}>Register as a Patient</Text>
          </Pressable>
        </ScrollArea>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  decoCircle1: {
    width: 220,
    height: 220,
    right: -60,
    top: -60,
    borderColor: 'rgba(56, 182, 255, 0.15)',
  },
  decoCircle2: {
    width: 340,
    height: 340,
    right: -80,
    top: -80,
    borderColor: 'rgba(56, 182, 255, 0.08)',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 175,
    height: 100,
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  titleWrap: {
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 25,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    letterSpacing: -0.5,
  },
  welcomeSub: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 4,
    lineHeight: 20,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.blueInk,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.textLight,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
  },
  googleText: {
    fontSize: 15,
    fontFamily: fontWeights.semiBold,
    color: colors.navy,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  registerHint: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  registerLink: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
  },
})
