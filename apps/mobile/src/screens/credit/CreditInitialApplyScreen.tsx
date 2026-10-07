import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii } from '@/theme'
import { useCurrency } from '@/lib/useCurrency'
import { displayCurrencySymbol, formatCurrency } from '@gg/shared-utils'
import { Screen, ScrollArea, AppBar, MCard, MBtn, Field, ActionBar } from '@/components'
import FinancePartnerLogo from '@/components/FinancePartnerLogo'
import { useApplyCreditMutation } from '@gg/shared-hooks'
import { useUserStore, useAuthStore } from '@gg/shared-stores'
import {
  getFinancePartnerIdForCountry,
  getFinancePartnerSummary,
  getWorldCountryByCode,
} from '@gg/shared-config'

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: 'business-owner', label: 'Business owner' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
]

const MIN_AMOUNT = 1000
const MAX_AMOUNT = 50000
const QUICK_AMOUNTS = [5000, 10000, 20000, 50000]

type FieldKey = 'employment' | 'income' | 'amount'

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <View style={[st.checkBox, checked && st.checkBoxOn]}>
      {checked && (
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  )
}

function InfoIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={6.5} stroke={colors.blueInk} strokeWidth={1.3} />
      <Line x1={8} y1={7} x2={8} y2={11} stroke={colors.blueInk} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={8} cy={4.8} r={0.9} fill={colors.blueInk} />
    </Svg>
  )
}

/**
 * The credit application. The finance partner follows the patient's country
 * (Equity Bank in Kenya, Moneymart Finance in Zimbabwe), so there is nothing
 * to choose: the screen just says who will review it.
 */
