import React, { useMemo, useState } from 'react'
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
import { getCountryByCode, getFinancePartnerSummary } from '@gg/shared-config'
import FinancePartnerLogo from '@/components/FinancePartnerLogo'
import type { Patient } from '@gg/shared-types'

const REASON_OPTIONS = [
  { value: 'upcoming-care', label: 'Upcoming medical procedure or treatment' },
  { value: 'family', label: 'Additional cover for a beneficiary' },
  { value: 'higher-costs', label: 'Expected higher healthcare costs this year' },
  { value: 'emergency-buffer', label: 'Emergency buffer for unforeseen care' },
  { value: 'other', label: 'Other (explained below)' },
]

const ADMIN_FEE_RATE = 0.025
const MIN_INCREASE = 500
const MAX_TOTAL_LIMIT = 50000

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

export function CreditIncreaseScreen() {
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

  const partner = u?.financePartnerId ? getFinancePartnerSummary(u.financePartnerId) : undefined

  const pendingReview = u?.creditStatus === 'pending'
  const pendingIncrease =
    pendingReview && creditData?.application?.type === 'increase'

  const [increaseAmount, setIncreaseAmount] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const increaseNum = Number(increaseAmount)
  const incomeNum = Number(monthlyIncome)
  const newLimit = creditLimit + (Number.isFinite(increaseNum) ? increaseNum : 0)
  const selectedReason = REASON_OPTIONS.find(r => r.value === reason)

  // Boolean(): a blank field is '' and must never reach JSX as a child of <View>.
  const showNextSteps = useMemo(() => {
    return Boolean(
      increaseAmount &&
      monthlyIncome &&
      reason &&
      !isNaN(increaseNum) &&
      increaseNum >= MIN_INCREASE &&
      !isNaN(incomeNum) &&
      incomeNum > 0 &&
      increaseNum + creditLimit <= MAX_TOTAL_LIMIT
    )
  }, [creditLimit, increaseAmount, increaseNum, incomeNum, monthlyIncome, reason])

  const handleSubmit = async () => {
    if (!increaseAmount || isNaN(increaseNum) || increaseNum < MIN_INCREASE) {
      setError(`Minimum increase is ${formatCurrency(MIN_INCREASE, currency)}`)
      return
    }
    if (increaseNum + creditLimit > MAX_TOTAL_LIMIT) {
      setError(`Requested total limit cannot exceed ${formatCurrency(MAX_TOTAL_LIMIT, currency)}`)
      return
    }
    if (!monthlyIncome || isNaN(incomeNum) || incomeNum <= 0) {
      setError('Enter your current monthly income')
      return
    }
    if (!reason) {
      setError('Please select a reason for increase')
      return
    }
    if (!consent) {
      setError('You must confirm this request and acknowledge the admin fee')
      return
    }

    setError(null)
    setLoading(true)

    try {
      await increaseMutation.mutateAsync({
        increaseAmount: increaseNum,
        monthlyIncome: incomeNum,
        reason,
        notes: notes.trim() || undefined,
        consent,
      })
      navigation.navigate('CreditStatus', { requestType: 'increase' })
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
        <MCard padding={16}>
          {partner ? (
            <>
              <Text style={s.partnerLabel}>Your Finance Partner</Text>
              <View style={s.partnerRow}>
                <View style={s.partnerLogoZone}>
                  <FinancePartnerLogo partnerId={partner.id} height={26} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.partnerName}>{partner.name}</Text>
                  <Text style={s.partnerDesc}>
                    Limit increases follow the same review process as your original
                    application — {partner.shortName} reassesses and approves the request.
                  </Text>
                  <View style={s.linkedBadge}>
                    <Text style={s.linkedBadgeText}>Linked to your active credit line</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={s.partnerRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.partnerName}>Accredited Finance Partner</Text>
                <Text style={s.partnerDesc}>
                  Limit increases follow the same review process as your original
                  application — your finance partner reassesses and approves the request.
                </Text>
                <View style={s.linkedBadge}>
                  <Text style={s.linkedBadgeText}>Linked to your active credit line</Text>
                </View>
              </View>
            </View>
          )}
        </MCard>

        {pendingReview && (
          <MCard padding={18} style={s.pendingCard}>
            <Text style={s.pendingTitle}>
              {pendingIncrease ? 'Increase request under review' : 'Credit request under review'}
            </Text>
            <Text style={s.pendingDesc}>
              You already have a pending request with the finance partner team.
              You can submit a new increase once a decision is made.
            </Text>
            <MBtn
              variant="primary"
              sm
              onPress={() =>
                navigation.navigate('CreditStatus', {
                  requestType: pendingIncrease ? 'increase' : undefined,
                })
              }
            >
              View Status
            </MBtn>
          </MCard>
        )}

        <MCard padding={16}>
          {/* One summary instead of four boxed figures that repeated the wallet. */}
          <Text style={s.cardTitle}>Your current credit</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryAmount}>{formatCurrency(creditLimit, currency)}</Text>
            <Text style={s.summaryLabel}>limit</Text>
          </View>
          <Text style={s.summaryDetail}>
            {formatCurrency(creditAvailable, currency)} available · {formatCurrency(inUse, currency)} in use
          </Text>
          <Text style={s.summaryDetail}>Account ref {refNum}</Text>
        </MCard>

        <MCard padding={18} style={pendingReview ? s.formDisabled : undefined}>
          <Text style={s.cardTitle}>Increase Request Details</Text>
          <Text style={s.cardSubtitle}>
            Tell your finance partner how much additional credit you need.
            They will reassess based on your current limit and repayment history.
          </Text>

          <View>
            <View>
              <Field
                label="Increase amount"
                placeholder="e.g. 2500"
                keyboardType="numeric"
                value={increaseAmount}
                onChangeText={setIncreaseAmount}
                required
                hint={`Minimum ${formatCurrency(MIN_INCREASE, currency)} above current limit`}
                editable={!pendingReview}
              />
            </View>
            <View>
              <Field
                label="Current monthly income"
                placeholder="e.g. 1200"
                keyboardType="numeric"
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                required
                hint="Net monthly income for reassessment"
                editable={!pendingReview}
              />
            </View>
          </View>

          {Boolean(increaseAmount) && !isNaN(increaseNum) && increaseNum >= MIN_INCREASE && (
            <View style={s.previewBanner}>
              <Text style={s.previewLabel}>New limit if approved</Text>
              <Text style={s.previewValue}>{formatCurrency(newLimit, currency)}</Text>
            </View>
          )}

          <View style={{ marginBottom: 12 }}>
            <View style={s.labelRow}>
              <Text style={s.fieldLabel}>Reason for Increase</Text>
              <Text style={s.asterisk}> *</Text>
            </View>
            <Pressable
              style={s.dropdownBtn}
              disabled={pendingReview}
              onPress={() => setShowReasonPicker(!showReasonPicker)}
            >
              <Text
                style={[s.dropdownText, !reason && { color: colors.textLight }]}
                numberOfLines={1}
              >
                {selectedReason?.label ?? 'Select a reason'}
              </Text>
              <ChevronDown />
            </Pressable>

            {showReasonPicker && !pendingReview && (
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

          <View style={{ marginBottom: 12 }}>
            <Text style={s.fieldLabel}>Additional Notes (optional)</Text>
            <TextInput
              style={s.textArea}
              placeholder="Briefly describe your upcoming healthcare needs..."
              placeholderTextColor={colors.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!pendingReview}
            />
          </View>

          <View style={s.feeCard}>
            <Text style={s.feeTitle}>Platform Admin Fee</Text>
            <Text style={s.feeDesc}>
              By submitting this increase request, you acknowledge that a 2.5% platform
              administration fee will be deducted from any newly approved increase amount
              and remitted to GG'APP. The remaining balance will be added to your wallet
              for use with verified healthcare providers.
            </Text>

            {Boolean(increaseAmount) && !isNaN(increaseNum) && increaseNum > 0 && (
              <View style={s.feeBreakdown}>
                <View style={s.feeRow}>
                  <Text style={s.feeRowLabel}>Increase amount</Text>
                  <Text style={s.feeRowValue}>{formatCurrency(increaseNum, currency)}</Text>
                </View>
                <View style={s.feeRow}>
                  <Text style={s.feeRowLabel}>Est. admin fee (2.5%)</Text>
                  <Text style={s.feeRowValue}>
                    {formatCurrency(increaseNum * ADMIN_FEE_RATE, currency)}
                  </Text>
                </View>
                <View style={s.feeDivider} />
                <View style={s.feeRow}>
                  <Text style={[s.feeRowLabel, { fontFamily: fontWeights.bold, color: colors.text }]}>
                    Est. added to wallet
                  </Text>
                  <Text style={s.feeNetValue}>
                    {formatCurrency(increaseNum * (1 - ADMIN_FEE_RATE), currency)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Pressable
            style={[
              s.consentRow,
              {
                backgroundColor: consent ? colors.successBg : colors.bg,
                borderColor: consent ? colors.success : colors.border,
              },
            ]}
            disabled={pendingReview}
            onPress={() => setConsent(!consent)}
          >
            <CheckSquare checked={consent} />
            <Text style={s.consentText}>
              I confirm this increase request is accurate, authorise my finance
              partner to review my account, and acknowledge
              the 2.5% GG'APP platform admin fee on any newly approved increase.
            </Text>
          </Pressable>

          {showNextSteps && !pendingReview && (
            <View style={s.nextStepsCard}>
              <Text style={s.nextStepsTitle}>What Happens Next</Text>
              {[
                'Your increase request is sent to the finance partner team for review.',
                'You will receive a notification when a decision is made.',
                'Once approved, your limit and available balance are updated and ready to use at verified providers.',
              ].map((text, idx) => (
                <View key={idx} style={s.nextStepRow}>
                  <View style={s.nextStepBadge}>
                    <Text style={s.nextStepBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={s.nextStepText}>{text}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.warningNote}>
            <Text style={s.warningText}>
              <Text style={{ fontFamily: fontWeights.bold }}>Note: </Text>
              For now, GG'APP admin reviews and approves increase requests. Direct finance
              partner approval will be enabled once partner APIs are connected. Your current
              limit stays active while the request is reviewed.
            </Text>
          </View>

        </MCard>


        <View style={{ height: 8 }} />
      </ScrollArea>

      <ActionBar error={error}>
        <MBtn variant="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()}>
          Cancel
        </MBtn>
        <MBtn
          variant="primary"
          style={{ flex: 2 }}
          disabled={loading || pendingReview}
          onPress={handleSubmit}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </MBtn>
      </ActionBar>
    </Screen>
  )
}

export default CreditIncreaseScreen

const s = StyleSheet.create({
  partnerRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  partnerLabel: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    marginBottom: 10,
  },
  partnerLogoZone: {
    width: 112,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
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
  linkedBadge: {
    backgroundColor: colors.blue3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  linkedBadgeText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
  },
  pendingCard: {
    backgroundColor: colors.blue3,
    borderWidth: 1.5,
    borderColor: 'rgba(47,155,255,0.28)',
    gap: 8,
  },
  pendingTitle: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },
  pendingDesc: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 19,
    marginBottom: 6,
  },
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
  formDisabled: { opacity: 0.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  summaryAmount: { fontFamily: fontWeights.extraBold, fontSize: 22, color: colors.text },
  summaryLabel: { fontFamily: fontWeights.medium, fontSize: 14, color: colors.textSub },
  summaryDetail: { fontFamily: fontWeights.regular, fontSize: 13, lineHeight: 19, color: colors.textSub, marginTop: 4 },
  labelRow: { flexDirection: 'row', marginBottom: 6 },
  fieldLabel: { fontFamily: fontWeights.bold, fontSize: 12, color: colors.text },
  asterisk: { fontFamily: fontWeights.bold, fontSize: 12, color: colors.error },
  previewBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: 'rgba(47,155,255,0.2)',
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  previewLabel: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, flex: 1 },
  previewValue: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    letterSpacing: -0.3,
  },
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
  dropdownText: { fontSize: 14, fontFamily: fontWeights.regular, color: colors.text, flex: 1 },
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
  dropdownOptionText: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.text },
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
  feeCard: {
    padding: 16,
    backgroundColor: colors.bg,
    borderRadius: radii.default,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
  },
  feeTitle: {
    fontSize: 12,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    marginBottom: 8,
  },
  feeDesc: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
  },
  feeBreakdown: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeRowLabel: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub },
  feeRowValue: { fontSize: 12, fontFamily: fontWeights.bold, color: colors.text },
  feeDivider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  feeNetValue: { fontSize: 12, fontFamily: fontWeights.extraBold, color: colors.navy },
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
  nextStepsCard: {
    padding: 18,
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: 'rgba(47,155,255,0.2)',
    marginBottom: 12,
    gap: 10,
  },
  nextStepsTitle: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.navy,
    marginBottom: 2,
  },
  nextStepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  nextStepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  nextStepBadgeText: { fontSize: 10, fontFamily: fontWeights.extraBold, color: '#FFFFFF' },
  nextStepText: { flex: 1, fontSize: 12, fontFamily: fontWeights.regular, color: colors.blueInk, lineHeight: 19 },
  warningNote: { backgroundColor: colors.warningBg, borderRadius: radii.default, padding: 14 },
  warningText: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.warning, lineHeight: 18 },
})
