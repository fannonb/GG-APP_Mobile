import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { AppBar, GGPill, MBtn, MCard, Screen, ScrollArea } from '@/components'
import type { ServicesScreenProps } from '@/navigation/types'
import { colors, fontWeights, radii } from '@/theme'
import { usePatientPrescriptionRequests } from '@gg/shared-hooks'
import { formatCurrency, formatDate } from '@gg/shared-utils'
import type { PrescriptionRequest } from '@gg/shared-types'

function getStatusMeta(status: PrescriptionRequest['status']) {
  switch (status) {
    case 'submitted':
      return { type: 'warning' as const, label: 'Submitted' }
    case 'quoted':
      return { type: 'info' as const, label: 'Quoted' }
    case 'accepted':
      return { type: 'info' as const, label: 'Accepted' }
    case 'preparing':
      return { type: 'pending' as const, label: 'Preparing' }
    case 'ready':
      return { type: 'success' as const, label: 'Ready' }
    case 'fulfilled':
      return { type: 'success' as const, label: 'Fulfilled' }
    case 'cancelled':
      return { type: 'error' as const, label: 'Cancelled' }
    default:
      return { type: 'default' as const, label: status }
  }
}

export function PrescriptionRequestsScreen({
  navigation,
}: ServicesScreenProps<'PrescriptionRequests'>) {
  const { data, isLoading } = usePatientPrescriptionRequests()
  const requests = (data ?? []) as PrescriptionRequest[]

  if (isLoading && requests.length === 0) {
    return (
      <Screen>
        <AppBar title="Prescription Requests" subtitle="Loading pharmacy activity..." />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading requests...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppBar
        title="Prescription Requests"
        subtitle="Track uploads, pharmacy review, pickup, and delivery status"
      />

      <ScrollArea gap={14} px={16} py={16}>
        {requests.length === 0 ? (
          <MCard padding={18}>
            <Text style={s.emptyTitle}>No prescription requests yet</Text>
            <Text style={s.emptyBody}>
              Upload a prescription from any pharmacy-enabled provider to start a medication order.
            </Text>
            <MBtn
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate('FindService')}
            >
              Find a Pharmacy
            </MBtn>
          </MCard>
        ) : (
          requests.map(request => {
            const statusMeta = getStatusMeta(request.status)
            return (
              <MCard key={request.id} padding={16}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('PrescriptionDetail', { prescriptionId: request.id })
                  }
                >
                <View style={s.cardTopRow}>
                  <View style={s.cardTopCopy}>
                    <Text style={s.providerName}>{request.provider}</Text>
                    <Text style={s.requestRef}>{request.id}</Text>
                  </View>
                  <GGPill type={statusMeta.type}>{statusMeta.label}</GGPill>
                </View>

                <View style={s.metaGrid}>
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>For</Text>
                    <Text style={s.metaValue}>{request.for}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Fulfillment</Text>
                    <Text style={s.metaValue}>
                      {request.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'}
                    </Text>
                  </View>
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Submitted</Text>
                    <Text style={s.metaValue}>{formatDate(request.submittedAt)}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Attachment</Text>
                    <Text style={s.metaValue} numberOfLines={1}>
                      {request.attachment.name}
                    </Text>
                  </View>
                </View>

                {request.deliveryAddress ? (
                  <View style={s.noteBlock}>
                    <Text style={s.noteLabel}>Delivery Address</Text>
                    <Text style={s.noteBody}>{request.deliveryAddress}</Text>
                  </View>
                ) : null}

                {request.patientNotes ? (
                  <View style={s.noteBlock}>
                    <Text style={s.noteLabel}>Patient Notes</Text>
                    <Text style={s.noteBody}>{request.patientNotes}</Text>
                  </View>
                ) : null}

                {request.pharmacyNotes ? (
                  <View style={s.noteBlock}>
                    <Text style={s.noteLabel}>Pharmacy Notes</Text>
                    <Text style={s.noteBody}>{request.pharmacyNotes}</Text>
                  </View>
                ) : null}

                {request.quotedAmount != null || (request.quotedItems?.length ?? 0) > 0 ? (
                  <View style={s.noteBlock}>
                    <Text style={s.noteLabel}>Quote Summary</Text>
                    {request.quotedAmount != null ? (
                      <Text style={s.quoteAmount}>{formatCurrency(request.quotedAmount)}</Text>
                    ) : null}
                    {(request.quotedItems?.length ?? 0) > 0 ? (
                      <View style={s.quoteList}>
                        {request.quotedItems?.map((item, index) => (
                          <View key={`${request.id}-item-${index}`} style={s.quoteItemRow}>
                            <Text style={s.quoteItemName}>{item.name}</Text>
                            <Text style={s.quoteItemMeta}>
                              {item.quantity ?? '1 pack'}
                              {item.unitPrice != null ? ` - ${formatCurrency(item.unitPrice)}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {request.quotedAt ? (
                      <Text style={s.quoteTimestamp}>Quoted on {formatDate(request.quotedAt)}</Text>
                    ) : null}
                  </View>
                ) : null}

                {request.readyAt || request.fulfilledAt ? (
                  <View style={s.noteBlock}>
                    <Text style={s.noteLabel}>Order Timeline</Text>
                    {request.readyAt ? (
                      <Text style={s.noteBody}>Ready for pickup/delivery: {formatDate(request.readyAt)}</Text>
                    ) : null}
                    {request.fulfilledAt ? (
                      <Text style={s.noteBody}>Fulfilled: {formatDate(request.fulfilledAt)}</Text>
                    ) : null}
                  </View>
                ) : null}

                {request.status === 'quoted' ? (
                  <View style={s.actionHint}>
                    <Text style={s.actionHintText}>Quote ready — tap to accept or decline</Text>
                  </View>
                ) : null}

                <Text style={s.viewDetailLink}>View details →</Text>
                </Pressable>

                {request.invoiceId ? (
                  <View style={s.invoicePanel}>
                    <View style={s.invoiceCopy}>
                      <Text style={s.noteLabel}>Invoice</Text>
                      <Text style={s.invoiceRef}>{request.invoiceId}</Text>
                      <Text style={s.invoiceStatus}>
                        Status: {(request.invoiceStatus ?? 'pending_auth').replace('_', ' ')}
                      </Text>
                    </View>
                    <MBtn
                      variant="secondary"
                      sm
                      onPress={() =>
                        navigation.navigate('InvoicesTab', {
                          screen: 'InvoiceReview',
                          params: { invoiceId: request.invoiceId! },
                          initial: false,
                        } as never)
                      }
                    >
                      View Invoice
                    </MBtn>
                  </View>
                ) : null}
              </MCard>
            )
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default PrescriptionRequestsScreen

const s = StyleSheet.create({
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
  emptyTitle: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardTopCopy: {
    flex: 1,
    gap: 4,
  },
  providerName: {
    fontSize: 15,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  requestRef: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
  },
  metaGrid: {
    gap: 10,
  },
  metaItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
  noteBlock: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteLabel: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },
  quoteAmount: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    marginBottom: 10,
  },
  quoteList: {
    gap: 8,
  },
  quoteItemRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quoteItemName: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  quoteItemMeta: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },
  quoteTimestamp: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: fontWeights.medium,
    color: colors.textLight,
  },
  invoicePanel: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.default,
    backgroundColor: colors.blue3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  invoiceCopy: {
    flex: 1,
  },
  invoiceRef: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.navy,
    marginTop: 2,
  },
  invoiceStatus: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  actionHint: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.default,
    backgroundColor: colors.blue3,
  },
  actionHintText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.navy,
  },
  viewDetailLink: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
})
