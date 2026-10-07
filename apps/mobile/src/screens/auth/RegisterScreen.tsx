import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  BackHandler,
  TextInput,
} from 'react-native'
import Pressable from '@/components/Pressable'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, Field, DateField, PhonePrefixInput } from '@/components'
import { CheckIcon } from '@/icons'
import { authService, getGoogleClientId } from '@gg/shared-api'
import { useAuthStore } from '@gg/shared-stores'
import { getCountryDial } from '@gg/shared-config'
import { normalizeDobInput } from '@/lib/dates'
import {
  NATIONAL_ID_FORMATS,
  isValidEmail,
  normalizeEmail,
  passwordProblem,
} from '@/lib/validation'
import type { AuthScreenProps, GoogleProfileState } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')
const { width: SCREEN_WIDTH } = Dimensions.get('window')

const COUNTRIES = [
  { id: 'KE', name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { id: 'ZW', name: 'Zimbabwe', code: '+263', flag: '🇿🇼' },
  { id: 'ZM', name: 'Zambia', code: '+260', flag: '🇿🇲' },
]

type FieldErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'country'
    | 'phone'
    | 'dob'
    | 'nationalId'
    | 'gender'
    | 'password'
    | 'confirmPassword'
    | 'terms',
    string
  >
>

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

function EyeIcon({ visible }: { visible: boolean }) {
  const strokeColor = 'rgba(255,255,255,0.6)'
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

function getPasswordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const
const STRENGTH_COLORS = [colors.errorOnDark, '#F5B54A', colors.blue, '#4ADE9B']
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong']

export function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<AuthScreenProps<'Register'>['navigation']>()
  const route = useRoute<AuthScreenProps<'Register'>['route']>()
  const googleProfile: GoogleProfileState | undefined = route.params?.googleProfile
  const [step, setStep] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const lastNameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)

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
  const [showPassword, setShowPassword] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedCountry = selectedCountryIdx >= 0 ? COUNTRIES[selectedCountryIdx] : null
  const idFormat = NATIONAL_ID_FORMATS[selectedCountry?.id ?? 'KE']
  const pwStrength = getPasswordStrength(password)

  const goToStep = (next: number) => {
    setFieldErrors({})
    setSubmitError(null)
    setStep(next)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }

  // Android hardware back steps through the form instead of discarding it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        goToStep(step - 1)
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [step])

  /** Only clear the error for the field being edited, so the others stay visible. */
  const clearError = (key: keyof FieldErrors) =>
    setFieldErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const validateStep = (index: number): FieldErrors => {
    const errors: FieldErrors = {}
    if (index === 0) {
      if (!firstName.trim()) errors.firstName = 'Enter your first name.'
      if (!lastName.trim()) errors.lastName = 'Enter your last name.'
      if (!email.trim()) errors.email = 'Enter your email address.'
      else if (!isValidEmail(email)) errors.email = 'Enter a valid email address, like you@example.com.'
      if (!selectedCountry) errors.country = 'Choose the country where you will receive care.'
      if (phoneDigits.replace(/\D/g, '').length < 6) errors.phone = 'Enter your phone number.'
    } else if (index === 1) {
      const normalized = normalizeDobInput(dob)
      if (!dob) errors.dob = 'Enter your date of birth.'
      else if (!normalized) errors.dob = 'Use the format DD/MM/YYYY.'
      else if (new Date(normalized) > new Date()) errors.dob = 'Date of birth cannot be in the future.'
      if (nationalId.trim().length < 5) errors.nationalId = 'Enter your full national ID number.'
      if (!gender) errors.gender = 'Choose an option.'
    } else {
      if (!googleProfile) {
        const problem = passwordProblem(password)
        if (problem) errors.password = problem
        if (!confirmPassword) errors.confirmPassword = 'Re-enter your password.'
        else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.'
      }
      if (!agreedTerms) errors.terms = 'Please accept the Terms of Service and Privacy Policy.'
    }
    return errors
  }

  const handleContinue = () => {
    const errors = validateStep(step)
    setFieldErrors(errors)
    if (Object.keys(errors).length === 0) goToStep(step + 1)
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    const errors = validateStep(2)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const normalizedDob = normalizeDobInput(dob)
    if (!normalizedDob) {
      goToStep(1)
      return
    }
    setLoading(true)
    try {
      const result = await authService.registerPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizeEmail(email),
        phone: `${getCountryDial(phoneCountryCode)} ${phoneDigits}`,
        country: selectedCountry?.id ?? '',
        dob: normalizedDob,
        gender,
        nationalId: nationalId.trim().toUpperCase(),
        password: googleProfile ? undefined : password,
        googleIdToken: googleProfile?.googleIdToken,
        googleClientId: googleProfile ? getGoogleClientId() : undefined,
      })
      if (result.session) {
        useAuthStore.getState().setUserMode('new')
        useAuthStore.getState().setSession('patient')
        return
      }
      navigation.navigate('EmailVerify', {
        token: result.verificationToken,
        email: normalizeEmail(email),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setSubmitError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.navy}>
      <View style={styles.bgGlow} />

      {/* Sleek Minimalist Header */}
      <View style={[styles.header, { paddingTop: 20 }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />

        {/* Minimal Progress Dots */}
        <View
          style={styles.progressRow}
          accessible
          accessibilityLabel={`Step ${step + 1} of 3`}
        >
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
        ref={scrollRef}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 60,
          paddingHorizontal: 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Titles */}
        <View style={styles.titleWrap}>
          {step === 0 && (
            <>
              <Text style={styles.stepTitle} accessibilityRole="header">
                Tell us about{'\n'}
                <Text style={styles.highlight}>yourself.</Text>
              </Text>
              <Text style={styles.stepSub}>Create your GG'APP patient account.</Text>
            </>
          )}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle} accessibilityRole="header">
                Verify your{'\n'}
                <Text style={styles.highlight}>identity.</Text>
              </Text>
              <Text style={styles.stepSub}>We need this to secure your medical records.</Text>
            </>
          )}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle} accessibilityRole="header">
                Secure your{'\n'}
                <Text style={styles.highlight}>account.</Text>
              </Text>
              <Text style={styles.stepSub}>Keep your access safe and private.</Text>
            </>
          )}
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <>
              {googleProfile && (
                <View style={styles.googleNotice}>
                  <Text style={styles.googleNoticeText}>
                    Signing up with Google. Your email is confirmed and can't be changed here. Check your name below.
                  </Text>
                </View>
              )}

              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Field
                    label="First Name"
                    placeholder="John"
                    value={firstName}
                    onChangeText={v => { setFirstName(v); clearError('firstName') }}
                    error={fieldErrors.firstName}
                    required
                    variant="dark"
                    autoComplete="name-given"
                    textContentType="givenName"
                    autoCapitalize="words"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                  />
                </View>
                <View style={styles.nameField}>
                  <Field
                    ref={lastNameRef}
                    label="Last Name"
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={v => { setLastName(v); clearError('lastName') }}
                    error={fieldErrors.lastName}
                    required
                    variant="dark"
                    autoComplete="name-family"
                    textContentType="familyName"
                    autoCapitalize="words"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>

              <Field
                ref={emailRef}
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={v => { setEmail(v); clearError('email') }}
                error={fieldErrors.email}
                hint={googleProfile ? 'Confirmed by Google' : undefined}
                editable={!googleProfile}
                required
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                variant="dark"
              />

              {/* Country selector */}
              <View style={styles.fieldWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelDark}>Country</Text>
                </View>
                <Pressable
                  style={[styles.selectBox, fieldErrors.country && styles.selectBoxError]}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                  accessibilityRole="button"
                  accessibilityLabel={`Country, ${selectedCountry ? selectedCountry.name : 'not selected'}`}
                  accessibilityState={{ expanded: showCountryPicker }}
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
                        accessibilityRole="button"
                        accessibilityState={{ selected: idx === selectedCountryIdx }}
                        onPress={() => {
                          setSelectedCountryIdx(idx)
                          setPhoneCountryCode(c.id)
                          setShowCountryPicker(false)
                          clearError('country')
                        }}
                      >
                        <Text style={styles.pickerItemText}>
                          {c.flag} {c.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {fieldErrors.country ? <Text style={styles.inlineError}>{fieldErrors.country}</Text> : null}
              </View>

              <PhonePrefixInput
                label="Phone Number"
                required
                variant="dark"
                countryCode={phoneCountryCode}
                onCountryChange={setPhoneCountryCode}
                digits={phoneDigits}
                onDigitsChange={v => { setPhoneDigits(v); clearError('phone') }}
                error={fieldErrors.phone}
              />

              <Pressable style={styles.primaryBtn} onPress={handleContinue} accessibilityRole="button">
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>

              <Pressable
                style={styles.linkRow}
                onPress={() => navigation.navigate('Login')}
                hitSlop={12}
                accessibilityRole="link"
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
                onChangeText={v => { setDob(v); clearError('dob') }}
                error={fieldErrors.dob}
                maximumDate={new Date()}
                required
                variant="dark"
              />

              <Field
                label="National ID"
                placeholder={idFormat.placeholder}
                hint={idFormat.hint}
                value={nationalId}
                onChangeText={v => { setNationalId(v); clearError('nationalId') }}
                error={fieldErrors.nationalId}
                required
                keyboardType={idFormat.numeric ? 'number-pad' : 'default'}
                autoCapitalize="characters"
                autoCorrect={false}
                variant="dark"
              />

              <View style={styles.fieldWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelDark}>Gender</Text>
                </View>
                <View style={styles.genderRow} accessibilityRole="radiogroup">
                  {GENDERS.map(option => {
                    const active = gender === option
                    return (
                      <Pressable
                        key={option}
                        style={[styles.genderChip, active && styles.genderChipActive]}
                        onPress={() => { setGender(option); clearError('gender') }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>
                          {option}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                {fieldErrors.gender ? <Text style={styles.inlineError}>{fieldErrors.gender}</Text> : null}
              </View>

              <Pressable style={styles.primaryBtn} onPress={handleContinue} accessibilityRole="button">
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>

              <Pressable style={styles.linkRow} onPress={() => goToStep(0)} hitSlop={12} accessibilityRole="button">
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
                    onChangeText={v => { setPassword(v); clearError('password') }}
                    error={fieldErrors.password}
                    hint="At least 8 characters, with an uppercase letter and a number."
                    secureTextEntry={!showPassword}
                    required
                    variant="dark"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    right={
                      <Pressable
                        onPress={() => setShowPassword(v => !v)}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <EyeIcon visible={showPassword} />
                      </Pressable>
                    }
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

                  <Field
                    ref={confirmRef}
                    label="Confirm Password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={v => { setConfirmPassword(v); clearError('confirmPassword') }}
                    error={fieldErrors.confirmPassword}
                    secureTextEntry={!showPassword}
                    required
                    variant="dark"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                </>
              )}

              {/* Terms checkbox */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => { setAgreedTerms(!agreedTerms); clearError('terms') }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedTerms }}
                accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedTerms && styles.checkboxChecked,
                    fieldErrors.terms && !agreedTerms && styles.checkboxError,
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
              {fieldErrors.terms ? <Text style={styles.inlineError}>{fieldErrors.terms}</Text> : null}

              {/* Server errors sit next to the button that caused them, not off-screen at the top. */}
              {submitError ? (
                <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                  loading && styles.primaryBtnDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </Pressable>

              <Pressable style={styles.linkRow} onPress={() => goToStep(1)} hitSlop={12} accessibilityRole="button">
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
  selectBoxError: {
    borderColor: colors.errorOnDark,
  },
  selectText: {
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: '#FFFFFF',
  },
  placeholder: {
    color: 'rgba(255,255,255,0.45)',
  },
  pickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    backgroundColor: colors.navy600,
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
  inlineError: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.errorOnDark,
    marginTop: 6,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 138, 143, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 143, 0.35)',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.errorOnDark,
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
  checkboxError: {
    borderColor: colors.errorOnDark,
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
    marginBottom: 16,
  },
  googleNoticeText: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: '#FFFFFF',
    lineHeight: 20,
  },
})
