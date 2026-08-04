import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native'
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill, SegmentedTabs } from '@/components'
import { CalendarIcon, CheckIcon } from '@/icons'
import { usePatientAppointments, useCancelPatientAppointmentMutation } from '@gg/shared-hooks'
import { patientService } from '@gg/shared-api'
import { useAuthStore, useUserStore } from '@gg/shared-stores'
import {
  formatTime12h,
  getAppointmentDisplayStatus,
  getDaysUntilAppointment,
  buildAppointmentRebookParams,
} from '@gg/shared-utils'
import type { Appointment } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMonthShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  Stat Icon SVGs                                                     */
/* ------------------------------------------------------------------ */
function UpcomingIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={1.5} y={3} width={15} height={13.5} rx={2.5} stroke={colors.blue} strokeWidth={1.4} />
      <Path d="M1.5 7.5h15M6 1.5v3M12 1.5v3" stroke={colors.blue} strokeWidth={1.3} strokeLinecap="round" />
      <Circle cx={9} cy={11.5} r={1.8} fill={colors.blue} />
    </Svg>
  )
}

function CompletedIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={7} stroke={colors.success} strokeWidth={1.4} />
      <Path d="M5.5 9l2.5 2.5 4.5-4.5" stroke={colors.success} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function TotalIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={1.5} y={3} width={15} height={13.5} rx={2.5} stroke={colors.textSub} strokeWidth={1.4} />
      <Path d="M1.5 7.5h15M6 1.5v3M12 1.5v3" stroke={colors.textSub} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M5 11h8M5 13.5h5" stroke={colors.textSub} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Cancel reasons                                                     */
