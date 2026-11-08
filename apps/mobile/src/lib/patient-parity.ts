import type { CreditApplication, CreditStatusResponse, LedgerEntry, PrescriptionOffer, PrescriptionRequest } from '@gg/shared-types'

export function prescriptionTotal(request: Pick<PrescriptionRequest, 'quotedAmount' | 'deliveryFee'>) {
  return Math.round(((request.quotedAmount ?? 0) + (request.deliveryFee ?? 0)) * 100) / 100
}

/** One pharmacy's quote as the patient would pay it. The delivery fee only applies to delivery. */
export function prescriptionOfferTotal(offer: Pick<PrescriptionOffer, 'quotedAmount' | 'deliveryFee'>, delivery: boolean) {
  return Math.round(((offer.quotedAmount ?? 0) + (delivery ? (offer.deliveryFee ?? 0) : 0)) * 100) / 100
}

/** Quotes from nearby pharmacies the patient can still choose from. */
export function prescriptionOffers(request: Pick<PrescriptionRequest, 'offers'>) {
  return (request.offers ?? []).filter(offer => offer.status === 'quoted')
}

export const isPrescriptionPaid = (r: PrescriptionRequest) => r.invoiceStatus === 'paid' || r.invoiceStatus === 'authorized'

/** Still out to nearby pharmacies: no pharmacy chosen yet. */
export const isChoosingPharmacy = (r: PrescriptionRequest) =>
  r.providerId == null && (r.status === 'submitted' || r.status === 'quoted')

/** Where a prescription order stands from the patient's point of view. */
export type PrescriptionStage = 'reviewQuote' | 'approvePayment' | 'awaitQuote' | 'awaitInvoice' | 'preparing' | 'ready' | 'done' | 'closed'

