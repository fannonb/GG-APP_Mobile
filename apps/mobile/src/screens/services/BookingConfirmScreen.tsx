import React from 'react'
import {
  View,
  Text,
  StyleSheet,
} from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'
import type { ServicesScreenProps } from '@/navigation/types'
import { useUserStore } from '@gg/shared-stores'

/* ------------------------------------------------------------------ */
/*  Large checkmark illustration                                       */
/* ------------------------------------------------------------------ */
function SuccessCheck() {
  return (
    <View style={s.checkCircle}>
      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12l5 5 9-9"
          stroke={colors.success}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function BookingConfirmScreen({ route, navigation }: ServicesScreenProps<'BookingConfirm'>) {
  // Deep links (app/booking/confirm) arrive without params — fall back to
  // a generic confirmation instead of crashing.
  const { result } = route.params ?? {}
  const user = useUserStore(s => s.user)

  const hasDetails = !!result
  const providerName = (result as any)?.providerName ?? (result as any)?.provider ?? 'Provider'
  const date = (result as any)?.date ?? '18 Jun 2026'
  const time = (result as any)?.time ?? '16:00'
  const serviceType = (result as any)?.service ?? (result as any)?.serviceType ?? 'General Consultation'
  const patientName = user?.name ?? 'Patient'

  return (
    <Screen>
      <AppBar
        title="Request Sent"
        subtitle="Pending provider confirmation"
      />

      <ScrollArea gap={16} px={16} py={20}>
        {/* === 1. Success Illustration === */}
        <View style={s.successSection}>
          <SuccessCheck />
          <Text style={s.successTitle}>Request Sent!</Text>
          <Text style={s.successDesc}>
            {hasDetails ? (
              <>
                Your appointment request has been sent to{' '}
                <Text style={s.successProviderName}>{providerName}</Text>.
                You will be notified once they confirm your booking.
              </>
            ) : (
              'Check your appointments for the latest status of your booking request.'
            )}
          </Text>
        </View>

        {/* === 2. Booking Details === */}
        {hasDetails ? (
        <MCard padding={16}>
          <Text style={s.detailsTitle}>Booking Details</Text>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Provider</Text>
            <Text style={s.detailValue}>{providerName}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Date & Time</Text>
            <Text style={s.detailValue}>{date} at {time}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Type</Text>
            <Text style={s.detailValue}>{serviceType}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Status</Text>
            <GGPill type="warning">Pending Confirmation</GGPill>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>For</Text>
            <Text style={s.detailValue}>
              {patientName} <Text style={s.detailSelf}>(Self)</Text>
            </Text>
          </View>
        </MCard>
        ) : null}

        {/* === 3. Buttons === */}
        <View style={s.buttonRow}>
          <MBtn
            variant="secondary"
            onPress={() =>
              navigation.navigate('ServicesTab', { screen: 'FindService' } as any)
            }
            style={s.findMoreBtn}
          >
            Find Service
          </MBtn>
          <MBtn
            variant="primary"
            onPress={() =>
              navigation.navigate('HomeTab', { screen: 'Dashboard' } as any)
            }
            style={s.dashboardBtn}
          >
            Dashboard
          </MBtn>
        </View>

        {/* bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default BookingConfirmScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  /* success illustration */
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  successDesc: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  successProviderName: {
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },

  /* details card */
  detailsTitle: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailSelf: {
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  /* buttons */
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  findMoreBtn: {
    flex: 1,
  },
  dashboardBtn: {
    flex: 1,
  },
})
