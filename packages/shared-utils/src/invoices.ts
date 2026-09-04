/** Pending invoices the patient can authorize now (prescription quotes must be reviewed first). */
export function isActionablePendingInvoice(invoice: {
  status: string
  isPrescription?: boolean
  prescriptionQuoteReviewed?: boolean
}): boolean {
  if (invoice.status !== 'pending_auth') return false
  if (invoice.isPrescription && !invoice.prescriptionQuoteReviewed) return false
  return true
}
