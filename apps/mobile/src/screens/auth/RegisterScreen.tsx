import React, { useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet, Dimensions, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, Field, DateField, MBtn, PhonePrefixInput } from '@/components'
import { CheckIcon } from '@/icons'
import { authService, getGoogleClientId } from '@gg/shared-api'
import { useAuthStore } from '@gg/shared-stores'
import { getCountryDial } from '@gg/shared-config'
import { normalizeDobInput } from '@/lib/dates'
import type { AuthScreenProps, GoogleProfileState } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')
const { width: SCREEN_WIDTH } = Dimensions.get('window')

const COUNTRIES = [
  { id: 'KE', name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { id: 'ZW', name: 'Zimbabwe', code: '+263', flag: '🇿🇼' },
  { id: 'ZM', name: 'Zambia', code: '+260', flag: '🇿🇲' },
]

function ChevronDownIcon({ color = 'rgba(255,255,255,0.5)' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function getPasswordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const
const STRENGTH_COLORS = [colors.error, colors.warning, colors.blue, colors.success]
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong']

export function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<AuthScreenProps<'Register'>['navigation']>()
  const route = useRoute<AuthScreenProps<'Register'>['route']>()
  const googleProfile: GoogleProfileState | undefined = route.params?.googleProfile
  const [step, setStep] = useState(0)

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState(googleProfile?.firstName ?? '')
  const [lastName, setLastName] = useState(googleProfile?.lastName ?? '')
  const [email, setEmail] = useState(googleProfile?.email ?? '')
  const [selectedCountryIdx, setSelectedCountryIdx] = useState(-1)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState('KE')
  const [phoneDigits, setPhoneDigits] = useState('')

  // Step 2: Identity
  const [dob, setDob] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [gender, setGender] = useState('')

  // Step 3: Security
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCountry = selectedCountryIdx >= 0 ? COUNTRIES[selectedCountryIdx] : null
  const pwStrength = getPasswordStrength(password)

  const handleContinue = () => {
    setError(null)
    if (step === 0) {
      if (!firstName || !lastName || !email || !selectedCountry || !phoneDigits) {
        setError('Please fill in all required fields.')
        return
      }
      setStep(1)
    } else if (step === 1) {
      if (!dob || !nationalId || !gender) {
        setError('Please fill in all required fields.')
        return
      }
      if (!normalizeDobInput(dob)) {
        setError('Use a valid date of birth in DD/MM/YYYY or YYYY-MM-DD format.')
        return
      }
      setStep(2)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    if (!googleProfile) {
      if (!password || !confirmPassword) {
        setError('Please fill in all password fields.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }
    if (!agreedTerms) {
      setError('You must agree to the Terms of Service.')
      return
    }
    const normalizedDob = normalizeDobInput(dob)
    if (!normalizedDob) {
      setError('Use a valid date of birth in DD/MM/YYYY or YYYY-MM-DD format.')
      return
    }
    setLoading(true)
    try {
      const result = await authService.registerPatient({
        firstName,
        lastName,
        email,
        phone: `${getCountryDial(phoneCountryCode)} ${phoneDigits}`,
        country: selectedCountry?.id ?? '',
        dob: normalizedDob,
        gender,
        nationalId,
        password: googleProfile ? undefined : password,
        googleIdToken: googleProfile?.googleIdToken,
        googleClientId: googleProfile ? getGoogleClientId() : undefined,
      })
      if (result.session) {
        useAuthStore.getState().setUserMode('new')
        useAuthStore.getState().setSession('patient')
        return
      }
      navigation.navigate('EmailVerify', { token: result.verificationToken })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.navy}>
      <View style={styles.bgGlow} />

      {/* Sleek Minimalist Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        
        {/* Minimal Progress Dots */}
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === step && styles.progressDotActive,
                i < step && styles.progressDotDone,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ 
          paddingBottom: insets.top + 60,
          paddingHorizontal: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Titles */}
        <View style={styles.titleWrap}>
          {step === 0 && (
            <>
              <Text style={styles.stepTitle}>
                Tell us about{'\n'}
                <Text style={styles.highlight}>yourself.</Text>
              </Text>
              <Text style={styles.stepSub}>Create your GG'APP patient account.</Text>
            </>
          )}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>
                Verify your{'\n'}
                <Text style={styles.highlight}>identity.</Text>
              </Text>
              <Text style={styles.stepSub}>We need this to secure your medical records.</Text>
            </>
          )}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>
                Secure your{'\n'}
                <Text style={styles.highlight}>account.</Text>
              </Text>
              <Text style={styles.stepSub}>Keep your access safe and private.</Text>
            </>
          )}
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Container */}
        <View style={styles.formContainer}>
          
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <>
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Field
                    label="First Name"
                    placeholder="John"
                    value={firstName}
                    onChangeText={setFirstName}
                    required
                    variant="dark"
                  />
                </View>
                <View style={styles.nameField}>
                  <Field
                    label="Last Name"
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={setLastName}
                    required
                    variant="dark"
                  />
                </View>
              </View>

              <Field
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                required
                keyboardType="email-address"
                autoCapitalize="none"
                variant="dark"
              />

              {/* Country selector */}
              <View style={styles.fieldWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelDark}>Country</Text>
                </View>
                <Pressable
                  style={styles.selectBox}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !selectedCountry && styles.placeholder,
                    ]}
                  >
                    {selectedCountry
                      ? `${selectedCountry.flag} ${selectedCountry.name}`
                      : 'Select country'}
                  </Text>
                  <ChevronDownIcon />
                </Pressable>
                {showCountryPicker && (
                  <View style={styles.pickerDropdown}>
                    {COUNTRIES.map((c, idx) => (
                      <Pressable
                        key={c.name}
                        style={[
                          styles.pickerItem,
                          idx === selectedCountryIdx && styles.pickerItemActive,
                        ]}
                        onPress={() => {
                          setSelectedCountryIdx(idx)
                          setPhoneCountryCode(c.id)
                          setShowCountryPicker(false)
                        }}
                      >
                        <Text style={styles.pickerItemText}>
                          {c.flag} {c.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <PhonePrefixInput
                label="Phone Number"
                required
                variant="dark"
                countryCode={phoneCountryCode}
                onCountryChange={setPhoneCountryCode}
                digits={phoneDigits}
                onDigitsChange={setPhoneDigits}
              />

              <Pressable style={styles.primaryBtn} onPress={handleContinue}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>

              <Pressable
                style={styles.linkRow}
                onPress={() => navigation.navigate('Login')}
                hitSlop={12}
              >
                <Text style={styles.linkHint}>Already have an account? </Text>
                <Text style={styles.linkAction}>Sign In</Text>
              </Pressable>
            </>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <>
              <DateField
                label="Date of Birth"
                value={dob}
                onChangeText={setDob}
                required
                variant="dark"
              />

              <Field
                label="National ID"
                placeholder="e.g. 30127843"
                value={nationalId}
                onChangeText={setNationalId}
                required
                keyboardType="numeric"
                variant="dark"
              />

              <View style={styles.fieldWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelDark}>Gender</Text>
                </View>
                <View style={styles.genderRow}>
                  {GENDERS.map(option => {
                    const active = gender === option
                    return (
                      <Pressable
                        key={option}
                        style={[styles.genderChip, active && styles.genderChipActive]}
                        onPress={() => setGender(option)}
                      >
                        <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>
                          {option}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <Pressable style={styles.primaryBtn} onPress={handleContinue}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>

              <Pressable style={styles.linkRow} onPress={() => setStep(0)} hitSlop={12}>
                <Text style={styles.linkAction}>← Back</Text>
              </Pressable>
            </>
          )}

          {/* Step 2: Security */}
          {step === 2 && (
            <>
              {!googleProfile && (
                <>
                  <Field
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    required
                    variant="dark"
                  />

                  <Field
                    label="Confirm Password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    required
                    variant="dark"
                  />

                  {/* Password strength indicator */}
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
                                    : 'rgba(255,255,255,0.1)',
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
                </>
              )}

              {googleProfile && (
                <View style={styles.googleNotice}>
                  <Text style={styles.googleNoticeText}>
                    Verified by Google — email is locked in. We've pre-filled your name, feel free to correct it.
                  </Text>
                </View>
              )}

              {/* Terms checkbox */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setAgreedTerms(!agreedTerms)}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedTerms && styles.checkboxChecked,
                  ]}
                >
                  {agreedTerms && <CheckIcon size={12} color={colors.navy} />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <Text style={styles.linkInline} onPress={() => navigation.navigate('Terms')}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.linkInline} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>
                </Text>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                  loading && styles.primaryBtnDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </Pressable>

              <Pressable style={styles.linkRow} onPress={() => setStep(1)} hitSlop={12}>
                <Text style={styles.linkAction}>← Back</Text>
              </Pressable>
            </>
          )}

        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  bgGlow: {
    position: 'absolute',
    bottom: '-20%',
    left: '-25%',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: 9999,
    backgroundColor: 'rgba(56, 182, 255, 0.04)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    opacity: 1,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressDotActive: {
    backgroundColor: colors.blue,
  },
  progressDotDone: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  titleWrap: {
    marginBottom: 32,
  },
  stepTitle: {
    fontFamily: fontWeights.extraBold,
    fontSize: 40,
    color: '#FFFFFF',
    lineHeight: 48,
    letterSpacing: -1,
  },
  highlight: {
    color: colors.blue,
  },
  stepSub: {
    fontFamily: fontWeights.regular,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  formContainer: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  labelDark: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fontWeights.medium,
    fontSize: 14,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectText: {
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: '#FFFFFF',
  },
  placeholder: {
    color: 'rgba(255,255,255,0.3)',
  },
  pickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    backgroundColor: '#1A2F5E',
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pickerItemText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  phoneRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
  },
  phoneCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  phoneCodeText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  phoneInput: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  linkHint: {
    fontSize: 15,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.6)',
  },
  linkAction: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  strengthSection: {
    gap: 8,
    marginBottom: 8,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkboxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  genderChipActive: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(56,182,255,0.16)',
  },
  genderChipText: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  genderChipTextActive: {
    color: colors.blue,
    fontFamily: fontWeights.bold,
  },
  linkInline: {
    color: colors.blue,
    fontFamily: fontWeights.bold,
  },
  googleNotice: {
    backgroundColor: 'rgba(56, 182, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 182, 255, 0.2)',
    marginVertical: 8,
  },
  googleNoticeText: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: '#FFFFFF',
    lineHeight: 20,
  },
})
