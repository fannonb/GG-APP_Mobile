import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'
import { usePatientAppointments, useConfirmRescheduledAppointmentMutation, useCancelPatientAppointmentMutation } from '@gg/shared-hooks'
import { formatDate, formatTime12h, getAppointmentDisplayStatus } from '@gg/shared-utils'
import type { HomeScreenProps } from '@/navigation/types'
import type { Appointment } from '@gg/shared-types'

function CalendarIcon({ size = 20, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ClockIcon({ size = 20, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={6} x2={12} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={12} y1={12} x2={16} y2={14} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better',
  'Found another provider',
  'Provider unavailable',
  'Other',
] as const

export function RescheduleReviewScreen({ route, navigation }: HomeScreenProps<'RescheduleReview'>) {
  const { appointmentId } = route.params
  const { data: appointmentsData, isLoading } = usePatientAppointments()
  const confirmMutation = useConfirmRescheduledAppointmentMutation()
  const cancelMutation = useCancelPatientAppointmentMutation()

  const [confirmed, setConfirmed] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')

  const appointments = [
    ...(appointmentsData?.upcoming ?? []),
    ...(appointmentsData?.past ?? []),
  ]
  const apt = appointments.find((a: Appointment) => String(a.id) === String(appointmentId))

  if (isLoading) {
    return (
      <Screen>
        <AppBar title="Reschedule Review" back />
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      </Screen>
    )
  }

  if (!apt) {
    return (
      <Screen>
        <AppBar title="Reschedule Review" back />
        <View style={st.centered}>
          <Text style={st.emptyText}>Appointment not found.</Text>
          <MBtn variant="secondary" onPress={() => navigation.goBack()}>Go Back</MBtn>
        </View>
      </Screen>
    )
  }

  const displayStatus = getAppointmentDisplayStatus(apt)
  const hasProposal = Boolean((apt as Appointment).rescheduledAt) && displayStatus === 'pending'

  if (displayStatus === 'confirmed' || !hasProposal) {
    return (
      <Screen>
        <AppBar title="Reschedule Review" back />
        <View style={st.centered}>
          <Text style={st.emptyText}>
            {displayStatus === 'confirmed'
              ? 'This appointment is already confirmed.'
              : 'No pending reschedule proposal for this appointment.'}
          </Text>
          <MBtn variant="secondary" onPress={() => navigation.goBack()}>Go Back</MBtn>
        </View>
      </Screen>
    )
  }

  const providerName = apt.provider ?? 'Provider'
  const service = apt.service ?? 'Appointment'
  const rescheduledDate = (apt as any).rescheduledAt ?? apt.date
  const rescheduledTime = (apt as any).rescheduledTime ?? apt.time

  if (confirmed) {
    return (
      <Screen>
        <AppBar title="Reschedule Review" back />
        <View style={st.centered}>
          <View style={st.successCircle}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={st.successTitle}>Appointment Confirmed</Text>
          <Text style={st.successSub}>
            Your appointment with {providerName} has been confirmed for the new date.
          </Text>
          <MBtn variant="primary" onPress={() => navigation.navigate('Appointments')}>
            View Appointments
          </MBtn>
        </View>
      </Screen>
    )
  }

  const handleConfirm = () => {
    confirmMutation.mutate(appointmentId, {
      onSuccess: () => setConfirmed(true),
    })
  }

  const handleDecline = () => {
    if (!declineReason) return
    cancelMutation.mutate(
      {
        id: appointmentId,
        payload: {
          reason: declineReason,
          note: declineReason === 'Other' ? cancelNote.trim() || undefined : undefined,
        },
      },
      { onSuccess: () => navigation.navigate('Appointments') },
    )
  }

  return (
    <Screen>
      <AppBar title="Reschedule Review" subtitle="Review proposed changes" back />

      <ScrollArea gap={16} px={16} py={14}>
        {/* Info banner */}
        <View style={st.infoBanner}>
          <Text style={st.infoBannerText}>
            Your provider has proposed a new date/time for your appointment. Please review and confirm or decline.
          </Text>
        </View>

        {/* Appointment details */}
        <MCard padding={18}>
          <Text style={st.cardTitle}>Proposed Reschedule</Text>

          <View style={st.detailRow}>
            <Text style={st.detailLabel}>Provider</Text>
            <Text style={st.detailValue}>{providerName}</Text>
          </View>
          <View style={st.divider} />
          <View style={st.detailRow}>
            <Text style={st.detailLabel}>Service</Text>
            <Text style={st.detailValue}>{service}</Text>
          </View>
          <View style={st.divider} />

          <View style={st.dateTimeCard}>
            <View style={st.dtRow}>
              <CalendarIcon size={20} color={colors.blue} />
              <View>
                <Text style={st.dtLabel}>New Date</Text>
                <Text style={st.dtValue}>
                  {rescheduledDate ? formatDate(rescheduledDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                </Text>
              </View>
            </View>
            <View style={st.dtDivider} />
            <View style={st.dtRow}>
              <ClockIcon size={20} color={colors.blue} />
              <View>
                <Text style={st.dtLabel}>New Time</Text>
                <Text style={st.dtValue}>{rescheduledTime ? formatTime12h(rescheduledTime) : '-'}</Text>
              </View>
            </View>
          </View>

          {apt.date && (
            <View style={st.originalRow}>
              <Text style={st.originalLabel}>Originally:</Text>
              <Text style={st.originalValue}>
                {formatDate(apt.date, { month: 'short', day: 'numeric' })} at {apt.time ? formatTime12h(apt.time) : '-'}
              </Text>
            </View>
          )}
        </MCard>

        {/* Action buttons */}
        {!showDecline && (
          <View style={st.btnRow}>
            <MBtn variant="secondary" style={{ flex: 1 }} onPress={() => setShowDecline(true)}>
              Decline
            </MBtn>
            <MBtn
              variant="primary"
              style={{ flex: 2 }}
              disabled={confirmMutation.isPending}
              onPress={handleConfirm}
            >
              {confirmMutation.isPending ? 'Confirming...' : 'Accept New Time'}
            </MBtn>
          </View>
        )}

        {/* Decline form */}
        {showDecline && (
          <MCard padding={16}>
            <Text style={st.declineTitle}>Decline Reschedule</Text>
            <Text style={st.declineDesc}>
              Let the provider know why this time doesn't work. The appointment will be cancelled.
            </Text>
            <View style={{ gap: 8, marginBottom: 14 }}>
              {CANCEL_REASONS.map(reason => {
                const active = declineReason === reason
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setDeclineReason(reason)}
                    style={[st.reasonChip, active && st.reasonChipActive]}
                  >
                    <Text style={[st.reasonChipText, active && st.reasonChipTextActive]}>{reason}</Text>
                  </Pressable>
                )
              })}
            </View>
            {declineReason === 'Other' && (
              <TextInput
                style={st.declineInput}
                placeholder="Please describe your reason…"
                placeholderTextColor={colors.textLight}
                value={cancelNote}
                onChangeText={setCancelNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}
            <View style={st.btnRow}>
              <MBtn variant="secondary" style={{ flex: 1 }} onPress={() => setShowDecline(false)}>
                Back
              </MBtn>
              <MBtn
                variant="primary"
                style={[{ flex: 2 }, { backgroundColor: colors.error }]}
                disabled={cancelMutation.isPending || !declineReason}
                onPress={handleDecline}
              >
                {cancelMutation.isPending ? 'Declining...' : 'Decline & Cancel'}
              </MBtn>
            </View>
          </MCard>
        )}

        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default RescheduleReviewScreen

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  emptyText: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.textSub },

  infoBanner: { backgroundColor: colors.blue3, borderRadius: radii.default, padding: 14 },
  infoBannerText: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.navy, lineHeight: 20 },

  cardTitle: { fontSize: 16, fontFamily: fontWeights.extraBold, color: colors.text, marginBottom: 14 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  detailLabel: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.textSub },
  detailValue: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },

  dateTimeCard: { backgroundColor: colors.bg, borderRadius: radii.default, padding: 16, marginTop: 14, gap: 0 },
  dtRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  dtLabel: { fontSize: 11, fontFamily: fontWeights.regular, color: colors.textSub },
  dtValue: { fontSize: 14, fontFamily: fontWeights.bold, color: colors.text },
  dtDivider: { height: 1, backgroundColor: colors.border },

  originalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  originalLabel: { fontSize: 12, fontFamily: fontWeights.medium, color: colors.textLight },
  originalValue: { fontSize: 12, fontFamily: fontWeights.semiBold, color: colors.textSub },

  btnRow: { flexDirection: 'row', gap: 10 },

  successCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 20, fontFamily: fontWeights.extraBold, color: colors.text },
  successSub: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, textAlign: 'center', lineHeight: 20 },

  declineTitle: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.error, marginBottom: 6 },
  declineDesc: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 18, marginBottom: 12 },
  declineInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontWeights.regular, fontSize: 14, color: colors.text, backgroundColor: colors.bg, minHeight: 70, marginBottom: 14 },
  reasonChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  reasonChipActive: {
    borderColor: colors.blueInk,
    backgroundColor: colors.blue100,
  },
  reasonChipText: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.text },
  reasonChipTextActive: { color: colors.blueInk, fontFamily: fontWeights.bold },
})
