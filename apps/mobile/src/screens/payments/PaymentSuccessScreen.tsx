import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, MCard, MBtn } from '@/components'
import {
  useCreditStatus,
  usePatientAppointments,
  usePatientInvoice,
  useSubmitReviewMutation,
} from '@gg/shared-hooks'
import { getCountryByCode } from '@gg/shared-config'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency, formatDate, getAppointmentDisplayStatus } from '@gg/shared-utils'
import type { InvoicesStackParamList } from '@/navigation/types'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { Appointment, PatientInvoice } from '@gg/shared-types'

type SuccessRoute = RouteProp<InvoicesStackParamList, 'PaymentSuccess'>
type SuccessNav = NativeStackNavigationProp<InvoicesStackParamList, 'PaymentSuccess'>

/* ---------- Receipt Row ---------- */

function ReceiptRow({
  label,
  value,
  isLast,
}: {
  label: string
  value: string
  isLast?: boolean
}) {
  return (
    <View
      style={[
        receiptStyles.row,
        !isLast && receiptStyles.rowBorder,
      ]}
    >
      <Text style={receiptStyles.label}>{label}</Text>
      <Text style={receiptStyles.value}>{value}</Text>
    </View>
  )
}

const receiptStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.textSub,
  },
  value: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
})

/* ---------- Success Checkmark ---------- */

