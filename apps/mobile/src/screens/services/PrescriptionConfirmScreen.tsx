import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors, fontWeights } from '@/theme'
import { AppBar, GGPill, MBtn, MCard, Screen, ScrollArea } from '@/components'
import type { ServicesScreenProps } from '@/navigation/types'

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

export function PrescriptionConfirmScreen({
  route,
  navigation,
}: ServicesScreenProps<'PrescriptionConfirm'>) {
  // Deep links (app/prescriptions/confirm) arrive without params — fall
  // back to a generic confirmation instead of crashing.
  const { referenceId, provider, fulfillmentMode, forLabel, attachmentName } = route.params ?? {}
  const hasDetails = !!referenceId

  return (
    <Screen>
      <AppBar title="Prescription Sent" subtitle="Awaiting pharmacy review" />

      <ScrollArea gap={16} px={16} py={20}>
        <View style={s.successSection}>
          <SuccessCheck />
          <Text style={s.successTitle}>Prescription Submitted</Text>
          <Text style={s.successDesc}>
            {hasDetails ? (
              <>
                Your prescription has been sent to <Text style={s.providerName}>{provider}</Text>.
                The pharmacy will confirm availability, pricing, and next steps.
              </>
            ) : (
              'Check your prescription requests for the latest status.'
            )}
          </Text>
        </View>

        {hasDetails ? (
        <MCard padding={16}>
          <Text style={s.detailsTitle}>Request Details</Text>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Reference</Text>
            <Text style={s.detailValue}>{referenceId}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Provider</Text>
            <Text style={s.detailValue}>{provider}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Fulfillment</Text>
            <GGPill type="info">
              {fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'}
            </GGPill>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>For</Text>
            <Text style={s.detailValue}>{forLabel}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Attachment</Text>
            <Text style={s.detailValue}>{attachmentName}</Text>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Payment</Text>
            <Text style={s.detailValue}>After pickup or delivery</Text>
          </View>
        </MCard>
        ) : null}

        <View style={s.infoBanner}>
          <Text style={s.infoBannerTitle}>What happens next</Text>
          <Text style={s.infoBannerBody}>
            The pharmacy will review your upload, confirm stock and pricing, then notify
            you once the order is ready for pickup or dispatch.
          </Text>
        </View>

        <View style={s.buttonRow}>
          <MBtn
            variant="secondary"
            style={s.buttonHalf}
            onPress={() =>
              hasDetails
                ? navigation.navigate('PrescriptionDetail', { prescriptionId: referenceId! })
                : navigation.navigate('PrescriptionRequests')
            }
          >
            View Request
          </MBtn>
          <MBtn
            variant="primary"
            style={s.buttonHalf}
            onPress={() => navigation.navigate('HomeTab', { screen: 'Dashboard' } as never)}
          >
            Dashboard
          </MBtn>
        </View>

        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default PrescriptionConfirmScreen

const s = StyleSheet.create({
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
  providerName: {
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },
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
    flex: 1,
    marginLeft: 16,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoBanner: {
    backgroundColor: colors.blue3,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },
  infoBannerBody: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  buttonHalf: {
    flex: 1,
  },
})
