import React, { useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Dimensions, ScrollView, TextInput } from 'react-native'
import Pressable from '@/components/Pressable'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, Field } from '@/components'
import { authService, getApiBaseUrl, getIsMockApi } from '@gg/shared-api'
import { startGoogleSignIn } from '@/lib/google-auth'
import { useAuthStore } from '@gg/shared-stores'
import { isValidEmail, normalizeEmail } from '@/lib/validation'
import type { AuthScreenProps } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')
const { width: SCREEN_WIDTH } = Dimensions.get('window')

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#4285F4" />
      <Path d="M3.2 14.7l7.1 5.2C12 15.6 17.5 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 14.9 2 7.2 7.2 3.2 14.7z" fill="#EA4335" />
      <Path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.5 37.1 26.9 38 24 38c-6 0-11.1-4-12.8-9.5l-7.1 5.5C7.8 41 15.2 46 24 46z" fill="#34A853" />
      <Path d="M44.5 20H24v8.5h11.8c-1 3.2-3.1 5.8-5.8 7.5l6.5 5.5C40.5 38 46 32 46 24c0-1.3-.2-2.7-.5-4h-1z" fill="#FBBC05" />
    </Svg>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  const strokeColor = "rgba(255,255,255,0.5)"
  if (visible) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={strokeColor} strokeWidth={1.8} />
      </Svg>
    )
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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
  const [needsVerification, setNeedsVerification] = useState(false)
  const passwordRef = useRef<TextInput>(null)

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
    setNeedsVerification(false)
    if (!email.trim() || !password) {
      setError('Please enter your email address and password.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address, like you@example.com.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      // Keyboards often append a space after autocomplete; never send it.
      await authService.login({ email: normalizeEmail(email), password, role: 'patient' })
      useAuthStore.getState().setUserMode('existing')
      useAuthStore.getState().setSession('patient')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
      if (__DEV__) {
        console.warn('[Login] failed', { message, apiBaseUrl: getApiBaseUrl() })
      }
      setError(message)
      setNeedsVerification(/verify your email/i.test(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.navy}>
      <View style={styles.bgGlow} />
      
      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: 20, 
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Logo */}
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Welcome Titles */}
        <View style={styles.titleWrap}>
          <Text style={styles.welcomeTitle}>
            Welcome {'\n'}
            <Text style={styles.highlight}>back.</Text>
          </Text>
          <Text style={styles.welcomeSub}>Sign in to your GG'APP patient account.</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Email Field */}
          <Field
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            required
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            variant="dark"
          />

          {/* Password Field */}
          <View>
            <Field
              ref={passwordRef}
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              required
              variant="dark"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              right={
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon visible={showPassword} />
                </Pressable>
              }
            />

            {/* Forgot Password Link */}
            <View style={styles.forgotRow}>
              <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={12} accessibilityRole="link">
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBanner} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{error}</Text>
              {needsVerification ? (
                <Pressable
                  onPress={() => navigation.navigate('EmailVerify', { email: normalizeEmail(email) })}
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <Text style={styles.errorAction}>Resend verification email</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Sign In CTA Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
              loading && styles.primaryBtnDisabled
            ]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google SSO Button */}
          <Pressable 
            style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            accessibilityRole="button"
            accessibilityState={{ disabled: googleLoading, busy: googleLoading }}
          >
            <GoogleIcon />
            <Text style={styles.googleText}>
              {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Register Link */}
          <Pressable
            style={styles.registerRow}
            onPress={() => navigation.navigate('Register')}
            hitSlop={12}
            accessibilityRole="link"
          >
            <Text style={styles.registerHint}>Don't have an account? </Text>
            <Text style={styles.registerLink}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  bgGlow: {
    position: 'absolute',
    bottom: '-20%',
    right: '-25%',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: 9999,
    backgroundColor: 'rgba(56, 182, 255, 0.04)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    opacity: 1,
  },
  titleWrap: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: fontWeights.extraBold,
    fontSize: 40,
    color: '#FFFFFF',
    lineHeight: 48,
    letterSpacing: -1,
  },
  highlight: {
    color: colors.blue,
  },
  welcomeSub: {
    fontFamily: fontWeights.regular,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  formContainer: {
    gap: 8,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  forgotLink: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.blue,
  },
  errorBanner: {
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 143, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 143, 0.35)',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.errorOnDark,
    textAlign: 'center',
  },
  errorAction: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  primaryBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnPressed: {
    opacity: 0.8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.navy900,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: 'rgba(255,255,255,0.4)',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    gap: 12,
  },
  googleBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  googleText: {
    fontSize: 15,
    fontFamily: fontWeights.semiBold,
    color: '#FFFFFF',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  registerHint: {
    fontSize: 15,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.6)',
  },
  registerLink: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
})