function SuccessCheck() {
  return (
    <View style={s.checkCircle}>
      <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
        <Path
          d="M8 20l8 8 16-14"
          stroke={colors.success}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

/* ---------- Main Screen ---------- */

export function PaymentSuccessScreen() {
  const route = useRoute<SuccessRoute>()
  const navigation = useNavigation<SuccessNav>()
  const {
    invoiceId,
    amount,
    walletAmountPaid: navWalletPaid,
    offAppAmountDue: navOffAppDue,
    provider: providerName,
  } = route.params ?? {}
  const user = useUserStore(s => s.user)
  const country = getCountryByCode(user?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'
  const { data: invoiceData } = usePatientInvoice(invoiceId)
  const { data: creditData } = useCreditStatus()
  const { data: appointmentsData } = usePatientAppointments()
  const submitReview = useSubmitReviewMutation()
  const invoice = invoiceData as PatientInvoice | undefined

  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewSkipped, setReviewSkipped] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const today = new Date()
  const formattedDate = formatDate(invoice?.date ?? today.toISOString())
  const resolvedProvider = invoice?.provider?.name ?? providerName ?? 'Healthcare Provider'
  const serviceNames = invoice?.services?.map(service => service.name).filter(Boolean) ?? []
  const serviceLabel = serviceNames.length > 0
    ? serviceNames.join(', ')
    : 'Healthcare Service'
  const serviceFor = invoice?.serviceFor?.name ?? invoice?.billedTo?.name ?? user?.name ?? 'Patient'
  const invoiceAmount = invoice?.amount ?? amount ?? 0
  const walletPaid = navWalletPaid ?? invoice?.walletAmountPaid ?? invoiceAmount
  const offAppDue = navOffAppDue ?? invoice?.offAppAmountDue ?? 0
  const isPartialPay = offAppDue > 0
  const paymentRef =
    invoice?.paymentRef ??
    creditData?.creditAccountRef ??
    user?.creditAccountRef ??
    `TXN-${(invoiceId ?? 'UNKNOWN').slice(0, 8).toUpperCase()}`
  const providerAddress = invoice?.provider?.address ?? ''
  const appointments = [
    ...(appointmentsData?.upcoming ?? []),
    ...(appointmentsData?.past ?? []),
  ]
  const hasCompletedBooking = appointments.some(
    (apt: Appointment) =>
      invoice?.providerId != null &&
      String(apt.providerId) === String(invoice.providerId) &&
      getAppointmentDisplayStatus(apt) === 'completed',
  )
  const canReview =
    hasCompletedBooking &&
    !invoice?.reviewSubmitted &&
    !reviewSubmitted &&
    !reviewSkipped
  const receiptRows = [
    { label: 'Payment Ref', value: paymentRef },
    { label: 'Invoice', value: invoiceId ?? '---' },
    { label: 'Service Provider', value: resolvedProvider },
    { label: 'Invoice Total', value: formatCurrency(invoiceAmount, currency) },
    { label: "Paid via GG'APP", value: formatCurrency(walletPaid, currency) },
    ...(isPartialPay
      ? [{ label: 'Off-app due', value: formatCurrency(offAppDue, currency) }]
      : []),
    { label: 'Service', value: serviceLabel },
    { label: 'For', value: serviceFor },
    { label: 'Authorized On', value: formattedDate },
    { label: 'Status', value: isPartialPay ? 'Partially Paid' : 'Paid' },
  ]

  const handleSubmitReview = () => {
    const providerId = invoice?.providerId
    if (!providerId) {
      setReviewError('Unable to identify the provider for this invoice.')
      return
    }
    setReviewError(null)
    submitReview.mutate(
      {
        providerId,
        invoiceId: invoice?.id ?? invoiceId ?? '',
        rating,
        text: reviewText.trim(),
        providerName: resolvedProvider,
      },
      {
        onSuccess: () => setReviewSubmitted(true),
        onError: (err: unknown) => {
          setReviewError(err instanceof Error ? err.message : 'Unable to submit review.')
        },
      },
    )
  }

  return (
    <Screen bg={colors.bg}>
      <ScrollArea gap={20} px={20} py={32}>
        <View style={s.center}>
          {/* Success Circle */}
          <SuccessCheck />

          {/* Title */}
          <Text style={s.title}>
            {isPartialPay ? 'Partial Payment Confirmed' : 'Payment Authorized!'}
          </Text>

          {/* Subtitle */}
          <Text style={s.subtitle}>
            {isPartialPay
              ? `Paid ${formatCurrency(walletPaid, currency)} from your GG'APP allocation. Settle the remaining ${formatCurrency(offAppDue, currency)} directly with ${resolvedProvider}.`
              : 'Your payment has been successfully authorized and will be processed.'}
          </Text>
        </View>

        {/* Receipt Card */}
        <MCard padding={20}>
          {/* Amount Header */}
          <Text style={s.receiptLabel}>Paid via GG'APP</Text>
          <Text style={s.receiptAmount}>
            {formatCurrency(walletPaid, currency)}
          </Text>

          {providerAddress ? (
            <Text style={s.receiptMeta}>
              {providerAddress}
            </Text>
          ) : null}

          <View style={s.divider} />

          {/* Detail Rows */}
          {receiptRows.map((row, i) => (
            <ReceiptRow
              key={row.label}
              label={row.label}
              value={row.value}
              isLast={i === receiptRows.length - 1}
            />
          ))}
        </MCard>

        {isPartialPay && (
          <MCard padding={14}>
            <Text style={s.offAppNote}>
              <Text style={s.offAppNoteStrong}>Off-app balance: </Text>
              Settle {formatCurrency(offAppDue, currency)} with {resolvedProvider} outside the app.
            </Text>
          </MCard>
        )}

        {canReview && (
          <MCard padding={16}>
            <Text style={s.reviewTitle}>Rate your experience</Text>
            <Text style={s.reviewSub}>How was your visit with {resolvedProvider}?</Text>
            <View style={s.ratingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Text
                  key={star}
                  style={s.star}
                  onPress={() => setRating(star)}
                >
                  {star <= rating ? '★' : '☆'}
                </Text>
              ))}
            </View>
            <TextInput
              style={s.reviewInput}
              placeholder="Share your experience (optional)"
              placeholderTextColor={colors.textLight}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {reviewError ? <Text style={s.reviewError}>{reviewError}</Text> : null}
            <View style={s.reviewBtnRow}>
              <MBtn variant="secondary" onPress={() => setReviewSkipped(true)} style={{ flex: 1 }}>
                Skip
              </MBtn>
              <MBtn
                variant="primary"
                onPress={handleSubmitReview}
                disabled={submitReview.isPending}
                style={{ flex: 2 }}
              >
                {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
              </MBtn>
            </View>
          </MCard>
        )}

        {reviewSubmitted && (
          <MCard padding={16}>
            <Text style={s.reviewThanks}>Thank you for your review!</Text>
          </MCard>
        )}

        {/* Action Buttons */}
        <View style={s.btnRow}>
          <MBtn
            variant="secondary"
            fullWidth
            onPress={() => navigation.navigate('InvoiceList')}
            style={s.btnHalf}
          >
            View Invoices
          </MBtn>
          <MBtn
            variant="primary"
            fullWidth
            onPress={() =>
              navigation.getParent()?.navigate('HomeTab', { screen: 'Dashboard' })
            }
            style={s.btnHalf}
          >
            Back to Dashboard
          </MBtn>
        </View>

        <MBtn
          variant="secondary"
          fullWidth
          onPress={() =>
            navigation.getParent()?.navigate('WalletTab', { screen: 'TransactionHistory' })
          }
        >
          View Transactions
        </MBtn>
      </ScrollArea>
    </Screen>
  )
}

const s = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingTop: 20,
  },

  /* Check circle */
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successBg,
    borderWidth: 3,
    borderColor: 'rgba(34,201,138,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  /* Typography */
  title: {
    fontFamily: fontWeights.extraBold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 8,
  },

  /* Receipt card */
  receiptLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 11,
    color: colors.textSub,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  receiptAmount: {
    fontFamily: fontWeights.extraBold,
    fontSize: 28,
    color: colors.blue,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  receiptMeta: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 4,
  },

  /* Buttons */
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnHalf: {
    flex: 1,
  },

  offAppNote: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.warning,
    lineHeight: 18,
  },
  offAppNoteStrong: {
    fontFamily: fontWeights.bold,
    color: colors.warning,
  },
  reviewTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  reviewSub: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    color: colors.textSub,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  star: {
    fontSize: 28,
    color: colors.warning,
  },
  reviewInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
    marginBottom: 10,
  },
  reviewError: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.error,
    marginBottom: 8,
  },
  reviewBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reviewThanks: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.success,
    textAlign: 'center',
  },
})

export default PaymentSuccessScreen
