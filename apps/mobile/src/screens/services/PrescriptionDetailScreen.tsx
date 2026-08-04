import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
  TextInput,
  Modal,
} from 'react-native'
import { AppBar, GGPill, MBtn, MCard, Screen, ScrollArea } from '@/components'
import type { ServicesScreenProps } from '@/navigation/types'
import { colors, fontWeights, radii } from '@/theme'
import { openRemoteOrDataAttachment } from '@/lib/open-attachment'
import {
  useAcceptPrescriptionQuoteMutation,
  useDeclinePrescriptionQuoteMutation,
  usePatientPrescriptionRequests,
} from '@gg/shared-hooks'
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  )
}

function StatusNotice({ request }: { request: PrescriptionRequest }) {
  if (request.invoiceId) return null

  const copy: Partial<Record<PrescriptionRequest['status'], string>> = {
    submitted:
      'The pharmacy is reviewing your prescription. You will be notified as soon as a quote is ready.',
    accepted: `You accepted this quote. The pharmacy will prepare your order and notify you once it's ${
      request.fulfillmentMode === 'delivery' ? 'out for delivery' : 'ready for pickup'
    }.`,
    preparing: 'The pharmacy is preparing your order.',
    ready: `Your order is ready for ${
      request.fulfillmentMode === 'delivery' ? 'delivery' : 'pickup'
    }. An invoice will be sent once it's ${
      request.fulfillmentMode === 'delivery' ? 'delivered' : 'picked up'
    }.`,
    fulfilled: `Your order has been ${
      request.fulfillmentMode === 'delivery' ? 'delivered' : 'collected'
    }. The pharmacy is preparing your invoice — you'll be notified once it's ready to pay.`,
    cancelled: request.declineReason
      ? `You declined this quote: ${request.declineReason}`
      : 'This prescription request was cancelled.',
  }

  const message = copy[request.status]
  if (!message) return null

  return (
    <View style={s.notice}>
      <Text style={s.noticeText}>{message}</Text>
    </View>
  )
}

