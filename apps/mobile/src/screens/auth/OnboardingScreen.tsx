import React, { useState } from 'react'
import { View, Text, Image, StyleSheet, Pressable, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights, radii } from '@/theme'
import { MBtn } from '@/components'
import type { AuthScreenProps } from '@/navigation/types'

const logo = require('../../../assets/gg-logo.png')

interface Step {
  id: string
  title: string
  subtitle: string
  body: string | null
  cta: string | null
  dark: boolean
  features?: { icon: string; title: string; desc: string }[]
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: "Welcome to GG'APP",
    subtitle: 'Healthcare Access, Simplified.',
    body: 'Access quality healthcare today and pay later through our approved credit facility. No upfront cost \u2014 ever.',
    cta: 'Get Started \u2192',
    dark: true,
  },
  {
    id: 'features',
    title: 'Everything You Need',
    subtitle: 'One platform for your complete healthcare journey.',
    body: null,
    cta: 'Continue \u2192',
    dark: false,
    features: [
      { icon: '\uD83C\uDFE5', title: 'Verified Providers', desc: 'Browse hospitals, clinics, pharmacies, labs and specialists \u2014 all KYC-verified.' },
      { icon: '\uD83D\uDCB3', title: 'Healthcare Credit', desc: 'Apply for a credit facility and get care today. Repay in monthly instalments.' },
      { icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', title: 'Beneficiaries', desc: 'Cover your family too \u2014 add dependants and pay for their care from your account.' },
      { icon: '\uD83D\uDD12', title: 'Triple PIN Confirmation', desc: 'Every payment needs your PIN entered 3 times \u2014 your money stays safe from unauthorised charges.' },
    ],
  },
  {
    id: 'kyc',
    title: 'Verify Your Identity',
    subtitle: 'Required to activate your account and credit facility.',
    body: 'Your information is encrypted and used only for verification. We never share your data.',
    cta: null,
    dark: false,
  },
  {
    id: 'done',
    title: "You're All Set!",
    subtitle: 'Your account is active and ready to use.',
    body: "Start exploring verified healthcare providers near you, or complete your credit application to unlock the full GG'APP experience.",
    cta: 'Go to Sign In \u2192',
    dark: true,
  },
]

export function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<AuthScreenProps<'Onboarding'>['navigation']>()
  const [step, setStep] = useState(0)
  const [nationalId, setNationalId] = useState('')

  const sd = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      navigation.replace('Login')
      return
    }
    setStep(s => s + 1)
  }

  const bg = sd.dark ? colors.navy : colors.bg
  const fg = sd.dark ? '#FFFFFF' : colors.text
  const subFg = sd.dark ? 'rgba(255,255,255,0.55)' : colors.textSub

  return (
    <View style={[s.root, { backgroundColor: bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Progress dots */}
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === step && s.dotActive,
              i === step && sd.dark && s.dotActiveOnDark,
            ]}
          />
        ))}
      </View>

      <View style={s.content}>
        {sd.id === 'welcome' && (
          <View style={s.logoWrap}>
            <Image source={logo} style={s.logo} resizeMode="contain" />
          </View>
        )}

        <View style={s.center}>
          <Text style={[s.title, { color: fg }]}>{sd.title}</Text>
          <Text style={[s.subtitle, { color: subFg }]}>{sd.subtitle}</Text>
          {sd.body ? (
            <Text style={[s.body, { color: sd.dark ? 'rgba(255,255,255,0.45)' : colors.textSub }]}>
              {sd.body}
            </Text>
          ) : null}
        </View>

        {sd.features ? (
          <View style={s.features}>
            {sd.features.map(feature => (
              <View key={feature.title} style={s.featureCard}>
                <Text style={s.featureIcon}>{feature.icon}</Text>
                <View style={s.featureTextWrap}>
                  <Text style={s.featureTitle}>{feature.title}</Text>
                  <Text style={s.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {sd.id === 'kyc' ? (
          <View style={s.kycCard}>
            <Text style={s.kycLabel}>National ID Number</Text>
            <TextInput
              style={s.kycInput}
              placeholder="e.g. KE-30482175-A"
              placeholderTextColor={colors.textLight}
              value={nationalId}
              onChangeText={setNationalId}
              autoCapitalize="characters"
            />
          </View>
        ) : null}
      </View>

      <View style={s.footer}>
        {sd.cta ? (
          <MBtn
            variant={sd.dark ? 'primary' : 'primary'}
            fullWidth
            onPress={handleNext}
          >
            {sd.cta}
          </MBtn>
        ) : (
          <Pressable style={s.continueRow} onPress={() => setStep(s => s + 1)} hitSlop={8}>
            <Text style={s.continueLink}>Continue \u2192</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.blue,
  },
  dotActiveOnDark: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 88,
    height: 88,
  },
  center: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  body: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 340,
  },
  features: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.default,
    padding: 14,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 17,
  },
  kycCard: {
    backgroundColor: colors.card,
    borderRadius: radii.default,
    padding: 16,
  },
  kycLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  kycInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  footer: {
    paddingTop: 16,
  },
  continueRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  continueLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.blueInk,
  },
})
