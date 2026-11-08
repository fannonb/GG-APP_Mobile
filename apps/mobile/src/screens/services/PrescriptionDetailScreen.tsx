import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  Linking,
} from 'react-native'
import Pressable from '@/components/Pressable'
import { useCurrency } from '@/lib/useCurrency'
import { PageTitle, GGPill, MBtn, MCard, Screen, ScrollArea, LoadError } from '@/components'
import {
  isChoosingPharmacy,
  isPrescriptionPaid,
  prescriptionInvoiceState,
  prescriptionOfferTotal,
  prescriptionOffers,
  prescriptionPharmacyLabel,
  prescriptionProgress,
  prescriptionSearch,
  prescriptionStage,
  prescriptionStatusPill,
  prescriptionTotal,
} from '@/lib/patient-parity'
import type { ServicesScreenProps } from '@/navigation/types'
import { colors, fontWeights, radii } from '@/theme'
import { openRemoteOrDataAttachment } from '@/lib/open-attachment'
import {
  useAcceptPrescriptionQuoteMutation,
  useDeclinePrescriptionOfferMutation,
  useDeclinePrescriptionQuoteMutation,
  useMarkPrescriptionQuoteReviewedMutation,
  usePatientPrescriptionRequests,
  useSelectPrescriptionOfferMutation,
} from '@gg/shared-hooks'
import { formatCurrency, formatDate } from '@gg/shared-utils'
import type { PrescriptionOffer, PrescriptionRequest } from '@gg/shared-types'

type NextContent = { title: string; body?: string; extra?: React.ReactNode }

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  )
}

/** The one thing to do or know next, in the same notice box as before. */
function NextStep({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <View style={s.notice}>
      <Text style={s.noticeTitle}>{title}</Text>
      {body ? <Text style={s.noticeText}>{body}</Text> : null}
      {children}
    </View>
  )
}