function QuoteDecision({ request }: { request: PrescriptionRequest }) {
  const acceptMutation = useAcceptPrescriptionQuoteMutation()
  const declineMutation = useDeclinePrescriptionQuoteMutation()
  const [showDecline, setShowDecline] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (request.status !== 'quoted') return null

  const busy = acceptMutation.isPending || declineMutation.isPending

  const handleAccept = async () => {
    setError(null)
    try {
      await acceptMutation.mutateAsync(request.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept this quote. Please try again.')
    }
  }

  const handleDecline = async () => {
    setError(null)
    try {
      await declineMutation.mutateAsync({
        id: request.id,
        reason: reason.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to decline this quote. Please try again.')
    }
  }

  return (
    <View style={s.decisionBlock}>
      <Text style={s.decisionCopy}>
        Accept this quote to let the pharmacy prepare your order, or decline if you'd like to cancel.
      </Text>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {showDecline ? (
        <View style={s.declineForm}>
          <Text style={s.reasonLabel}>Reason (optional)</Text>
          <TextInput
            style={s.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. price is too high, found it elsewhere"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={s.decisionRow}>
            <MBtn
              variant="secondary"
              fullWidth
              disabled={busy}
              onPress={() => {
                setShowDecline(false)
                setReason('')
                setError(null)
              }}
              style={s.decisionBtn}
            >
              Back
            </MBtn>
            <MBtn
              variant="danger"
              fullWidth
              disabled={busy}
              onPress={() => void handleDecline()}
              style={s.decisionBtn}
            >
              {declineMutation.isPending ? 'Declining...' : 'Confirm Decline'}
            </MBtn>
          </View>
        </View>
      ) : (
        <View style={s.decisionRow}>
          <MBtn
            variant="secondary"
            fullWidth
            disabled={busy}
            onPress={() => setShowDecline(true)}
            style={s.decisionBtn}
          >
            Decline
          </MBtn>
          <MBtn
            variant="primary"
            fullWidth
            disabled={busy}
            onPress={() => void handleAccept()}
            style={s.decisionBtn}
          >
            {acceptMutation.isPending ? 'Accepting...' : 'Accept Quote →'}
          </MBtn>
        </View>
      )}
    </View>
  )
}

export function PrescriptionDetailScreen({
  navigation,
  route,
}: ServicesScreenProps<'PrescriptionDetail'>) {
  const { prescriptionId } = route.params
  const { data, isLoading } = usePatientPrescriptionRequests()
  const requests = (data ?? []) as PrescriptionRequest[]
  const request = useMemo(
    () => requests.find(item => item.id === prescriptionId),
    [prescriptionId, requests],
  )

  const [previewOpen, setPreviewOpen] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)

  if (isLoading && !request) {
    return (
      <Screen>
        <AppBar title="Prescription Request" subtitle="Loading..." back />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading prescription request...</Text>
        </View>
      </Screen>
    )
  }

  if (!request) {
    return (
      <Screen>
        <AppBar title="Prescription Request" subtitle="Not found" back />
        <ScrollArea gap={14} px={16} py={16}>
          <MCard padding={18}>
            <Text style={s.emptyTitle}>Request not found</Text>
            <Text style={s.emptyBody}>
              This prescription request could not be found. It may have been removed or the link is
              outdated.
            </Text>
            <MBtn
              variant="secondary"
              fullWidth
              onPress={() => navigation.navigate('PrescriptionRequests')}
            >
              ← All Prescription Requests
            </MBtn>
          </MCard>
        </ScrollArea>
      </Screen>
    )
  }

  const statusMeta = getStatusMeta(request.status)
  const attachment = request.attachment
  const attachmentUrl = attachment.url ?? attachment.dataUrl ?? ''
  const isImage =
    attachment.type === 'image' ||
    attachment.mimeType?.startsWith('image/') ||
    attachmentUrl.startsWith('data:image/')

  const openAttachment = async () => {
    setAttachError(null)
    if (!attachmentUrl) {
      setAttachError('Preview unavailable for this file.')
      return
    }
    if (isImage) {
      setPreviewOpen(true)
      return
    }
    try {
      await openRemoteOrDataAttachment({
        url: attachmentUrl,
        fileName: attachment.name ?? 'prescription',
        mimeType: attachment.mimeType ?? 'application/pdf',
        cacheKey: `prescription-${request.id}`,
      })
    } catch {
      setAttachError('Unable to open this attachment on your device.')
    }
  }

  return (
    <Screen>
      <AppBar
        title={request.id}
        subtitle={`${request.provider ?? 'Pharmacy'} · ${request.for}`}
        back
      />

      <ScrollArea gap={14} px={16} py={16}>
        <MCard padding={16}>
          <View style={s.cardTopRow}>
            <Text style={s.sectionTitle}>Request Details</Text>
            <GGPill type={statusMeta.type}>{statusMeta.label}</GGPill>
          </View>
          <InfoRow label="Submitted" value={formatDate(request.submittedAt)} />
          <InfoRow label="Pharmacy" value={request.provider ?? '—'} />
          <InfoRow label="For" value={request.for} />
          <InfoRow
            label="Fulfillment"
            value={request.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'}
          />
          {request.deliveryAddress ? (
            <InfoRow label="Delivery address" value={request.deliveryAddress} />
          ) : null}
          {request.patientNotes ? <InfoRow label="Your notes" value={request.patientNotes} /> : null}
          {request.pharmacyNotes ? (
            <InfoRow label="Pharmacy notes" value={request.pharmacyNotes} />
          ) : null}
        </MCard>

        <MCard padding={16}>
          <View style={s.cardTopRow}>
            <Text style={s.sectionTitle}>Prescription File</Text>
            {attachmentUrl ? (
              <Pressable onPress={() => void openAttachment()}>
                <Text style={s.linkText}>{isImage ? 'Preview' : 'Open'}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={s.fileName}>{attachment.name ?? 'Uploaded prescription'}</Text>
          {isImage && attachmentUrl ? (
            <Pressable onPress={() => setPreviewOpen(true)}>
              <Image source={{ uri: attachmentUrl }} style={s.previewThumb} resizeMode="contain" />
            </Pressable>
          ) : (
            <View style={s.previewPlaceholder}>
              <Text style={s.placeholderTitle}>
                {attachmentUrl ? 'Tap Open to view file' : 'Preview unavailable'}
              </Text>
              <Text style={s.placeholderBody}>
                {attachmentUrl
                  ? 'Documents open in an external viewer when supported.'
                  : 'This file can\'t be previewed in the app.'}
              </Text>
            </View>
          )}
          {attachError ? <Text style={s.errorText}>{attachError}</Text> : null}
        </MCard>

        {(request.quotedAmount != null || (request.quotedItems?.length ?? 0) > 0) && (
          <MCard padding={16}>
            <Text style={s.sectionTitle}>Quote from Pharmacy</Text>
            {(request.quotedItems ?? []).map((item, index) => (
              <View key={`${request.id}-item-${index}`} style={s.quoteRow}>
                <Text style={s.quoteName}>
                  {item.name}
                  {item.quantity ? ` × ${item.quantity}` : ''}
                </Text>
                <Text style={s.quotePrice}>
                  {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                </Text>
              </View>
            ))}
            {request.quotedAmount != null ? (
              <View style={s.quoteTotalRow}>
                <Text style={s.quoteTotalLabel}>Total</Text>
                <Text style={s.quoteTotalValue}>{formatCurrency(request.quotedAmount)}</Text>
              </View>
            ) : null}
            {request.quotedAt ? (
              <Text style={s.quoteTimestamp}>Quoted on {formatDate(request.quotedAt)}</Text>
            ) : null}
            <QuoteDecision request={request} />
          </MCard>
        )}

        {request.invoiceId ? (
          <MCard padding={16}>
            <Text style={s.sectionTitle}>Invoice Ready</Text>
            <Text style={s.invoiceCopy}>
              Your {request.fulfillmentMode === 'delivery' ? 'delivery' : 'pickup'} has been
              confirmed. Pay the invoice below to complete this order.
            </Text>
            <View style={s.invoicePanel}>
              <View style={{ flex: 1 }}>
                <Text style={s.metaLabel}>Invoice</Text>
                <Text style={s.invoiceRef}>{request.invoiceId}</Text>
              </View>
              <GGPill type={request.invoiceStatus === 'pending_auth' ? 'warning' : 'info'}>
                {(request.invoiceStatus ?? 'pending').replace('_', ' ')}
              </GGPill>
            </View>
            <MBtn
              variant="primary"
              fullWidth
              onPress={() =>
                navigation.navigate('InvoicesTab', {
                  screen: 'InvoiceReview',
                  params: { invoiceId: request.invoiceId! },
                } as never)
              }
            >
              Review & Pay →
            </MBtn>
          </MCard>
        ) : (
          <StatusNotice request={request} />
        )}

        <MBtn
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate('PrescriptionRequests')}
        >
          ← All Prescription Requests
        </MBtn>

        <View style={{ height: 24 }} />
      </ScrollArea>

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setPreviewOpen(false)}>
          <View style={s.modalCard}>
            {attachmentUrl ? (
              <Image source={{ uri: attachmentUrl }} style={s.modalImage} resizeMode="contain" />
            ) : null}
            <MBtn variant="secondary" fullWidth onPress={() => setPreviewOpen(false)}>
              Close
            </MBtn>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  )
}

export default PrescriptionDetailScreen

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
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  previewThumb: {
    width: '100%',
    height: 220,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  previewPlaceholder: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    marginBottom: 4,
  },
  placeholderBody: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 18,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quoteName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  quotePrice: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  quoteTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  quoteTotalLabel: {
    fontSize: 14,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  quoteTotalValue: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  quoteTimestamp: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: fontWeights.medium,
    color: colors.textLight,
  },
  decisionBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  decisionCopy: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 12,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionBtn: {
    flex: 1,
  },
  declineForm: {
    gap: 10,
  },
  reasonLabel: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  reasonInput: {
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.default,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.text,
    backgroundColor: colors.card,
  },
  notice: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.default,
    backgroundColor: colors.blue3,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.blueInk,
    lineHeight: 18,
  },
  invoiceCopy: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
    marginBottom: 14,
  },
  invoicePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: 14,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  invoiceRef: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: colors.error,
    marginBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9,28,68,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 16,
    gap: 14,
  },
  modalImage: {
    width: '100%',
    height: 420,
  },
})
