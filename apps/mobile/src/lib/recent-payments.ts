import type { PatientInvoice, Transaction } from '@gg/shared-types'

export type PaymentType = 'appointment' | 'prescription'

export interface RecentPaymentRow {
  tx: Transaction
  /** Appointment unless the linked invoice is a prescription invoice. */
  paymentType: PaymentType
  /** Set when the linked invoice was for a family member. */
  forWhom: { name: string; relation?: string } | null
}

/**
 * Every payment, newest first, each joined to its invoice by reference
 * (Transaction.invoiceId is the invoice's id). A payment with no matching
 * invoice is an appointment payment for the patient.
 */
export function recentPaymentRows(transactions: Transaction[], invoices: PatientInvoice[]): RecentPaymentRow[] {
  const invoiceById = new Map(invoices.map(invoice => [invoice.id, invoice] as const))
  return [...transactions]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .map((tx): RecentPaymentRow => {
      const invoice = tx.invoiceId ? invoiceById.get(tx.invoiceId) : undefined
      const paymentType: PaymentType = invoice?.isPrescription ? 'prescription' : 'appointment'
      const beneficiary = invoice?.serviceFor?.type === 'beneficiary' ? invoice.serviceFor : null
      return {
        tx,
        paymentType,
        forWhom: beneficiary ? { name: beneficiary.name, relation: beneficiary.relation || undefined } : null,
      }
    })
}

/** The newest payment that did not fail: the "Last payment" figure. */
export function lastSettledPayment(rows: RecentPaymentRow[]): Transaction | undefined {
  return rows.find(row => row.tx.status !== 'failed')?.tx
}
