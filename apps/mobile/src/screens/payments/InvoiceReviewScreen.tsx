import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  Pressable,
} from 'react-native'
import { ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, GGPill } from '@/components'
import { openRemoteOrDataAttachment } from '@/lib/open-attachment'
import { usePatientInvoice, usePatientInvoiceAttachment, useRejectInvoiceMutation } from '@gg/shared-hooks'
import { formatCurrency, formatDate, isCreditRunningLow, wouldBeLowAfterPayment } from '@gg/shared-utils'
import { getCountryByCode } from '@gg/shared-config'
import { useUserStore } from '@gg/shared-stores'
import type { PatientInvoice, InvoiceLineItem } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */
function getStatusPill(status: string): { type: 'warning' | 'info' | 'success' | 'error' | 'default'; label: string } {
  switch (status) {
    case 'pending_auth': return { type: 'warning', label: 'Awaiting Auth' }
    case 'authorized':   return { type: 'info', label: 'Authorized' }
    case 'paid':         return { type: 'success', label: 'Paid' }
    case 'rejected':     return { type: 'error', label: 'Rejected' }
    default:             return { type: 'default', label: status }
  }
}

/* ------------------------------------------------------------------ */
/*  Detail Row                                                         */
/* ------------------------------------------------------------------ */
function DetailRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[s.detailRow, !isLast && s.detailRowBorder]}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */
export function InvoiceReviewScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const invoiceId: string = route.params?.invoiceId ?? ''

  const user = useUserStore(s => s.user)
  const country = getCountryByCode(user?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'

  const { data: invoice, isLoading } = usePatientInvoice(invoiceId)
  const { data: attachment } = usePatientInvoiceAttachment(invoiceId, !!invoice)
  const rejectMutation = useRejectInvoiceMutation()

  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showAttachment, setShowAttachment] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [openingAttachment, setOpeningAttachment] = useState(false)

  const inv = invoice as PatientInvoice | undefined

  if (isLoading || !inv) {
    return (
      <Screen>
        <AppBar title="Invoice Detail" subtitle={invoiceId || 'Loading...'} />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading invoice...</Text>
        </View>
      </Screen>
    )
  }

  const providerName = typeof inv.provider === 'object' ? inv.provider?.name : inv.provider ?? 'Provider'
  const providerAddress = typeof inv.provider === 'object' ? inv.provider?.address : ''
  const invoiceStatus: string = inv.status ?? 'pending_auth'
  const statusPill = getStatusPill(invoiceStatus)
  const amount: number = inv.amount ?? 0
  const hasApprovedCredit = user?.creditStatus === 'approved'
  const walletPayAmount = Math.min(Math.max(0, user?.creditAvailable ?? 0), amount)
  const offAppDue = Math.max(0, Number((amount - walletPayAmount).toFixed(2)))
  const isPartialPay = walletPayAmount > 0 && offAppDue > 0
  const canAuthorize = hasApprovedCredit && walletPayAmount > 0
  const hasNoWalletBalance = hasApprovedCredit && walletPayAmount <= 0
  const balanceAlreadyLow =
    hasApprovedCredit && isCreditRunningLow(user?.creditAvailable ?? 0, user?.countryCode ?? 'KE')
  const balanceLowAfterPayment =
    hasApprovedCredit &&
    walletPayAmount > 0 &&
    wouldBeLowAfterPayment(user?.creditAvailable ?? 0, walletPayAmount, user?.countryCode ?? 'KE')
  const invoiceDate: string = inv.date ?? ''
  const services: InvoiceLineItem[] = (inv as any).services ?? []
  const serviceName = services[0]?.name ?? (inv as any).service ?? 'Healthcare Service'
  const billedToName = (inv as any).billedTo?.name ?? user?.name ?? 'Patient'
  const invoiceRef = inv.id ?? invoiceId
  const attachmentUrl = (attachment as any)?.url ?? (inv as any).attachmentUrl ?? ''
  const attachmentFileName =
    (attachment as any)?.fileName ??
    (inv as any).attachmentFileName ??
    'invoice-attachment'
  const attachmentMimeType = (attachment as any)?.mimeType ?? ''
  const isImage = attachmentUrl.startsWith?.('data:image/')
  const isPending = invoiceStatus === 'pending_auth'

  const handleReject = () => {
    rejectMutation.mutate(
      { invoiceId: invoiceRef, reason: rejectReason },
      {
        onSuccess: () => {
          setShowReject(false)
          setRejectReason('')
        },
      },
    )
  }

  const handleAttachmentPress = async () => {
    setAttachmentError(null)

    if (!attachmentUrl) {
      setAttachmentError('Attachment unavailable right now.')
      return
    }

    if (isImage) {
      setShowAttachment(true)
      return
    }

    try {
      setOpeningAttachment(true)
      await openRemoteOrDataAttachment({
        url: attachmentUrl,
        fileName: attachmentFileName,
        mimeType: attachmentMimeType || 'application/pdf',
        cacheKey: `invoice-${invoiceRef}`,
      })
    } catch (error) {
      setAttachmentError(
        error instanceof Error
          ? error.message
          : 'Unable to open this attachment on your device.',
      )
    } finally {
      setOpeningAttachment(false)
    }
  }

  return (
    <Screen>
      <AppBar title="Invoice Detail" subtitle={invoiceRef} />

      <ScrollArea gap={16} px={16} py={14}>
        {/* === Invoice Card === */}
        <MCard padding={0}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Text style={s.fromLabel}>Invoice From</Text>
              <Text style={s.providerName}>{providerName}</Text>
              {providerAddress ? <Text style={s.providerAddress}>{providerAddress}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <GGPill type={statusPill.type}>{statusPill.label}</GGPill>
              {inv.isPrescription ? <GGPill type="info">Prescription</GGPill> : null}
            </View>
          </View>

          <View style={s.divider} />

          {/* Detail rows */}
          <View style={s.detailSection}>
            <DetailRow label="Invoice Ref" value={invoiceRef} />
            <DetailRow label="Date" value={invoiceDate ? formatDate(invoiceDate) : '-'} />
            <DetailRow label="Billed To" value={billedToName} isLast />
          </View>

          {/* Line-item breakdown */}
          {services.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.lineItemSection}>
                <Text style={s.lineItemHeader}>{inv.isPrescription ? 'Medications' : 'Services Rendered'}</Text>
                {services.map((svc: InvoiceLineItem, i: number) => (
                  <View key={i} style={[s.lineItemRow, i < services.length - 1 && s.lineItemBorder]}>
                    <Text style={s.lineItemName}>{svc.name}</Text>
                    <Text style={s.lineItemAmount}>{formatCurrency(svc.amount, currency)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {services.length === 0 && (
            <>
              <View style={s.divider} />
              <View style={s.detailSection}>
                <DetailRow label="Service" value={serviceName} isLast />
              </View>
            </>
          )}

          <View style={s.dividerThick} />

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalValue}>{formatCurrency(amount, currency)}</Text>
          </View>
        </MCard>

        {/* === Attachment === */}
        {attachmentUrl ? (
          <Pressable onPress={() => void handleAttachmentPress()}>
            <MCard padding={14}>
              <View style={s.attachRow}>
                <Text style={s.attachIcon}>📎</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.attachTitle}>Invoice Attachment</Text>
                  <Text style={s.attachSub}>
                    {attachmentFileName} · Tap to {isImage ? 'preview image' : 'open document'}
                  </Text>
                </View>
                <Text style={s.attachCta}>
                  {openingAttachment ? 'Opening...' : isImage ? 'View' : 'Open'}
                </Text>
              </View>
            </MCard>
          </Pressable>
        ) : null}

        {attachmentError ? (
          <Text style={s.attachmentError}>{attachmentError}</Text>
        ) : null}

        {/* === Payment Summary === */}
        {isPending && (
          <MCard padding={16}>
            <Text style={s.summaryTitle}>Payment Summary</Text>
            <DetailRow label="Invoice Amount" value={formatCurrency(amount, currency)} />
            <DetailRow label="Available Balance" value={formatCurrency(user?.creditAvailable ?? 0, currency)} />
            <DetailRow
              label="Pay from GG'APP"
              value={formatCurrency(walletPayAmount, currency)}
            />
            {isPartialPay && (
              <DetailRow
                label="Pay off-app to provider"
                value={formatCurrency(offAppDue, currency)}
              />
            )}
            <DetailRow
              label="Balance After In-App Pay"
              value={formatCurrency((user?.creditAvailable ?? 0) - walletPayAmount, currency)}
              isLast
            />

            <Text style={s.summaryNote}>
              {isPartialPay
                ? `Your allocation covers ${formatCurrency(walletPayAmount, currency)}. Pay the remaining ${formatCurrency(offAppDue, currency)} off-app to ${providerName}.`
                : 'You will enter your payment PIN three times to authorize the in-app portion.'}
            </Text>

            {!hasApprovedCredit && (
              <Text style={s.summaryWarning}>
                Approved healthcare credit is required before you can authorize this invoice.
              </Text>
            )}
            {hasNoWalletBalance && (
              <Text style={s.summaryError}>
                Your GG'APP allocation is fully used. Settle this invoice directly with your provider.
              </Text>
            )}
            {balanceAlreadyLow && (
              <Text style={s.summaryWarning}>
                Your credit balance is running low. Consider requesting a limit increase.
              </Text>
            )}
            {balanceLowAfterPayment && !balanceAlreadyLow && (
              <Text style={s.summaryWarning}>
                After this payment, your balance will be running low.
              </Text>
            )}
          </MCard>
        )}

        {/* === Authorize Button === */}
        {isPending && (
          <MBtn
            variant="action"
            fullWidth
            disabled={!canAuthorize}
            onPress={() =>
              navigation.navigate('PINAuth', {
                invoiceId: invoiceRef,
                amount,
                walletPayAmount,
                offAppDue,
                provider: providerName,
              })
            }
          >
            {isPartialPay
              ? `Authorize ${formatCurrency(walletPayAmount, currency)} In-App`
              : 'Authorize Payment'}
          </MBtn>
        )}

        {/* === Reject Section === */}
        {isPending && !showReject && (
          <MBtn
            variant="secondary"
            fullWidth
            onPress={() => setShowReject(true)}
            style={s.rejectToggle}
          >
            Reject Invoice
          </MBtn>
        )}

        {isPending && showReject && (
          <MCard padding={16}>
            <Text style={s.rejectTitle}>Reject This Invoice</Text>
            <Text style={s.rejectDesc}>
              Describe what is incorrect or why you are rejecting this invoice.
              The provider will be notified.
            </Text>
            <TextInput
              style={s.rejectInput}
              placeholder="Describe what is incorrect..."
              placeholderTextColor={colors.textLight}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={s.rejectBtnRow}>
              <MBtn
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => { setShowReject(false); setRejectReason('') }}
              >
                Cancel
              </MBtn>
              <MBtn
                variant="primary"
                style={[{ flex: 2 }, s.rejectBtn]}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onPress={handleReject}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Invoice'}
              </MBtn>
            </View>
          </MCard>
        )}

        {/* === Non-pending: Back button === */}
        {!isPending && (
          <MBtn variant="secondary" fullWidth onPress={() => navigation.goBack()}>
            Back to Invoices
          </MBtn>
        )}

        {/* === Rejected reason display === */}
        {invoiceStatus === 'rejected' && (inv as any).rejectionReason && (
          <MCard padding={14}>
            <Text style={s.rejectedLabel}>Rejection Reason</Text>
            <Text style={s.rejectedReason}>{(inv as any).rejectionReason}</Text>
          </MCard>
        )}

        <View style={{ height: 24 }} />
      </ScrollArea>

      {/* === Attachment Modal === */}
      {showAttachment && attachmentUrl && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setShowAttachment(false)}>
          <View style={s.attachModal}>
            <View style={s.attachModalHeader}>
              <Text style={s.attachModalTitle}>Invoice Attachment</Text>
              <Pressable onPress={() => setShowAttachment(false)} style={s.attachModalClose}>
                <Text style={s.attachModalCloseText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={s.attachModalBody} contentContainerStyle={s.attachModalBodyContent}>
              {isImage ? (
                <Image source={{ uri: attachmentUrl }} style={s.attachImage} resizeMode="contain" />
              ) : (
                <View style={s.attachFallback}>
                  <Text style={s.attachFallbackText}>Open this document externally.</Text>
                  <Text style={s.attachFallbackSub}>
                    PDFs and office files are opened with your device's document apps.
                  </Text>
                  <MBtn
                    variant="primary"
                    onPress={() => void handleAttachmentPress()}
                    style={s.attachOpenBtn}
                  >
                    {openingAttachment ? 'Opening...' : 'Open Attachment'}
                  </MBtn>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </Screen>
  )
}

export default InvoiceReviewScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: fontWeights.medium, color: colors.textSub },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
  cardHeaderLeft: { flex: 1, gap: 4 },
  fromLabel: { fontSize: 10, fontFamily: fontWeights.bold, color: colors.textSub, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  providerName: { fontSize: 15, fontFamily: fontWeights.extraBold, color: colors.text, letterSpacing: -0.3 },
  providerAddress: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },
  dividerThick: { height: 2, backgroundColor: colors.border, marginHorizontal: 20 },

  detailSection: { paddingHorizontal: 20, paddingVertical: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.textSub },
  detailValue: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.text, maxWidth: '55%', textAlign: 'right' },

  lineItemSection: { paddingHorizontal: 20, paddingVertical: 10 },
  lineItemHeader: { fontSize: 11, fontFamily: fontWeights.bold, color: colors.textSub, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  lineItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lineItemName: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.text, flex: 1 },
  lineItemAmount: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.text, marginLeft: 12 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  totalLabel: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.text },
  totalValue: { fontSize: 22, fontFamily: fontWeights.extraBold, color: colors.text, letterSpacing: -0.5 },

  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  attachIcon: { fontSize: 20 },
  attachTitle: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.text },
  attachSub: { fontSize: 11, fontFamily: fontWeights.regular, color: colors.textSub, marginTop: 1 },
  attachCta: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.blue },
  attachmentError: { fontSize: 12, fontFamily: fontWeights.medium, color: colors.error, marginTop: -4 },

  summaryTitle: { fontSize: 15, fontFamily: fontWeights.extraBold, color: colors.text, marginBottom: 8 },
  summaryNote: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 18, marginTop: 12 },
  summaryWarning: { fontSize: 12, fontFamily: fontWeights.medium, color: colors.warning, lineHeight: 18, marginTop: 10, padding: 10, backgroundColor: colors.warningBg, borderRadius: radii.default },
  summaryError: { fontSize: 12, fontFamily: fontWeights.medium, color: colors.error, lineHeight: 18, marginTop: 10, padding: 10, backgroundColor: colors.errorBg, borderRadius: radii.default },

  rejectToggle: { borderColor: colors.error },
  rejectTitle: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.error, marginBottom: 6 },
  rejectDesc: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 18, marginBottom: 12 },
  rejectInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontWeights.regular, fontSize: 14, color: colors.text, backgroundColor: colors.bg, minHeight: 90 },
  rejectBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rejectBtn: { backgroundColor: colors.error },

  rejectedLabel: { fontSize: 11, fontFamily: fontWeights.bold, color: colors.error, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  rejectedReason: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 19 },

  attachModal: { flex: 1, backgroundColor: '#FFFFFF' },
  attachModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  attachModalTitle: { fontSize: 16, fontFamily: fontWeights.bold, color: colors.text },
  attachModalClose: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.navy, borderRadius: 8 },
  attachModalCloseText: { fontSize: 13, fontFamily: fontWeights.semiBold, color: '#FFFFFF' },
  attachModalBody: { flex: 1 },
  attachModalBodyContent: { padding: 20, alignItems: 'center' },
  attachImage: { width: '100%', height: 500 },
  attachFallback: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  attachFallbackText: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.textSub },
  attachFallbackSub: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textLight },
  attachOpenBtn: { marginTop: 8, minWidth: 200 },
})