/** Where to go: address, how to get there, and a map link. Renders nothing when there is none. */
function PlaceDetails({
  addressLine,
  directions,
  mapUrl,
  onOpenMap,
}: {
  addressLine?: string
  directions?: string
  mapUrl?: string
  onOpenMap: (url: string) => void
}) {
  if (!addressLine && !directions && !mapUrl) return null
  return (
    <View style={s.placeBlock}>
      {addressLine ? <Text style={s.placeAddress}>{addressLine}</Text> : null}
      {directions ? (
        <View>
          <Text style={s.placeLabel}>How to get there</Text>
          <Text style={s.placeBody}>{directions}</Text>
        </View>
      ) : null}
      {mapUrl ? (
        <Pressable onPress={() => onOpenMap(mapUrl)} accessibilityRole="link">
          <Text style={s.linkText}>View on map</Text>
        </Pressable>
      ) : null}
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

/** Cancels the whole request, after one confirm step. */
function CancelRequest({ requestId }: { requestId: string }) {
  const cancelMutation = useDeclinePrescriptionQuoteMutation()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = async () => {
    setError(null)
    try {
      await cancelMutation.mutateAsync({ id: requestId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel this request. Please try again.')
    }
  }

  if (!confirming) {
    return (
      <Pressable onPress={() => setConfirming(true)}>
        <Text style={s.cancelLink}>Cancel this request</Text>
      </Pressable>
    )
  }

  return (
    <View style={s.confirmRow}>
      <Text style={s.confirmText}>Cancel this request?</Text>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <View style={s.confirmBtns}>
        <MBtn variant="secondary" sm style={s.flexBtn} disabled={cancelMutation.isPending} onPress={() => setConfirming(false)}>
          Keep request
        </MBtn>
        <MBtn variant="danger" sm style={s.flexBtn} disabled={cancelMutation.isPending} onPress={() => void cancel()}>
          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel request'}
        </MBtn>
      </View>
    </View>
  )
}

/** One nearby pharmacy's quote: choose it, or decline just this price. */
function OfferCard({
  offer,
  delivery,
  money,
  choosing,
  declining,
  disabled,
  onChoose,
  onDecline,
  onOpenMap,
}: {
  offer: PrescriptionOffer
  delivery: boolean
  money: (value: number) => string
  choosing: boolean
  declining: boolean
  disabled: boolean
  onChoose: () => void
  onDecline: () => void
  onOpenMap: (url: string) => void
}) {
  const [confirmDecline, setConfirmDecline] = useState(false)
  const items = offer.quotedItems ?? []
  const total = prescriptionOfferTotal(offer, delivery)

  return (
    <View style={s.offerCard}>
      <View style={s.offerTop}>
        <View style={s.offerCopy}>
          <Text style={s.offerName}>{offer.provider}</Text>
          <Text style={s.offerMeta}>
            {offer.distanceKm.toFixed(1)} km away{offer.rating ? ` · ★ ${offer.rating.toFixed(1)}` : ''}
          </Text>
        </View>
        <View style={s.offerPriceCol}>
          <Text style={s.offerTotal}>{money(total)}</Text>
          {delivery ? <Text style={s.offerMeta}>incl. {money(offer.deliveryFee ?? 0)} delivery</Text> : null}
        </View>
      </View>

      <PlaceDetails
        addressLine={offer.addressLine}
        directions={delivery ? undefined : offer.directions}
        mapUrl={offer.mapUrl}
        onOpenMap={onOpenMap}
      />

      {delivery ? <Text style={s.offerMeta}>Delivery is on credit only.</Text> : null}

      {items.length > 0 ? (
        <View style={s.offerItems}>
          {items.map((item, index) => (
            <View key={`${offer.id}-${index}`} style={s.offerItemRow}>
              <Text style={s.offerItemName}>
                {item.name}
                {item.quantity ? ` × ${item.quantity}` : ''}
                {item.substitute ? ` (substitute: ${item.substitute})` : ''}
              </Text>
              <Text style={s.offerItemPrice}>
                {item.unitPrice != null ? money(item.unitPrice * (Number.parseFloat(item.quantity || '1') || 1)) : '—'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {offer.pharmacyNotes ? <Text style={s.offerNote}>“{offer.pharmacyNotes}”</Text> : null}

      <MBtn variant="primary" fullWidth disabled={disabled} onPress={onChoose}>
        {choosing ? 'Choosing...' : 'Choose this pharmacy'}
      </MBtn>

      {confirmDecline ? (
        <View style={s.confirmRow}>
          <Text style={s.confirmText}>Decline this price?</Text>
          <View style={s.confirmBtns}>
            <MBtn variant="secondary" sm style={s.flexBtn} disabled={declining} onPress={() => setConfirmDecline(false)}>
              Keep
            </MBtn>
            <MBtn variant="danger" sm style={s.flexBtn} disabled={declining} onPress={onDecline}>
              {declining ? 'Declining...' : 'Decline'}
            </MBtn>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setConfirmDecline(true)} disabled={disabled}>
          <Text style={s.declineLink}>Decline this price</Text>
        </Pressable>
      )}
    </View>
  )
}

export function PrescriptionDetailScreen({
  navigation,
  route,
}: ServicesScreenProps<'PrescriptionDetail'>) {
  const currency = useCurrency()
  const { prescriptionId } = route.params
  const { data, isLoading, isError, isFetching, refetch } = usePatientPrescriptionRequests()
  const requests = (data ?? []) as PrescriptionRequest[]
  const request = useMemo(
    () => requests.find(item => item.id === prescriptionId),
    [prescriptionId, requests],
  )

  const [previewOpen, setPreviewOpen] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [choosingOfferId, setChoosingOfferId] = useState<string | null>(null)
  const [decliningOfferId, setDecliningOfferId] = useState<string | null>(null)

  /* Mark a quoted prescription as reviewed as soon as the patient views it —
     mirrors the web app so quoteReviewedAt is recorded before accept/decline. */
  const reviewMutation = useMarkPrescriptionQuoteReviewedMutation()
  const selectOffer = useSelectPrescriptionOfferMutation()
  const declineOffer = useDeclinePrescriptionOfferMutation()
  const reviewedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!request || request.status !== 'quoted' || request.quoteReviewedAt) return
    if (reviewedIdsRef.current.has(request.id)) return
    reviewedIdsRef.current.add(request.id)
    reviewMutation.mutate(request.id, { onError: () => reviewedIdsRef.current.delete(request.id) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, request?.status, request?.quoteReviewedAt])

  if (isLoading && !request) {
    return (
      <Screen header="detail">
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading prescription request...</Text>
        </View>
      </Screen>
    )
  }

  if (!request) {
    return (
      <Screen header="detail">
        <ScrollArea gap={14} px={16} py={16}>
          <PageTitle title="Prescription Request" subtitle="Not found" />
          {isError ? <LoadError title="We couldn't load this prescription." onRetry={() => void refetch()} retrying={isFetching} /> : (
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
          )}
        </ScrollArea>
      </Screen>
    )
  }

  const stage = prescriptionStage(request)
  const choosing = isChoosingPharmacy(request)
  const delivery = request.fulfillmentMode === 'delivery'
  const pharmacy = request.provider ?? 'The pharmacy'
  const statusPill = prescriptionStatusPill(request)
  const offers = prescriptionOffers(request)
  const search = prescriptionSearch(request)
  const sortedOffers = [...offers].sort(
    (a, b) => prescriptionOfferTotal(a, delivery) - prescriptionOfferTotal(b, delivery),
  )
  const invoiceState = prescriptionInvoiceState(request)
  const attachment = request.attachment
  const attachmentUrl = attachment.url ?? attachment.dataUrl ?? ''
  const isImage =
    attachment.type === 'image' ||
    attachment.mimeType?.startsWith('image/') ||
    attachmentUrl.startsWith('data:image/')
  const items = request.quotedItems ?? []
  const hasQuote = request.quotedAmount != null || items.length > 0
  const total = prescriptionTotal(request)
  const money = (value: number) => formatCurrency(value, currency)
  const progress = prescriptionProgress(request)
  const sentTo = request.pharmaciesContacted != null
    ? `${search.asked} ${search.asked === 1 ? 'pharmacy' : 'pharmacies'} within ${search.radiusKm} km`
    : `Nearby pharmacies within ${search.radiusKm} km`

  const findPharmacy = () => navigation.navigate('PrescriptionRequest')

  const openMap = (url: string) => {
    setActionError(null)
    Linking.openURL(url).catch(() => setActionError('Unable to open the map on your device.'))
  }

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

  const handleChooseOffer = async (offerId: string) => {
    setActionError(null)
    setChoosingOfferId(offerId)
    try {
      await selectOffer.mutateAsync({ id: request.id, offerId })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to choose this pharmacy. Please try again.')
    } finally {
      setChoosingOfferId(null)
    }
  }

  const handleDeclineOffer = async (offerId: string) => {
    setActionError(null)
    setDecliningOfferId(offerId)
    try {
      await declineOffer.mutateAsync({ id: request.id, offerId })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to decline this price. Please try again.')
    } finally {
      setDecliningOfferId(null)
    }
  }

  const sendNewButton = (
    <MBtn variant="primary" fullWidth onPress={findPharmacy}>
      Send a new request
    </MBtn>
  )

  const findAnotherButton = (
    <MBtn variant="secondary" fullWidth onPress={findPharmacy}>
      Find another pharmacy
    </MBtn>
  )

  const pickupPlace = (
    <PlaceDetails
      addressLine={request.providerAddressLine}
      directions={request.providerDirections}
      mapUrl={request.providerMapUrl}
      onOpenMap={openMap}
    />
  )

  // ── Next step: one message for the current stage ──
  const nextContent = (): NextContent => {
    if (stage === 'closed') {
      if (request.status === 'expired') {
        return {
          title: 'No pharmacies available near you',
          body: 'No registered pharmacy near you could fill this prescription. You can send a new request.',
          extra: sendNewButton,
        }
      }
      if (request.status === 'rejected') {
        return {
          title: `${pharmacy} couldn’t fill this`,
          body: request.declineReason
            ? `Reason: ${request.declineReason}. You can send it to another pharmacy.`
            : 'You can send it to another pharmacy.',
          extra: findAnotherButton,
        }
      }
      return {
        title: 'This order was cancelled',
        body: request.declineReason
          ? `You declined this quote: ${request.declineReason}`
          : 'You can send the same prescription again.',
        extra: findAnotherButton,
      }
    }

    if (choosing && offers.length > 0) {
      return {
        title: `${offers.length} ${offers.length === 1 ? 'pharmacy has' : 'pharmacies have'} sent a price`,
        body: `Compare them below and choose one. Choosing one tells them to prepare it. ${
          delivery
            ? 'You pay the invoice once it has been delivered.'
            : 'You go to collect and pay there; the invoice is sent when you arrive.'
        } Nothing is charged until you approve it with your PIN.${
          request.pharmaciesPending ? ` ${request.pharmaciesPending} more may still reply.` : ''
        }`,
        extra: <CancelRequest requestId={request.id} />,
      }
    }

    if (choosing && request.pharmaciesContacted === 0) {
      return {
        title: 'No pharmacies available near you',
        body: 'No registered pharmacy near you could take this prescription. You can send a new request.',
        extra: sendNewButton,
      }
    }

    if (choosing) {
      const counts = request.pharmaciesContacted != null
        ? `Asked ${search.asked} ${search.asked === 1 ? 'pharmacy' : 'pharmacies'} within ${search.radiusKm} km. ${search.replied} replied, ${search.declined} declined.`
        : `Searching within ${search.radiusKm} km.`
      const widened = search.widened
        ? `Nobody within 2 km could fill it, so we widened the search to ${search.radiusKm} km.`
        : ''
      return {
        title: 'Waiting for quotes',
        body: [counts, widened, 'We’ll notify you as prices arrive.'].filter(Boolean).join(' '),
        extra: <CancelRequest requestId={request.id} />,
      }
    }

    switch (stage) {
      case 'reviewQuote':
        return {
          title: `${pharmacy} sent a price`,
          body: `Check the items and total below. ${
            delivery
              ? 'Accepting tells them to prepare it. You pay the invoice once it has been delivered.'
              : 'Accepting tells them to prepare it. You go to collect and pay there; the invoice is sent when you arrive.'
          } Nothing is charged until you approve it with your PIN.`,
        }
      case 'approvePayment':
        return delivery
          ? {
            title: 'Delivered. Pay the invoice',
            body: `Approve invoice ${request.invoiceId} with your PIN to pay for your delivery.`,
          }
          : {
            title: 'Pay at the counter',
            body: `Review invoice ${request.invoiceId}${total > 0 ? ` (${money(total)})` : ''} and approve it with your PIN.`,
            extra: pickupPlace,
          }
      case 'awaitQuote':
        return {
          title: `Waiting for ${pharmacy}`,
          body: 'They are checking stock and will send you a price. We’ll notify you when it arrives.',
        }
      case 'awaitInvoice':
        return delivery
          ? {
            title: 'The pharmacy is preparing your order',
            body: 'You’ll get the invoice after delivery.',
          }
          : {
            title: `Go to ${pharmacy} to collect and pay`,
            body: 'The pharmacy sends the invoice when you get there; approve it with your PIN at the counter.',
            extra: pickupPlace,
          }
      case 'preparing':
        return delivery
          ? {
            title: 'The pharmacy is preparing your order',
            body: 'You’ll get the invoice after delivery.',
          }
          : {
            title: 'Being prepared',
            body: `${pharmacy} is getting your order ready. We’ll tell you when it’s ready for pickup.`,
          }
      case 'ready':
        return delivery
          ? {
            title: 'Ready and on its way',
            body: `${pharmacy} will deliver to ${request.deliveryAddress ?? 'your address'}.`,
          }
          : {
            title: `Ready for pickup at ${pharmacy}`,
            body: 'Bring your ID when you collect it.',
            extra: pickupPlace,
          }
      case 'done':
        return {
          title: `${delivery ? 'Delivered' : 'Collected'}${request.fulfilledAt ? ` on ${formatDate(request.fulfilledAt)}` : ''}`,
          body: isPrescriptionPaid(request) ? 'Your payment has been approved.' : 'This order is complete.',
        }
    }
  }
  const next = nextContent()

  const offersCard = choosing && sortedOffers.length > 0 ? (
    <MCard padding={16}>
      <View style={s.cardTopRow}>
        <Text style={s.sectionTitle}>Prices from nearby pharmacies</Text>
        <Text style={s.metaSmall}>Within {search.radiusKm} km</Text>
      </View>
      <View style={s.offerList}>
        {sortedOffers.map(offer => (
          <OfferCard
            key={offer.id}
            offer={offer}
            delivery={delivery}
            money={money}
            choosing={choosingOfferId === offer.id}
            declining={decliningOfferId === offer.id}
            disabled={selectOffer.isPending || declineOffer.isPending}
            onChoose={() => void handleChooseOffer(offer.id)}
            onDecline={() => void handleDeclineOffer(offer.id)}
            onOpenMap={openMap}
          />
        ))}
      </View>
    </MCard>
  ) : null

  return (
    <Screen header="detail">
      <ScrollArea gap={14} px={16} py={16}>
        <PageTitle title={request.id} subtitle={`${prescriptionPharmacyLabel(request)} · ${request.for}`} />
        <MCard padding={16}>
          <View style={s.cardTopRow}>
            <Text style={s.sectionTitle}>Request Details</Text>
            <GGPill type={statusPill.tone}>{statusPill.label}</GGPill>
          </View>
          <InfoRow label="Submitted" value={formatDate(request.submittedAt)} />
          <InfoRow label="Pharmacy" value={request.provider ?? (choosing ? 'Not chosen yet' : '—')} />
          {choosing ? <InfoRow label="Sent to" value={sentTo} /> : null}
          <InfoRow label="For" value={request.for} />
          <InfoRow
            label="Fulfillment"
            value={delivery ? 'Delivery' : 'Pickup'}
          />
          {request.deliveryAddress ? (
            <InfoRow label="Delivery address" value={request.deliveryAddress} />
          ) : null}
          {request.patientNotes ? <InfoRow label="Your notes" value={request.patientNotes} /> : null}
          {request.pharmacyNotes ? (
            <InfoRow label="Pharmacy notes" value={request.pharmacyNotes} />
          ) : null}
        </MCard>

        <NextStep title={next.title} body={next.body}>
          {next.extra}
        </NextStep>
        {actionError ? <Text style={s.errorText}>{actionError}</Text> : null}

        {offersCard}

        <MCard padding={16}>
          <Text style={s.sectionTitle}>Order progress</Text>
          {progress.map(step => (
            <InfoRow key={step.label} label={step.label} value={step.done ? (step.at ? formatDate(step.at) : 'Complete') : 'Pending'} />
          ))}
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

        {!choosing && hasQuote ? (
          <MCard padding={16}>
            <Text style={s.sectionTitle}>Quote from Pharmacy</Text>
            {items.map((item, index) => (
              <View key={`${request.id}-item-${index}`} style={s.quoteRow}>
                <Text style={s.quoteName}>
                  {item.name}
                  {item.quantity ? ` × ${item.quantity}` : ''}
                </Text>
                <Text style={s.quotePrice}>
                  {item.unitPrice != null ? money(item.unitPrice) : '—'}
                </Text>
              </View>
            ))}
            {request.quotedAmount != null ? (
              <>
              <InfoRow label="Medicines subtotal" value={money(request.quotedAmount)} />
              {delivery && (
                <InfoRow label="Delivery fee" value={money(request.deliveryFee ?? 0)} />
              )}
              <View style={s.quoteTotalRow}>
                <Text style={s.quoteTotalLabel}>Total</Text>
                <Text style={s.quoteTotalValue}>{money(total)}</Text>
              </View>
              </>
            ) : null}
            {request.quotedAt ? (
              <Text style={s.quoteTimestamp}>Quoted on {formatDate(request.quotedAt)}</Text>
            ) : null}
            <QuoteDecision request={request} />
          </MCard>
        ) : null}

        {request.invoiceId ? (
          <MCard padding={16}>
            <Text style={s.sectionTitle}>{invoiceState.paid ? 'Payment complete' : invoiceState.canPay ? 'Invoice ready' : 'Invoice'}</Text>
            <Text style={s.invoiceCopy}>
              {invoiceState.paid ? 'Your payment has been approved. You can view the receipt below.'
                : invoiceState.closed ? 'This order is closed. You can view the linked invoice below.'
                : invoiceState.canPay ? 'Review the invoice and approve it with your PIN.'
                : 'View the invoice for its current status.'}
            </Text>
            <View style={s.invoicePanel}>
              <View style={{ flex: 1 }}>
                <Text style={s.metaLabel}>Invoice</Text>
                <Text style={s.invoiceRef}>{request.invoiceId}</Text>
              </View>
              <GGPill type={invoiceState.paid ? 'success' : request.invoiceStatus === 'pending_auth' ? 'warning' : 'info'}>
                {(request.invoiceStatus ?? 'pending').replace('_', ' ')}
              </GGPill>
            </View>
            <MBtn
              variant="primary"
              fullWidth
              onPress={() =>
                navigation.navigate('InvoicesTab', {
                  screen: invoiceState.paid ? 'PaymentSuccess' : 'InvoiceReview',
                  params: { invoiceId: request.invoiceId! },
                  initial: false,
                } as never)
              }
            >
              {invoiceState.action}
            </MBtn>
          </MCard>
        ) : null}

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
        <Pressable style={s.modalBackdrop} onPress={() => setPreviewOpen(false)} feedback="none">
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
    fontSize: 15.5,
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
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 22,
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
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  metaSmall: {
    fontSize: 12.5,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
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
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14.5,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  fileName: {
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14.5,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
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
    fontSize: 14.5,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    marginBottom: 4,
  },
  placeholderBody: {
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 14.5,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  quotePrice: {
    fontSize: 14.5,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  quoteTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  quoteTotalLabel: {
    fontSize: 15.5,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  quoteTotalValue: {
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  quoteTimestamp: {
    marginTop: 10,
    fontSize: 12.5,
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
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 22,
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
    fontSize: 13.5,
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
    fontSize: 15.5,
    fontFamily: fontWeights.regular,
    color: colors.text,
    backgroundColor: colors.card,
  },
  notice: {
    padding: 16,
    gap: 10,
    borderRadius: radii.default,
    backgroundColor: colors.blue3,
  },
  noticeTitle: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    lineHeight: 22,
  },
  noticeText: {
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.blueInk,
    lineHeight: 20,
  },
  placeBlock: {
    gap: 8,
    padding: 12,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  placeAddress: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
    lineHeight: 20,
  },
  placeLabel: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  placeBody: {
    fontSize: 13.5,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 20,
  },
  offerList: {
    gap: 12,
  },
  offerCard: {
    gap: 10,
    padding: 14,
    borderRadius: radii.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  offerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  offerPriceCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  },
  offerName: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  offerMeta: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 19,
  },
  offerTotal: {
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  offerItems: {
    gap: 6,
  },
  offerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  offerItemName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.text,
  },
  offerItemPrice: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  offerNote: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  declineLink: {
    alignSelf: 'center',
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
  },
  cancelLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
  },
  confirmRow: {
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
  invoiceCopy: {
    fontSize: 14.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 22,
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
    fontSize: 13.5,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
  },
  invoiceRef: {
    fontSize: 14.5,
    fontFamily: fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  errorText: {
    fontSize: 13.5,
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
