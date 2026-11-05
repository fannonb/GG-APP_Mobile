import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, PageTitle, MCard, MBtn, LoadError } from '@/components'
import { useCreditStatus } from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency, formatDate } from '@gg/shared-utils'
import { getCountryByCode, getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@gg/shared-config'
import type { CreditApplication, CreditStatusResponse, Patient } from '@gg/shared-types'
import { creditDecision } from '@/lib/patient-parity'
import type { WalletScreenProps } from '@/navigation/types'
import { EmptyCreditStatusScreen } from './EmptyCreditStatusScreen'

/* ------------------------------------------------------------------ */
/*  Timeline data builder                                              */
/* ------------------------------------------------------------------ */
function buildTimeline(application: CreditApplication | null, creditStatus: CreditStatusResponse['creditStatus'] | undefined, isIncrease: boolean, partnerName: string) {
  const decision = creditDecision(application, creditStatus)
  const isApproved = decision === 'approved'
  const decided = isApproved || decision === 'declined'

  // An approved account was necessarily submitted, even when the application
  // record itself is missing (e.g. approved directly by an admin).
  const submitted = !!application || isApproved
  const submittedDate = application?.submittedAt
    ? formatDate(application.submittedAt)
    : submitted ? '' : 'Pending'

  const reviewedDate = application?.reviewedAt
    ? formatDate(application.reviewedAt)
    : ''

  if (isIncrease) {
    return [
      { label: 'Increase Request Submitted', date: submittedDate, done: submitted },
      { label: `${partnerName} Review`, date: decided ? reviewedDate : 'In progress...', done: decided },
      { label: decision === 'declined' ? 'Request Declined' : 'Allocation Updated', date: decided ? reviewedDate : '', done: decided },
    ]
  }

  return [
    {
      label: 'Application Submitted',
      date: submittedDate,
      done: submitted,
    },
    {
      label: `${partnerName} Review`,
      date: decided ? reviewedDate : 'In progress...',
      done: decided,
    },
    {
      label: decision === 'declined' ? 'Application Declined' : 'Allocation Decision',
      date: decided ? reviewedDate : '',
      done: decided,
    },
    {
      label: 'Balance Loaded',
      date: isApproved ? reviewedDate : '',
      done: isApproved,
    },
  ].filter(step => decision !== 'declined' || step.label !== 'Balance Loaded')
}

/* ------------------------------------------------------------------ */
/*  Small check-circle icon (inline)                                   */
/* ------------------------------------------------------------------ */
function TimelineCheck() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M3 7l3 3 5-5"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */
export function CreditStatusScreen({ route }: WalletScreenProps<'CreditStatus'>) {
  const navigation = useNavigation<any>()
  const u = useUserStore(s => s.user) as Patient | undefined
  const { data: creditData, isLoading, isError, isFetching, refetch } = useCreditStatus()
  const currency = getCountryByCode(u?.countryCode ?? '')?.currencySymbol ?? ''

  const isIncrease = route.params?.requestType
    ? route.params.requestType === 'increase'
    : creditData?.application?.type === 'increase'

  const application = creditData?.application ?? null
  const accountStatus = creditData?.creditStatus ?? u?.creditStatus
  const decision = creditDecision(application, accountStatus)
  const isApproved = decision === 'approved'
  const isDeclined = decision === 'declined'
  const partnerId = application?.financePartnerId ?? creditData?.financePartnerId ?? u?.financePartnerId ?? getFinancePartnerIdForCountry(u?.countryCode)
  const partnerName = getFinancePartnerSummary(partnerId)?.name ?? 'your finance partner'
  const decisionColor = isApproved ? colors.success : isDeclined ? colors.error : colors.warning
  const decisionBg = isApproved ? colors.successBg : isDeclined ? colors.errorBg : colors.warningBg
  const creditRef =
    application?.reference ??
    creditData?.creditAccountRef ??
    u?.creditAccountRef ??
    'Pending'

  const requestedAmount = application?.requestedAmount ?? u?.creditLimit ?? 0
  const approvedAmount =
    application?.approvedAmount ?? (isApproved && !isIncrease ? creditData?.creditLimit ?? u?.creditLimit : 0) ?? 0

  const timeline = buildTimeline(
    application,
    accountStatus,
    isIncrease,
    partnerName,
  )

  /* loading */
  if (isLoading && !creditData) {
    return (
      <Screen header="detail">
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading application status...</Text>
        </View>
      </Screen>
    )
  }

  /* fetch failed — never fall through to "you haven't applied", which would
     invite a duplicate application */
  if (isError && !creditData) {
    return (
      <Screen header="detail">
        <View style={s.errorWrap}>
          <LoadError
            title="We couldn't load your application status."
            body="Your application hasn't changed. Check your connection and try again before applying again."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </View>
      </Screen>
    )
  }

  /* empty state — render dedicated empty screen */
  if (!application && decision === 'pending') {
    return <EmptyCreditStatusScreen />
  }

  return (
    <Screen header="detail">
      <ScrollArea gap={14} px={16} py={14}>
        <PageTitle title={isIncrease ? 'Increase Request Status' : 'Application Status'} subtitle={`Ref: ${creditRef}`} />
        {/* ====== 1. Approved Banner ====== */}
        <View style={[s.banner, { backgroundColor: decisionBg }]}>
          <View style={s.bannerIconCircle}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d={isApproved ? 'M5 12l5 5L19 7' : isDeclined ? 'M6 6l12 12M18 6L6 18' : 'M12 5v8M12 17v1'}
                stroke={decisionColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: decisionColor }]}>
              {isApproved ? 'Approved' : isDeclined ? 'Declined' : decision === 'pending' ? 'Pending' : 'Under Review'}
            </Text>
            <Text style={s.bannerDesc}>
              {isApproved
                ? isIncrease
                  ? 'Your limit increase has been approved. Your updated balance is ready to use.'
                  : 'Your application has been approved and your allocation balance is ready to use.'
                : isDeclined
                  ? isIncrease ? 'Your increase request was declined. Your existing allocation limit remains unchanged.' : 'Your application was declined. Review the reason below before applying again.'
                  : `Your ${isIncrease ? 'increase request' : 'application'} is with ${partnerName} for review. You will be notified once a decision is made.`}
            </Text>
            {isDeclined && application?.declineReason ? (
              <Text style={[s.bannerDesc, { color: colors.error }]} accessibilityRole="alert">Reason: {application.declineReason}</Text>
            ) : null}

            <View style={s.bannerDetails}>
              <View style={s.bannerDetailItem}>
                <Text style={s.bannerDetailLabel}>Requested</Text>
                <Text style={s.bannerDetailValue}>
                  {formatCurrency(requestedAmount, currency)}
                </Text>
              </View>
              <View style={s.bannerDetailItem}>
                <Text style={s.bannerDetailLabel}>Approved</Text>
                <Text style={s.bannerDetailValue}>
                  {isApproved ? formatCurrency(approvedAmount, currency) : '--'}
                </Text>
              </View>
              <View style={s.bannerDetailItem}>
                <Text style={s.bannerDetailLabel}>Partner</Text>
                <Text style={s.bannerDetailValue} numberOfLines={1}>
                  {partnerName}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ====== 2. Application Timeline ====== */}
        <MCard padding={20}>
          <Text style={s.timelineTitle}>
            {isIncrease ? 'Increase Request Timeline' : 'Application Timeline'}
          </Text>

          <View style={s.timelineWrap}>
            {timeline.map((step, i) => {
              const isLast = i === timeline.length - 1

              return (
                <View key={step.label} style={s.timelineRow}>
                  {/* Connector line (below the dot) */}
                  {!isLast && (
                    <View
                      style={[
                        s.timelineLine,
                        {
                          backgroundColor: step.done
                            ? decisionColor
                            : colors.border,
                        },
                      ]}
                    />
                  )}

                  {/* Dot */}
                  <View
                    style={[
                      s.timelineDot,
                      {
                        backgroundColor: step.done
                          ? decisionColor
                          : colors.border,
                      },
                    ]}
                  >
                    {step.done ? (
                      <TimelineCheck />
                    ) : (
                      <View style={s.timelineDotInner} />
                    )}
                  </View>

                  {/* Content */}
                  <View style={s.timelineContent}>
                    <Text
                      style={[
                        s.timelineLabel,
                        {
                          color: step.done ? colors.text : colors.textLight,
                          fontFamily: step.done
                            ? fontWeights.semiBold
                            : fontWeights.regular,
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                    {step.date ? (
                      <Text style={s.timelineDate}>{step.date}</Text>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        </MCard>

        {/* ====== 3. Action Buttons ====== */}
        <View style={s.btnRow}>
          <MBtn
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() =>
              navigation.navigate('HomeTab', { screen: 'Dashboard' })
            }
          >
            Back to Dashboard
          </MBtn>
          <MBtn
            variant="primary"
            style={{ flex: 2 }}
            onPress={() => navigation.navigate('CreditWallet')}
          >
            View Allocation →
          </MBtn>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default CreditStatusScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* loading */
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15.5,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* empty state */

  /* banner */
  banner: {
    backgroundColor: colors.successBg,
    borderRadius: radii.large,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  bannerTitle: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.success,
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 12,
  },
  bannerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bannerDetailItem: {
    gap: 2,
  },
  bannerDetailLabel: {
    fontSize: 13.5,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
  },
  bannerDetailValue: {
    fontSize: 14.5,
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },

  /* timeline */
  timelineTitle: {
    fontSize: 16,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 18,
  },
  timelineWrap: {},
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: '100%',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timelineContent: {
    paddingTop: 4,
    flex: 1,
  },
  timelineLabel: {
    fontSize: 15.5,
    lineHeight: 22,
  },
  timelineDate: {
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 2,
  },

  /* buttons */
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
})