export function CreditInitialApplyScreen() {
  const currency = useCurrency()
  const symbol = displayCurrencySymbol(currency)
  const navigation = useNavigation<any>()
  const u = useUserStore(s => s.user)
  const applyMutation = useApplyCreditMutation()

  const countryCode = u?.countryCode ?? 'KE'
  const partnerId = getFinancePartnerIdForCountry(countryCode)
  const partner = getFinancePartnerSummary(partnerId)
  const countryName = getWorldCountryByCode(countryCode)?.name

  const [employment, setEmployment] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const clearError = (key: FieldKey) => setErrors(e => ({ ...e, [key]: undefined }))
  const digitsOnly = (text: string) => text.replace(/[^\d]/g, '')
  const shortAmount = (n: number) => `${symbol} ${n.toLocaleString('en-US')}`

  const handleSubmit = async () => {
    const income = Number(monthlyIncome)
    const amount = Number(requestedAmount)
    const next: Partial<Record<FieldKey, string>> = {}
    if (!employment) next.employment = 'Choose your employment status'
    if (!monthlyIncome || income <= 0) next.income = 'Enter your monthly income'
    if (!requestedAmount || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      next.amount = `Enter an amount between ${shortAmount(MIN_AMOUNT)} and ${shortAmount(MAX_AMOUNT)}`
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitError(null)
    setLoading(true)
    try {
      await applyMutation.mutateAsync({
        financePartnerId: partnerId,
        employment,
        monthlyIncome: income,
        requestedAmount: amount,
        consent,
        residenceCountryCode: countryCode,
        residenceCountryName: countryName,
        coverageType: 'self',
      })
      useAuthStore.getState().completeOnboardingStep(4)
      navigation.navigate('CreditStatus')
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Unable to submit your application right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <AppBar title="Apply for credit" subtitle="Takes about 2 minutes" back />

      <ScrollArea gap={14} px={16} py={14}>
        {/* 1. Who reviews it */}
        <MCard padding={16}>
          <View style={st.partnerRow}>
            <View style={st.partnerChip}>
              <FinancePartnerLogo partnerId={partnerId} height={partnerId === 'equity' ? 30 : 28} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.partnerLabel}>Your finance partner</Text>
              <Text style={st.partnerName}>{partner?.name}</Text>
              <Text style={st.partnerMeta}>Decision usually within {partner?.processingTime}</Text>
            </View>
          </View>
          <Text style={st.partnerNote}>
            {countryName ? `Healthcare credit in ${countryName} is provided by ${partner?.name}. ` : ''}
            They review your application and set your limit.
          </Text>
        </MCard>

        {/* 2. About you */}
        <MCard padding={16}>
          <Text style={st.cardTitle}>About you</Text>

          <Text style={st.fieldLabel}>Employment status</Text>
          <View style={st.chips} accessibilityRole="radiogroup">
            {EMPLOYMENT_OPTIONS.map(opt => {
              const selected = employment === opt.value
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setEmployment(opt.value)
                    clearError('employment')
                  }}
                  style={[st.chip, selected && st.chipOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[st.chipText, selected && st.chipTextOn]}>{opt.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {errors.employment ? <Text style={st.fieldError}>{errors.employment}</Text> : null}

          <View style={{ height: 16 }} />
          <Field
            label="Monthly income"
            placeholder="e.g. 25,000"
            keyboardType="number-pad"
            value={monthlyIncome}
            onChangeText={t => {
              setMonthlyIncome(digitsOnly(t))
              clearError('income')
            }}
            right={<Text style={st.unit}>{symbol}</Text>}
            error={errors.income}
            hint="Your take-home pay after tax"
          />
        </MCard>

        {/* 3. Amount */}
        <MCard padding={16}>
          <Text style={st.cardTitle}>How much do you need?</Text>
          <View style={st.amountGrid}>
            {QUICK_AMOUNTS.map(n => {
              const selected = Number(requestedAmount) === n
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    setRequestedAmount(String(n))
                    clearError('amount')
                  }}
                  style={[st.chip, st.amountChip, selected && st.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[st.chipText, selected && st.chipTextOn]}>{shortAmount(n)}</Text>
                </Pressable>
              )
            })}
          </View>
          <View style={{ height: 14 }} />
          <Field
            label="Or enter an amount"
            placeholder="e.g. 15,000"
            keyboardType="number-pad"
            value={requestedAmount}
            onChangeText={t => {
              setRequestedAmount(digitsOnly(t))
              clearError('amount')
            }}
            right={<Text style={st.unit}>{symbol}</Text>}
            error={errors.amount}
            hint={`Between ${formatCurrency(MIN_AMOUNT, currency)} and ${formatCurrency(MAX_AMOUNT, currency)}`}
          />
        </MCard>

        {/* 4. What happens next */}
        <View style={st.nextNote}>
          <InfoIcon />
          <Text style={st.nextText}>
            After you submit, {partner?.name ?? 'your finance partner'} reviews your application. We'll notify you as
            soon as there's a decision, and approved credit appears in your wallet straight away.
          </Text>
        </View>

        <View style={{ height: 8 }} />
      </ScrollArea>

      {/* Consent sits with the button it unlocks, as on the disclosure screen. */}
      <ActionBar
        error={submitError}
        top={
          <Pressable
            style={[st.consentRow, consent && st.consentRowOn]}
            onPress={() => setConsent(!consent)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <CheckSquare checked={consent} />
            <Text style={st.consentText}>
              The information is accurate, and {partner?.name ?? 'my finance partner'} may run a credit check.
            </Text>
          </Pressable>
        }
      >
        <MBtn variant="primary" fullWidth disabled={!consent || loading} onPress={handleSubmit}>
          {loading ? 'Submitting…' : 'Submit application'}
        </MBtn>
      </ActionBar>
    </Screen>
  )
}

export default CreditInitialApplyScreen

const st = StyleSheet.create({
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  partnerChip: {
    minWidth: 72,
    height: 56,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLabel: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.textLight,
  },
  partnerName: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.text,
    marginTop: 1,
  },
  partnerMeta: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.blueInk,
    marginTop: 2,
  },
  partnerNote: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.text,
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.navy,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  amountChip: {
    width: '48.5%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  chipOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  chipTextOn: {
    color: '#FFFFFF',
  },
  fieldError: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  unit: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.textLight,
  },
  nextNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radii.large,
    backgroundColor: colors.blue100,
  },
  nextText: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
  },
  consentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: radii.default,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  consentRowOn: {
    borderColor: colors.navy,
    backgroundColor: colors.blue100,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkBoxOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  consentText: {
    flex: 1,
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
})
