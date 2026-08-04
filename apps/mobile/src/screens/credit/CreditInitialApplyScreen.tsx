import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, Field } from '@/components'
import FinancePartnerLogo from '@/components/FinancePartnerLogo'
import { useApplyCreditMutation } from '@gg/shared-hooks'
import { useUserStore, useAuthStore } from '@gg/shared-stores'
import { getWorldCountryByCode } from '@gg/shared-config'

/* ------------------------------------------------------------------ */
/*  Finance partner options                                            */
/* ------------------------------------------------------------------ */
const PARTNERS = [
  {
    id: 'moneymart' as const,
    name: 'Moneymart Finance',
    tagline: 'Healthcare micro-lending specialist',
    processingTime: '24-48 hrs',
  },
  {
    id: 'equity' as const,
    name: 'Equity Bank',
    tagline: 'Trusted banking partner',
    processingTime: '48-72 hrs',
  },
]

/* ------------------------------------------------------------------ */
/*  Employment status options                                          */
/* ------------------------------------------------------------------ */
const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: 'business-owner', label: 'Business Owner' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
]

/* ------------------------------------------------------------------ */
/*  Inline icons                                                       */
/* ------------------------------------------------------------------ */
function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <View
      style={[
        st.checkBox,
        {
          backgroundColor: checked ? colors.success : colors.card,
          borderColor: checked ? colors.success : colors.border,
        },
      ]}
    >
      {checked && (
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path
            d="M2.5 6l2.5 2.5 4.5-4.5"
            stroke="#FFFFFF"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  )
}