export function prescriptionStage(r: PrescriptionRequest): PrescriptionStage {
  if (r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired') return 'closed'
  if (r.status === 'quoted') return 'reviewQuote'
  // A fulfilled order can still be waiting for the patient to approve its invoice.
  if (r.invoiceId && r.invoiceStatus === 'pending_auth') return 'approvePayment'
  if (r.status === 'fulfilled') return 'done'
  if (r.status === 'submitted') return 'awaitQuote'
  if (r.status === 'ready') return 'ready'
  if (r.status === 'accepted' && !r.invoiceId) return 'awaitInvoice'
  return 'preparing'
}

/** Status pill for the order: the tone maps straight onto GGPill. */
export function prescriptionStatusPill(r: PrescriptionRequest): {
  tone: 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending'
  label: string
} {
  const stage = prescriptionStage(r)
  if (stage === 'closed') {
    if (r.status === 'expired') return { tone: 'error', label: 'No pharmacy found' }
    if (r.status === 'rejected') return { tone: 'error', label: 'Declined by pharmacy' }
    return { tone: 'error', label: 'Cancelled' }
  }
  if (isChoosingPharmacy(r)) {
    return prescriptionOffers(r).length > 0
      ? { tone: 'info', label: 'Choose a pharmacy' }
      : { tone: 'warning', label: 'Searching' }
  }
  switch (stage) {
    case 'reviewQuote':
      return { tone: 'warning', label: 'Quote to review' }
    case 'awaitQuote':
      return { tone: 'warning', label: 'Waiting for quote' }
    case 'approvePayment':
      return { tone: 'warning', label: 'Invoice ready' }
    case 'awaitInvoice':
      return { tone: 'info', label: 'Accepted' }
    case 'preparing':
      return { tone: 'pending', label: 'Preparing' }
    case 'ready':
      return { tone: 'success', label: 'Ready' }
    case 'done':
      return { tone: 'success', label: 'Fulfilled' }
  }
}

/** Who the order is with: the chosen pharmacy, the number of quotes, or "waiting". */
export function prescriptionPharmacyLabel(r: PrescriptionRequest) {
  if (r.provider) return r.provider
  const quotes = prescriptionOffers(r).length
  if (quotes > 0) return `${quotes} ${quotes === 1 ? 'quote' : 'quotes'}`
  if (isChoosingPharmacy(r)) return 'Waiting for quotes'
  return 'Nearby pharmacies'
}

/** How the nearby search is going, for the "Waiting for quotes" copy. */
export function prescriptionSearch(r: PrescriptionRequest) {
  const asked = r.pharmaciesContacted ?? 0
  const pending = r.pharmaciesPending ?? 0
  const radiusKm = r.searchRadiusKm ?? (r.widenedAt ? 6 : 2)
  return {
    asked,
    // Pharmacies that are no longer pending have replied, with a quote or a decline.
    replied: Math.max(0, asked - pending),
    declined: r.pharmaciesDeclined ?? 0,
    radiusKm,
    /** The search only goes past the first 2 km ring once nobody close enough could fill it. */
    widened: radiusKm > 2,
  }
}

const STATUS_ORDER: PrescriptionRequest['status'][] = ['submitted', 'quoted', 'accepted', 'preparing', 'ready', 'fulfilled']

/** Sent → Quotes → Pharmacy chosen → Invoice paid → Ready → Collected/Delivered, each with its date when known. */
export function prescriptionProgress(r: PrescriptionRequest): { label: string; done: boolean; at?: string }[] {
  const delivery = r.fulfillmentMode === 'delivery'
  const current = STATUS_ORDER.indexOf(r.status)
  const steps = [
    { label: 'Sent', done: true, at: r.submittedAt },
    { label: 'Quotes received', done: prescriptionOffers(r).length > 0 || current >= 1 || r.quotedAt != null, at: r.quotedAt },
    { label: 'Pharmacy chosen', done: current >= 2 || r.acceptedAt != null, at: r.acceptedAt },
    { label: 'Invoice paid', done: isPrescriptionPaid(r) },
    { label: delivery ? 'Ready for delivery' : 'Ready for pickup', done: current >= 4 || r.readyAt != null, at: r.readyAt },
    { label: delivery ? 'Delivered' : 'Collected', done: current >= 5 || r.fulfilledAt != null, at: r.fulfilledAt },
  ]
  if (r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired') {
    // Show where the order stopped instead of the steps that never happened.
    const stop = r.status === 'rejected' ? 'Declined by pharmacy' : r.status === 'expired' ? 'No pharmacy found' : 'Cancelled'
    return [...steps.filter(step => step.done), { label: stop, done: true, at: r.declinedAt ?? r.expiredAt }]
  }
  return steps
}

/** Invoice state for the invoice card: the pay action only shows while the invoice awaits approval. */
export function prescriptionInvoiceState(request: Pick<PrescriptionRequest, 'status' | 'invoiceStatus'>) {
  const paid = request.invoiceStatus === 'paid' || request.invoiceStatus === 'authorized'
  const closed = request.status === 'rejected' || request.status === 'cancelled' || request.status === 'expired'
  const canPay = !closed && request.invoiceStatus === 'pending_auth'
  return { paid, closed, canPay, action: paid ? 'View receipt' : canPay ? 'Review and pay invoice' : 'View invoice' }
}

export type CreditDecision = 'pending' | 'under-review' | 'approved' | 'declined'

/** The latest application decision takes precedence over an existing credit account. */
export function creditDecision(application: CreditApplication | null, accountStatus?: CreditStatusResponse['creditStatus']): CreditDecision {
  if (application) {
    if (application.status === 'rejected') return 'declined'
    if (application.status === 'approved') return 'approved'
    return 'under-review'
  }
  if (accountStatus === 'approved') return 'approved'
  if (accountStatus === 'rejected') return 'declined'
  if (accountStatus === 'pending') return 'under-review'
  return 'pending'
}

export function ledgerSnapshot(entries: LedgerEntry[], now = Date.now()) {
  const own = entries.filter(entry => ['', 'self', 'me'].includes((entry.beneficiaryName ?? '').replace(/\s*\([^)]*\)/, '').trim().toLowerCase()))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const vitals = own.find((entry): entry is Extract<LedgerEntry, { kind: 'visit' }> =>
    entry.kind === 'visit' && Object.values(entry.vitals).some(Boolean))
  const medicines = [...new Set(own
    .filter((entry): entry is Extract<LedgerEntry, { kind: 'prescription' }> => {
      const age = now - Date.parse(entry.date)
      return entry.kind === 'prescription' && age >= 0 && age <= 90 * 86_400_000
    })
    .flatMap(entry => entry.items.map(item => item.name)))].slice(0, 5)
  return { vitals, medicines }
}
