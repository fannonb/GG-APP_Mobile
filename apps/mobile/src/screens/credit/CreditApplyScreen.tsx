import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  } from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, Field, ActionBar } from '@/components'
import { useCreditStatus, useIncreaseCreditMutation } from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency } from '@gg/shared-utils'
import { getCountryByCode } from '@gg/shared-config'
import type { Patient } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Reason dropdown options                                            */
/* ------------------------------------------------------------------ */
const REASON_OPTIONS = [
  { value: 'upcoming-care', label: 'Upcoming medical procedure or treatment' },
  { value: 'family', label: 'Additional cover for a beneficiary' },
  { value: 'higher-costs', label: 'Expected higher healthcare costs this year' },
  { value: 'emergency-buffer', label: 'Emergency buffer for unforeseen care' },
  { value: 'other', label: 'Other (explained below)' },
]

/* ------------------------------------------------------------------ */
/*  Chevron-down icon for dropdown                                     */
/* ------------------------------------------------------------------ */
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
/*  Check-square icon for consent                                      */
/* ------------------------------------------------------------------ */
function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <View
      style={[
        s.checkBox,
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

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */
export function CreditApplyScreen() {
  const navigation = useNavigation<any>()
  const u = useUserStore(s => s.user) as Patient | undefined
  const { data: creditData } = useCreditStatus()
  const increaseMutation = useIncreaseCreditMutation()

  const country = getCountryByCode(u?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'
  const creditLimit = u?.creditLimit ?? 0
  const creditAvailable = u?.creditAvailable ?? 0
  const inUse = creditLimit - creditAvailable
  const refNum = u?.creditAccountRef ?? creditData?.creditAccountRef ?? 'Pending'

  /* form state */
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedReason = REASON_OPTIONS.find(r => r.value === reason)

  const handleSubmit = async () => {
    const amt = Number(increaseAmount)
    const inc = Number(monthlyIncome)

    /* basic validation */
    if (!increaseAmount || isNaN(amt) || amt < 500) {
      setError(`Minimum increase is ${formatCurrency(500, currency)}`)
      return
    }
    if (!monthlyIncome || isNaN(inc) || inc <= 0) {
      setError('Enter a valid monthly income')
      return
    }
    if (!reason) {
      setError('Please select a reason for increase')
      return
    }
    if (!consent) {
      setError('You must confirm this request')
      return
    }

    setError(null)
    setLoading(true)

    try {
      await increaseMutation.mutateAsync({
        increaseAmount: amt,
        monthlyIncome: inc,
        reason,
        notes: notes.trim() || undefined,
        consent,
      })
      navigation.navigate('CreditStatus')
    } catch (err: any) {
      setError(err?.message ?? 'Unable to submit your increase request right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <AppBar
        title="Request Limit Increase"
        subtitle="Increase your approved healthcare credit"
        back
      />

      <ScrollArea gap={14} px={16} py={14}>
        {/* ====== 1. Finance Partner Note ====== */}
        <MCard padding={16}>
          <View style={s.partnerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.partnerName}>Financing Partner</Text>
              <Text style={s.partnerDesc}>
                Limit increases follow the same review process as your original
                application, carried out by your accredited finance partner.
              </Text>
            </View>
          </View>
        </MCard>

        {/* ====== 2. Current Credit Card ====== */}
        <MCard padding={16}>
          <Text style={s.cardTitle}>Your Current Credit</Text>

          <View style={s.creditGrid}>
            {[
              { label: 'Approved Limit', value: formatCurrency(creditLimit, currency), color: colors.navy },
              { label: 'Available', value: formatCurrency(creditAvailable, currency), color: colors.blueInk },
              { label: 'In Use', value: formatCurrency(inUse, currency), color: colors.textSub },
              { label: 'Account Ref', value: refNum, color: colors.text, mono: true },
            ].map(item => (
              <View key={item.label} style={s.creditCell}>
                <Text style={s.creditCellLabel}>{item.label}</Text>
                <Text
                  style={[
                    s.creditCellValue,
                    { color: item.color },
                    item.mono && { fontFamily: fontWeights.semiBold, fontSize: 13 },
                  ]}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </MCard>

        {/* ====== 3. Increase Request Form ====== */}
        <MCard padding={18}>
          <Text style={s.cardTitle}>Increase Request Details</Text>
          <Text style={s.cardSubtitle}>
            Tell your finance partner how much additional credit you need. They
            will reassess based on your current limit and repayment history.
          </Text>

          {/* 2-col fields */}
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="Increase Amount"
                placeholder="e.g. 2500"
                keyboardType="numeric"
                value={increaseAmount}
                onChangeText={setIncreaseAmount}
                required
                hint={`Minimum ${formatCurrency(500, currency)}`}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Current Monthly Income"
                placeholder="e.g. 1200"
                keyboardType="numeric"
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                required
                hint="Net monthly income"
              />
            </View>
          </View>

          {/* Reason dropdown (Pressable styled like Field) */}
          <View style={{ marginBottom: 12 }}>
            <View style={s.labelRow}>
              <Text style={s.fieldLabel}>Reason for Increase</Text>
              <Text style={s.asterisk}> *</Text>
            </View>
            <Pressable
              style={s.dropdownBtn}
              onPress={() => setShowReasonPicker(!showReasonPicker)}
            >
              <Text
                style={[
                  s.dropdownText,
                  !reason && { color: colors.textLight },
                ]}
                numberOfLines={1}
              >
                {selectedReason?.label ?? 'Select a reason'}
              </Text>
              <ChevronDown />
            </Pressable>

            {showReasonPicker && (
              <View style={s.dropdownList}>
                {REASON_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      s.dropdownOption,
                      reason === opt.value && { backgroundColor: colors.blue3 },
                    ]}
                    onPress={() => {
                      setReason(opt.value)
                      setShowReasonPicker(false)
                    }}
                  >
                    <Text
                      style={[
                        s.dropdownOptionText,
                        reason === opt.value && { color: colors.blueInk, fontFamily: fontWeights.bold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Additional notes */}
          <View style={{ marginBottom: 12 }}>
            <Text style={s.fieldLabel}>Additional Notes</Text>
            <TextInput
              style={s.textArea}
              placeholder="Briefly describe your upcoming healthcare needs..."
              placeholderTextColor={colors.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Consent checkbox */}
          <Pressable
            style={[
              s.consentRow,
              {
                backgroundColor: consent ? colors.successBg : colors.bg,
                borderColor: consent ? colors.success : colors.border,
              },
            ]}
            onPress={() => setConsent(!consent)}
          >
            <CheckSquare checked={consent} />
            <Text style={s.consentText}>
              I confirm this increase request is accurate and authorise
              my finance partner to review my account and perform a credit
              reassessment.
            </Text>
          </Pressable>

          {/* Warning note */}
          <View style={s.warningNote}>
            <Text style={s.warningText}>
              <Text style={{ fontFamily: fontWeights.bold }}>Note: </Text>
              For now, GG'APP admin reviews and approves increase requests.
              Direct finance partner approval will be enabled once partner APIs
              are connected.
            </Text>
          </View>

        </MCard>


        {/* Bottom spacer */}
        <View style={{ height: 8 }} />
      </ScrollArea>

      <ActionBar error={error}>
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
          {loading ? 'Submitting...' : 'Submit Request'}
        </MBtn>
      </ActionBar>
    </Screen>
  )
}

export default CreditApplyScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* partner card */
  partnerRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  partnerName: {
    fontSize: 14,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    marginBottom: 4,
  },
  partnerDesc: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 17,
    marginBottom: 8,
  },

  /* card title */
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

  /* 2x2 credit grid */
  creditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  creditCell: {
    width: '47%',
    backgroundColor: colors.bg,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  creditCellLabel: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.textLight,
    marginBottom: 6,
  },
  creditCellValue: {
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    letterSpacing: -0.3,
  },

  /* fields */
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
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

  /* text area */
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: colors.card,
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
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

  /* bottom buttons */
})
