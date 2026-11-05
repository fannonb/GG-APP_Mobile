import type { CreditApplication, CreditStatusResponse, LedgerEntry, PrescriptionRequest } from '@gg/shared-types'

export function prescriptionTotal(request: Pick<PrescriptionRequest, 'quotedAmount' | 'deliveryFee'>) {
  return Math.round(((request.quotedAmount ?? 0) + (request.deliveryFee ?? 0)) * 100) / 100
}

export function prescriptionInvoiceState(request: Pick<PrescriptionRequest, 'status' | 'invoiceStatus'>) {
  const paid = request.invoiceStatus === 'paid' || request.invoiceStatus === 'authorized'
  const closed = request.status === 'rejected' || request.status === 'cancelled'
  const canPay = !closed && request.invoiceStatus === 'pending_auth'
  return { paid, closed, canPay, action: paid ? 'View receipt' : canPay ? 'Review & Pay →' : 'View invoice' }
}

export function prescriptionProgress(request: PrescriptionRequest) {
  const closed = request.status === 'cancelled' || request.status === 'rejected'
  const order = ['submitted', 'quoted', 'accepted', 'preparing', 'ready', 'fulfilled']
  const current = order.indexOf(request.status)
  const steps = [
    { label: 'Submitted', date: request.submittedAt, done: true },
    { label: 'Quote received', date: request.quotedAt, done: current >= 1 || !!request.quotedAt },
    { label: 'Quote accepted', date: request.acceptedAt, done: current >= 2 || !!request.acceptedAt },
    { label: request.fulfillmentMode === 'delivery' ? 'Ready for delivery' : 'Ready for pickup', date: request.readyAt, done: current >= 4 || !!request.readyAt },
    { label: request.fulfillmentMode === 'delivery' ? 'Delivered' : 'Collected', date: request.fulfilledAt, done: current >= 5 || !!request.fulfilledAt },
  ]
  return closed
    ? [...steps.filter(step => step.done), { label: request.status === 'rejected' ? 'Declined by pharmacy' : 'Cancelled', date: request.declinedAt, done: true }]
    : steps
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
