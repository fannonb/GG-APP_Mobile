import React, { useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet, TextInput } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, Field, DateField, MBtn } from '@/components'
import { CheckIcon } from '@/icons'
import { authService, getGoogleClientId, getIsMockApi } from '@gg/shared-api'
import { useAuthStore } from '@gg/shared-stores'
import { normalizeDobInput } from '@/lib/dates'
import type { AuthScreenProps } from '@/navigation/types'
import type { GoogleProfileState } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')

const STEP_LABELS = ['Personal Info', 'Identity', 'Security'] as const

const COUNTRIES = [
  { id: 'KE', name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { id: 'ZW', name: 'Zimbabwe', code: '+263', flag: '🇿🇼' },
  { id: 'ZM', name: 'Zambia', code: '+260', flag: '🇿🇲' },
]

function ChevronDownIcon({ color = colors.textSub }: { color?: string }) {
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
  const [phone, setPhone] = useState('')

  // Step 2: Identity
  const [dob, setDob] = useState('')
  const [nationalId, setNationalId] = useState('')

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
      if (!firstName || !lastName || !email || !selectedCountry || !phone) {
        setError('Please fill in all required fields.')
        return
      }
      setStep(1)
    } else if (step === 1) {
      if (!dob || !nationalId) {
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
        phone: selectedCountry ? `${selectedCountry.code}${phone}` : phone,
        country: selectedCountry?.id ?? '',
        dob: normalizedDob,
        nationalId,
        password: googleProfile ? undefined : password,
        googleIdToken: googleProfile?.googleIdToken,
        googleClientId: googleProfile ? getGoogleClientId() : undefined,
      })
      if (result.session) {
        // Google signup activates the account immediately (no email verification).
        useAuthStore.getState().setUserMode('new')
        useAuthStore.getState().setSession('patient')
        return
      }
      navigation.navigate('EmailVerify', {})
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen bg={colors.bg}>
      {/* Navy Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 28 }]}>
        {/* Decorative circles */}
        <View style={[styles.decoCircle, styles.decoCircle1]} />
        <View style={[styles.decoCircle, styles.decoCircle2]} />

        {/* Logo */}
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" />

        <Text style={styles.headerTitle}>Create Patient Account</Text>
        <Text style={styles.headerSub}>
          Get access to verified healthcare providers near you.
        </Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {STEP_LABELS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: i <= step ? colors.blue : colors.border },
                  ]}
                />
              )}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    (active || done) && styles.stepCircleActive,
                  ]}
                >
                  {done ? (
                    <CheckIcon size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNum,
                        (active || done) && styles.stepNumActive,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (active || done) && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </React.Fragment>
          )
        })}
      </View>

      {/* Form */}
      <ScrollArea gap={14} py={20} px={20}>
        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Step 1: Personal Info */}
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
                />
              </View>
              <View style={styles.nameField}>
                <Field
                  label="Last Name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  required
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
            />

            {/* Country selector */}
            <View style={styles.fieldWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Country</Text>
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

            {/* Phone number */}
            <View style={styles.fieldWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Phone Number</Text>
              </View>
              <View style={styles.phoneRow}>
                <View style={styles.phoneCode}>
                  <Text style={styles.phoneCodeText}>
                    {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : '+---'}
                  </Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="712 345 678"
                  placeholderTextColor={colors.textLight}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <MBtn variant="primary" fullWidth onPress={handleContinue}>
              Continue →
            </MBtn>

            <Pressable
              style={styles.linkRow}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkHint}>Already have an account? </Text>
              <Text style={styles.linkAction}>Sign In</Text>
            </Pressable>
          </>
        )}

        {/* Step 2: Identity */}
        {step === 1 && (
          <>
            <DateField
              label="Date of Birth"
              value={dob}
              onChangeText={setDob}
              required
            />

            <Field
              label="National ID"
              placeholder="e.g. 30127843"
              value={nationalId}
              onChangeText={setNationalId}
              required
              keyboardType="numeric"
            />

            <MBtn variant="primary" fullWidth onPress={handleContinue}>
              Continue →
            </MBtn>

            <Pressable style={styles.linkRow} onPress={() => setStep(0)}>
              <Text style={styles.linkAction}>← Back</Text>
            </Pressable>
          </>
        )}

        {/* Step 3: Security */}
        {step === 2 && (
          <>
            {!googleProfile && (
            <><Field
              label="Password"
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
            </>)}

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
                {agreedTerms && <CheckIcon size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the{' '}
                <Text style={styles.linkInline} onPress={() => navigation.navigate('Terms')}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.linkInline} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>
              </Text>
            </Pressable>

            <MBtn
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </MBtn>

            <Pressable style={styles.linkRow} onPress={() => setStep(1)}>
              <Text style={styles.linkAction}>← Back</Text>
            </Pressable>
          </>
        )}
      </ScrollArea>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  decoCircle1: {
    width: 200,
    height: 200,
    right: -80,
    top: -80,
    borderColor: 'rgba(47,155,255,0.08)',
  },
  decoCircle2: {
    width: 320,
    height: 320,
    right: -80,
    top: -80,
    borderColor: 'rgba(47,155,255,0.06)',
  },
  headerLogo: {
    width: 150,
    height: 85,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.4)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  stepNum: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.textLight,
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontFamily: fontWeights.medium,
    fontSize: 10,
    color: colors.textLight,
  },
  stepLabelActive: {
    color: colors.blue,
    fontFamily: fontWeights.semiBold,
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 18,
    borderRadius: 1,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.error,
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  fieldWrapper: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.navy,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 14,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  selectText: {
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: colors.text,
  },
  placeholder: {
    color: colors.textLight,
  },
  pickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerItemActive: {
    backgroundColor: colors.blue100,
  },
  pickerItemText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: colors.text,
  },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 14,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  phoneCode: {
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  phoneCodeText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: colors.navy,
  },
  phoneInput: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 15,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkHint: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  linkAction: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
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
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
  },
  linkInline: {
    color: colors.blueInk,
    fontFamily: fontWeights.bold,
  },
  googleNotice: {
    backgroundColor: colors.infoBg,
    borderRadius: radii.sm,
    padding: 12,
  },
  googleNoticeText: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.info,
    lineHeight: 19,
  },
})