function BlueCheck() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={10} fill={colors.blue} />
      <Path
        d="M6 10l3 3 5-5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ChevronDown() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 6l4 4 4-4"
        stroke={colors.textLight}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function CreditInitialApplyScreen() {
  const navigation = useNavigation<any>()
  const u = useUserStore(s => s.user)
  const applyMutation = useApplyCreditMutation()

  /* form state */
  const [selectedPartner, setSelectedPartner] = useState<'moneymart' | 'equity'>('moneymart')
  const [employment, setEmployment] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [consent, setConsent] = useState(false)
  const [showEmploymentPicker, setShowEmploymentPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedEmployment = EMPLOYMENT_OPTIONS.find(e => e.value === employment)

  const handleSubmit = async () => {
    const income = Number(monthlyIncome)
    const amount = Number(requestedAmount)

    /* basic validation */
    if (!employment) {
      setError('Please select your employment status')
      return
    }
    if (!monthlyIncome || isNaN(income) || income <= 0) {
      setError('Enter a valid monthly income')
      return
    }
    if (!requestedAmount || isNaN(amount) || amount < 1000 || amount > 50000) {
      setError('Requested amount must be between Ksh.1,000 and Ksh.50,000')
      return
    }
    if (!consent) {
      setError('You must confirm the information is accurate')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const residenceCountryCode = u?.countryCode ?? 'KE'
      await applyMutation.mutateAsync({
        financePartnerId: selectedPartner,
        employment,
        monthlyIncome: income,
        requestedAmount: amount,
        consent,
        residenceCountryCode,
        residenceCountryName: getWorldCountryByCode(residenceCountryCode)?.name,
        coverageType: 'self',
      })
      useAuthStore.getState().completeOnboardingStep(4)
      navigation.navigate('CreditStatus')
    } catch (err: any) {
      setError(err?.message ?? 'Unable to submit your application right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <AppBar
        title="Apply for Credit"
        subtitle="Submit your healthcare credit application"
        back
      />

      <ScrollArea gap={14} px={16} py={14}>
        {/* ============================================================ */}
        {/*  1. Finance Partner Selection                                */}
        {/* ============================================================ */}
        <MCard padding={18}>
          <Text style={st.cardTitle}>Select Your Finance Partner</Text>
          <Text style={st.cardSubtitle}>
            Choose which finance partner will process your credit application.
          </Text>

          <View style={st.partnerList}>
            {PARTNERS.map(partner => {
              const isSelected = selectedPartner === partner.id
              return (
                <Pressable
                  key={partner.id}
                  style={[
                    st.partnerCard,
                    {
                      borderColor: isSelected ? colors.blue : colors.border,
                      backgroundColor: isSelected ? colors.blue3 : colors.card,
                    },
                  ]}
                  onPress={() => setSelectedPartner(partner.id)}
                >
                  <View style={st.partnerLogoZone}>
                    <FinancePartnerLogo partnerId={partner.id} height={34} />
                    {isSelected && (
                      <View style={st.partnerCheck}>
                        <BlueCheck />
                      </View>
                    )}
                  </View>
                  <View style={st.partnerBody}>
                    <Text style={st.partnerName}>{partner.name}</Text>
                    <Text style={st.partnerTagline}>{partner.tagline}</Text>
                    <View style={st.processBadge}>
                      <Text style={st.processBadgeText}>
                        Processing: {partner.processingTime}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </MCard>

        {/* ============================================================ */}
        {/*  2. Application Form                                         */}
        {/* ============================================================ */}
        <MCard padding={18}>
          <Text style={st.cardTitle}>Application Details</Text>
          <Text style={st.cardSubtitle}>
            Provide details about your financial situation so the finance partner
            can assess your application.
          </Text>

          {/* Employment Status (dropdown) */}
          <View style={{ marginBottom: 12 }}>
            <View style={st.labelRow}>
              <Text style={st.fieldLabel}>Employment Status</Text>
              <Text style={st.asterisk}> *</Text>
            </View>
            <Pressable
              style={st.dropdownBtn}
              onPress={() => setShowEmploymentPicker(!showEmploymentPicker)}
            >
              <Text
                style={[
                  st.dropdownText,
                  !employment && { color: colors.textLight },
                ]}
                numberOfLines={1}
              >
                {selectedEmployment?.label ?? 'Select employment status'}
              </Text>
              <ChevronDown />
            </Pressable>

            {showEmploymentPicker && (
              <View style={st.dropdownList}>
                {EMPLOYMENT_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      st.dropdownOption,
                      employment === opt.value && { backgroundColor: colors.blue3 },
                    ]}
                    onPress={() => {
                      setEmployment(opt.value)
                      setShowEmploymentPicker(false)
                    }}
                  >
                    <Text
                      style={[
                        st.dropdownOptionText,
                        employment === opt.value && {
                          color: colors.blue,
                          fontFamily: fontWeights.bold,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Monthly Income */}
          <Field
            label="Monthly Income"
            placeholder="e.g. 25000"
            keyboardType="numeric"
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            required
            hint="Net monthly income in Ksh."
          />

          {/* Requested Amount */}
          <Field
            label="Requested Amount"
            placeholder="e.g. 10000"
            keyboardType="numeric"
            value={requestedAmount}
            onChangeText={setRequestedAmount}
            required
            hint="Ksh.1,000 – Ksh.50,000"
          />

          {/* Consent checkbox */}
          <Pressable
            style={[
              st.consentRow,
              {
                backgroundColor: consent ? colors.successBg : colors.bg,
                borderColor: consent ? colors.success : colors.border,
              },
            ]}
            onPress={() => setConsent(!consent)}
          >
            <CheckSquare checked={consent} />
            <Text style={st.consentText}>
              I confirm the information provided is accurate and authorise the
              selected finance partner to process my credit application and
              perform a credit assessment.
            </Text>
          </Pressable>

          {/* Warning note */}
          <View style={st.warningNote}>
            <Text style={st.warningText}>
              <Text style={{ fontFamily: fontWeights.bold }}>Note: </Text>
              Your application will be reviewed by the selected finance partner.
              You will receive a notification once a decision has been made. For
              now, GG'APP admin reviews and approves applications.
            </Text>
          </View>

          {/* Error */}
          {error && <Text style={st.errorText}>{error}</Text>}
        </MCard>

        {/* ============================================================ */}
        {/*  3. Action Buttons                                           */}
        {/* ============================================================ */}
        <View style={st.btnRow}>
          <MBtn
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => navigation.goBack()}
          >
            Cancel
          </MBtn>
          <MBtn
            variant="primary"
            style={{ flex: 2 }}
            disabled={loading}
            onPress={handleSubmit}
          >
            {loading ? 'Submitting...' : 'Submit Application →'}
          </MBtn>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default CreditInitialApplyScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const st = StyleSheet.create({
  /* card headings */
  cardTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 17,
    marginBottom: 16,
  },

  /* partner selection */
  partnerList: {
    gap: 10,
  },
  partnerCard: {
    borderWidth: 1.5,
    borderRadius: radii.large,
    overflow: 'hidden',
  },
  partnerLogoZone: {
    height: 76,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  partnerCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  partnerBody: {
    padding: 14,
    gap: 2,
  },
  partnerName: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  partnerTagline: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  processBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    marginTop: 4,
  },
  processBadgeText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },

  /* fields */
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.text,
  },
  asterisk: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
    color: colors.error,
  },

  /* dropdown */
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.text,
    flex: 1,
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionText: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.text,
  },

  /* consent */
  consentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radii.default,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 19,
  },

  /* warning note */
  warningNote: {
    backgroundColor: colors.warningBg,
    borderRadius: radii.default,
    padding: 14,
  },
  warningText: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.warning,
    lineHeight: 18,
  },

  /* error */
  errorText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.error,
    marginTop: 8,
  },

  /* buttons */
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
})