/* ------------------------------------------------------------------ */
const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better',
  'Found another provider',
  'Provider unavailable',
  'Other',
]

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */
export function AppointmentsScreen() {
  const navigation = useNavigation<any>()
  const userName = useUserStore(s => s.user?.name ?? '')
  const { data, isLoading, refetch } = usePatientAppointments()
  const cancelMutation = useCancelPatientAppointmentMutation()

  const [tabIndex, setTabIndex] = useState(0)

  /* cancel modal state */
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [cancelAptId, setCancelAptId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0])
  const [cancelNotes, setCancelNotes] = useState('')
  const [rebookingId, setRebookingId] = useState<string | null>(null)
  const userMode = useAuthStore(s => s.userMode)

  const handleBookAgain = async (apt: Appointment) => {
    setRebookingId(apt.id)
    try {
      const context = await patientService.getRebookContext(apt.id, userMode)
      navigation.navigate('ServicesTab', {
        screen: 'BookingForm',
        params: {
          providerId: context.provider.id,
          rebook: {
            service: context.service,
            forSelf: context.forSelf,
            beneficiaryId: context.beneficiaryId,
            description: context.description,
          },
        },
      })
      return
    } catch {
      const fallback = buildAppointmentRebookParams(apt, userName)
      if (!fallback) {
        setRebookingId(null)
        return
      }
      navigation.navigate('ServicesTab', {
        screen: 'BookingForm',
        params: fallback,
      })
    } finally {
      setRebookingId(null)
    }
  }

  const openCancelModal = (aptId: string) => {
    setCancelAptId(aptId)
    setCancelReason(CANCEL_REASONS[0])
    setCancelNotes('')
    setCancelModalVisible(true)
  }

  const handleConfirmCancel = async () => {
    if (!cancelAptId) return
    try {
      await cancelMutation.mutateAsync({
        id: cancelAptId,
        payload: {
          reason: cancelReason,
          note: cancelReason === 'Other' ? cancelNotes : undefined,
        },
      })
      setCancelModalVisible(false)
      setCancelAptId(null)
      refetch()
    } catch {
      // error handled by mutation hook
    }
  }

  /* Derive appointment lists */
  const allAppointments: Appointment[] = [
    ...((data as any)?.upcoming ?? []),
    ...((data as any)?.past ?? []),
  ]

  const upcoming = allAppointments.filter(a => {
    const s = getAppointmentDisplayStatus(a)
    return s !== 'completed' && s !== 'cancelled'
  })

  const past = allAppointments.filter(a => {
    const s = getAppointmentDisplayStatus(a)
    return s === 'completed' || s === 'cancelled'
  })

  const completedCount = past.filter(
    a => getAppointmentDisplayStatus(a) === 'completed',
  ).length

  const filtered =
    tabIndex === 0 ? upcoming : tabIndex === 1 ? past : allAppointments

  const tabs = [
    { label: 'Upcoming', count: upcoming.length },
    { label: 'Past', count: past.length },
    { label: 'All', count: allAppointments.length },
  ]

  /* Next appointment for hero card */
  const nextApt = upcoming[0] ?? null
  const nextAptDate = nextApt ? new Date(nextApt.date) : null
  const daysAway = nextApt ? getDaysUntilAppointment(nextApt.date) : 0

  /* Loading state */
  if (isLoading && !data) {
    return (
      <Screen>
        <AppBar title="Appointments" subtitle="Your healthcare schedule" />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading appointments...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar title="Appointments" subtitle="Your healthcare schedule" />

      <ScrollArea gap={14} px={16} py={14}>
        {/* === 1. Stats Row === */}
        <View style={s.statsRow}>
          {[
            { label: 'UPCOMING', value: upcoming.length, color: colors.blue, icon: <UpcomingIcon /> },
            { label: 'COMPLETED', value: completedCount, color: colors.success, icon: <CompletedIcon /> },
            { label: 'TOTAL', value: allAppointments.length, color: colors.textSub, icon: <TotalIcon /> },
          ].map(stat => (
            <MCard key={stat.label} padding={14} style={s.statCard}>
              <View style={s.statHeader}>
                <Text style={s.statLabel}>{stat.label}</Text>
                <View style={{ opacity: 0.6 }}>{stat.icon}</View>
              </View>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            </MCard>
          ))}
        </View>

        {/* === 2. Tab Bar === */}
        <SegmentedTabs
          tabs={tabs}
          activeIndex={tabIndex}
          onSelect={setTabIndex}
        />

        {/* === 3. "Next Up" Card === */}
        {tabIndex === 0 && nextApt && nextAptDate && (
          <View style={s.nextUpCard}>
            {/* Date badge */}
            <View style={s.nextUpBadge}>
              <Text style={s.nextUpDay}>{nextAptDate.getDate()}</Text>
              <Text style={s.nextUpMonth}>{formatMonthShort(nextAptDate)}</Text>
            </View>

            {/* Info */}
            <View style={s.nextUpInfo}>
              <View style={s.nextUpPill}>
                <Text style={s.nextUpPillText}>NEXT UP</Text>
              </View>
              <Text style={s.nextUpProvider} numberOfLines={1}>
                {(nextApt as any).provider ?? 'Provider'}
              </Text>
              <Text style={s.nextUpMeta}>
                {formatTime12h(nextApt.time)} - {(nextApt as any).service ?? 'Appointment'}
              </Text>
            </View>

            {/* Days away */}
            <View style={s.nextUpDays}>
              <Text style={s.nextUpDayCount}>
                {daysAway === 0 ? '-' : Math.abs(daysAway)}
              </Text>
              <Text style={s.nextUpDayLabel}>
                {daysAway === 0 ? 'Today' : daysAway < 0 ? 'days ago' : 'days away'}
              </Text>
            </View>
          </View>
        )}

        {/* === 4. Appointment Cards === */}
        {filtered.length === 0 ? (
          <MCard padding={0}>
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <CalendarIcon size={24} color={colors.blue} />
              </View>
              <Text style={s.emptyTitle}>
                {tabIndex === 0
                  ? 'No upcoming appointments'
                  : tabIndex === 1
                    ? 'No past appointments yet'
                    : 'No appointments yet'}
              </Text>
              <Text style={s.emptySub}>
                Find a service and request an engagement to get started.
              </Text>
            </View>
          </MCard>
        ) : (
          filtered.map(apt => {
            const d = new Date(apt.date)
            const displayStatus = getAppointmentDisplayStatus(apt)
            const isPast =
              displayStatus === 'completed' || displayStatus === 'cancelled'
            const isBeneficiary =
              apt.forSelf === false ||
              (apt.forSelf === undefined &&
                (apt as any).for !== userName &&
                (apt as any).for !== 'Self')

            const dateBg =
              displayStatus === 'pending'
                ? colors.warningBg
                : displayStatus === 'confirmed'
                  ? colors.successBg
                  : colors.bg

            const pillType =
              displayStatus === 'pending'
                ? 'warning'
                : displayStatus === 'confirmed'
                  ? 'info'
                  : displayStatus === 'completed'
                    ? 'success'
                    : 'error'

            const pillLabel =
              displayStatus === 'pending'
                ? 'Pending'
                : displayStatus === 'confirmed'
                  ? 'Confirmed'
                  : displayStatus === 'completed'
                    ? 'Completed'
                    : 'Cancelled'

            return (
              <MCard key={apt.id} padding={16}>
                <View style={s.aptRow}>
                  {/* Date badge */}
                  <View style={[s.aptBadge, { backgroundColor: dateBg }]}>
                    <Text style={[s.aptBadgeDay, { color: isPast ? colors.textSub : colors.navy }]}>
                      {d.getDate()}
                    </Text>
                    <Text style={[s.aptBadgeMonth, { color: isPast ? colors.textLight : colors.textSub }]}>
                      {formatMonthShort(d)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={s.aptInfo}>
                    {/* Service type pill */}
                    <View style={s.aptTypePill}>
                      <Text style={s.aptTypeText}>
                        {(apt as any).category?.toUpperCase?.() ?? 'APPOINTMENT'}
                      </Text>
                    </View>

                    <Text style={s.aptProvider} numberOfLines={1}>
                      {(apt as any).provider ?? 'Provider'}
                    </Text>

                    <Text style={s.aptMeta} numberOfLines={1}>
                      {formatTime12h(apt.time)} - {(apt as any).service ?? 'Service'}
                    </Text>

                    {/* Beneficiary / Self badge */}
                    <View style={s.aptFooterRow}>
                      {isBeneficiary ? (
                        <View style={s.beneficiaryBadge}>
                          <Svg width={9} height={9} viewBox="0 0 10 10" fill="none">
                            <Circle cx={5} cy={3.5} r={2} stroke={colors.blue} strokeWidth={1.2} />
                            <Path d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={colors.blue} strokeWidth={1.2} strokeLinecap="round" />
                          </Svg>
                          <Text style={s.beneficiaryText}>{(apt as any).for ?? 'Beneficiary'}</Text>
                        </View>
                      ) : (
                        <View style={s.selfBadge}>
                          <Svg width={9} height={9} viewBox="0 0 10 10" fill="none">
                            <Circle cx={5} cy={3.5} r={2} stroke={colors.textLight} strokeWidth={1.2} />
                            <Path d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={colors.textLight} strokeWidth={1.2} strokeLinecap="round" />
                          </Svg>
                          <Text style={s.selfText}>Self</Text>
                        </View>
                      )}

                      <GGPill type={pillType}>{pillLabel}</GGPill>
                    </View>

                    {/* Action buttons for upcoming confirmed appointments */}
                    {!isPast && displayStatus === 'confirmed' && (
                      <Pressable
                        style={s.cancelAptBtn}
                        onPress={() => openCancelModal(apt.id)}
                      >
                        <Text style={s.cancelAptBtnText}>Cancel</Text>
                      </Pressable>
                    )}

                    {/* Book Again for completed past appointments */}
                    {displayStatus === 'completed' && (
                      <Pressable
                        style={s.bookAgainBtn}
                        disabled={rebookingId === apt.id}
                        onPress={() => void handleBookAgain(apt)}
                      >
                        <Text style={s.bookAgainBtnText}>
                          {rebookingId === apt.id ? 'Opening...' : 'Book Again'}
                        </Text>
                      </Pressable>
                    )}

                    {displayStatus === 'cancelled' && (
                      <Pressable
                        style={s.rebookBtn}
                        disabled={rebookingId === apt.id}
                        onPress={() => void handleBookAgain(apt)}
                      >
                        <Text style={s.rebookBtnText}>
                          {rebookingId === apt.id ? 'Opening...' : 'Rebook'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </MCard>
            )
          })
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 24 }} />
      </ScrollArea>

      {/* ============================================================ */}
      {/*  Cancel Appointment Modal                                     */}
      {/* ============================================================ */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Cancel Appointment?</Text>
            <Text style={s.modalSubtitle}>
              Please select a reason for cancelling.
            </Text>

            {/* Reason radio buttons */}
            {CANCEL_REASONS.map(reason => (
              <Pressable
                key={reason}
                style={s.reasonRow}
                onPress={() => setCancelReason(reason)}
              >
                <View
                  style={[
                    s.reasonRadio,
                    cancelReason === reason && s.reasonRadioSelected,
                  ]}
                >
                  {cancelReason === reason && <View style={s.reasonRadioDot} />}
                </View>
                <Text
                  style={[
                    s.reasonText,
                    cancelReason === reason && s.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </Pressable>
            ))}

            {/* Optional notes for "Other" */}
            {cancelReason === 'Other' && (
              <TextInput
                style={s.cancelNotesInput}
                placeholder="Please provide details..."
                placeholderTextColor={colors.textLight}
                value={cancelNotes}
                onChangeText={setCancelNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}

            {/* Action buttons */}
            <View style={s.modalBtnRow}>
              <MBtn
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setCancelModalVisible(false)}
              >
                Keep Appointment
              </MBtn>
              <MBtn
                variant="primary"
                style={{ flex: 1, backgroundColor: colors.error }}
                disabled={cancelMutation.isPending}
                onPress={handleConfirmCancel}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </MBtn>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

export default AppointmentsScreen

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

  /* stats */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 28,
    fontFamily: fontWeights.extraBold,
    letterSpacing: -1,
    lineHeight: 32,
  },

  /* next up card */
  nextUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.blue3,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.blue,
  },
  nextUpBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpDay: {
    fontSize: 20,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  nextUpMonth: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  nextUpInfo: {
    flex: 1,
    gap: 3,
  },
  nextUpPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    marginBottom: 2,
  },
  nextUpPillText: {
    fontSize: 9,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  nextUpProvider: {
    fontSize: 14,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  nextUpMeta: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },
  nextUpDays: {
    alignItems: 'center',
    flexShrink: 0,
  },
  nextUpDayCount: {
    fontSize: 24,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    letterSpacing: -1,
    lineHeight: 28,
  },
  nextUpDayLabel: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  /* empty state */
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },

  /* appointment cards */
  aptRow: {
    flexDirection: 'row',
    gap: 14,
  },
  aptBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aptBadgeDay: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    lineHeight: 20,
  },
  aptBadgeMonth: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    letterSpacing: 0.4,
  },
  aptInfo: {
    flex: 1,
    gap: 4,
  },
  aptTypePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  aptTypeText: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    letterSpacing: 0.6,
  },
  aptProvider: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  aptMeta: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  aptFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  beneficiaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(47,155,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(47,155,255,0.2)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  beneficiaryText: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.blue,
  },
  selfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selfText: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textLight,
  },

  /* cancel button on appointment card */
  cancelAptBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  cancelAptBtnText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.error,
  },

  /* book again button */
  bookAgainBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  bookAgainBtnText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.blue,
  },
  rebookBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.blue3,
  },
  rebookBtnText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.blue,
  },

  /* cancel modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginBottom: 16,
  },

  /* reason radio rows */
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonRadioSelected: {
    borderColor: colors.error,
  },
  reasonRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  reasonText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  reasonTextSelected: {
    fontFamily: fontWeights.semiBold,
    color: colors.error,
  },

  /* cancel notes input */
  cancelNotesInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.text,
    minHeight: 70,
    marginTop: 8,
    marginBottom: 4,
  },

  /* modal buttons */
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
})
