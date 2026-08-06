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
import { Screen, ScrollArea, AppBar, MCard, MBtn } from '@/components'
import CheckIcon from '@/icons/CheckIcon'
import { useCreditStatus } from '@gg/shared-hooks'
import { useUserStore } from '@gg/shared-stores'
import { formatCurrency, formatDate } from '@gg/shared-utils'
import { getCountryByCode } from '@gg/shared-config'
import type { CreditStatusResponse, Patient } from '@gg/shared-types'
import type { WalletScreenProps } from '@/navigation/types'
import { EmptyCreditStatusScreen } from './EmptyCreditStatusScreen'

/* ------------------------------------------------------------------ */
/*  Timeline data builder                                              */
/* ------------------------------------------------------------------ */
function buildTimeline(application: any, creditStatus?: string, isIncrease?: boolean) {
  const isApproved =
    application?.status === 'approved' || creditStatus === 'approved'

  const submittedDate = application?.submittedAt
    ? formatDate(application.submittedAt)
    : 'Pending'

  const reviewedDate = application?.reviewedAt
    ? formatDate(application.reviewedAt)
    : ''

  if (isIncrease) {
    return [
      { label: 'Increase Request Submitted', date: submittedDate, done: !!application },
      { label: 'Partner Review', date: isApproved ? reviewedDate : 'In progress...', done: isApproved },
      { label: 'Wallet Updated', date: isApproved ? reviewedDate : '', done: isApproved },
    ]
  }

  return [
    {
      label: 'Application Submitted',
      date: submittedDate,
      done: !!application,
    },
    {
      label: 'Partner Review',
      date: isApproved ? reviewedDate : 'In progress...',
      done: isApproved,
    },
    {
      label: 'Credit Decision',
      date: isApproved ? reviewedDate : '',
      done: isApproved,
    },
    {
      label: 'Balance Loaded',
      date: isApproved ? reviewedDate : '',
      done: isApproved,
    },
  ]
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
  const { data: creditData, isLoading } = useCreditStatus()

  const isIncrease =
    route.params?.requestType === 'increase' ||
    creditData?.application?.type === 'increase'

  const application = (creditData as any)?.application ?? null
  const creditRef =
    application?.reference ??
    (creditData as any)?.creditAccountRef ??
    (u as any)?.creditAccountRef ??
    'GGA-847291'

  const isApproved =
    application?.status === 'approved' ||
    (creditData as any)?.creditStatus === 'approved' ||
    u?.creditStatus === 'approved'

  const requestedAmount = application?.requestedAmount ?? u?.creditLimit ?? 0
  const approvedAmount =
    application?.approvedAmount ?? (isApproved ? u?.creditLimit : 0) ?? 0

  const timeline = buildTimeline(
    application,
    (creditData as any)?.creditStatus ?? u?.creditStatus,
    isIncrease,
  )

  /* loading */
  if (isLoading && !creditData) {
    return (
      <Screen>
        <AppBar
          title={isIncrease ? 'Increase Request Status' : 'Application Status'}
          subtitle={`Ref: ${creditRef}`}
          back
        />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading application status...</Text>
        </View>
      </Screen>
    )
  }

  /* empty state — render dedicated empty screen */
  if (!application && !isApproved) {
    return <EmptyCreditStatusScreen />
  }

  return (
    <Screen>
      <AppBar
        title={isIncrease ? 'Increase Request Status' : 'Application Status'}
        subtitle={`Ref: ${creditRef}`}
        back
      />

      <ScrollArea gap={14} px={16} py={14}>
        {/* ====== 1. Approved Banner ====== */}
        <View style={s.banner}>
          <View style={s.bannerIconCircle}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12l5 5L19 7"
                stroke={colors.success}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>
              {isApproved ? 'Approved' : isIncrease ? 'Under Review' : 'Under Review'}
            </Text>
            <Text style={s.bannerDesc}>
              {isApproved
                ? isIncrease
                  ? 'Your limit increase has been approved. Your updated balance is ready to use.'
                  : 'Your application has been approved and your wallet balance is ready to use.'
                : isIncrease
                  ? 'Your increase request is with the finance partner team for review.'
                  : 'Your application is being reviewed. You will be notified once a decision is made.'}
            </Text>

            <View style={s.bannerDetails}>
              <View style={s.bannerDetailItem}>
                <Text style={s.bannerDetailLabel}>Requested</Text>
                <Text style={s.bannerDetailValue}>
                  {formatCurrency(requestedAmount)}
                </Text>
              </View>
              <View style={s.bannerDetailItem}>
                <Text style={s.bannerDetailLabel}>Approved</Text>
                <Text style={s.bannerDetailValue}>
                  {isApproved ? formatCurrency(approvedAmount) : '--'}
                </Text>
              </View>
              <View style={s.bannerDetailItem}>
                <Text style={s.bannerDetailLabel}>Partner</Text>
                <Text style={s.bannerDetailValue} numberOfLines={1}>
                  Accredited finance partner
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
                            ? colors.success
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
                          ? colors.success
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
            View Wallet →
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* empty state */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 19,
  },

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
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 12,
  },
  bannerPartnerLogo: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerDetailValue: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },

  /* timeline */
  timelineTitle: {
    fontSize: 15,
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
    fontSize: 14,
    lineHeight: 20,
  },
  timelineDate: {
    fontSize: 12,
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
