import { getLowCreditThreshold, isCreditRunningLow } from '@gg/shared-utils'

/*
 * Home "Needs your attention" notices that come from account state, ported from
 * the PWA's patient DashboardScreen. Ids, conditions and copy match web so the
 * dismiss rules (attention-dismissals.ts) behave the same on both.
 */

export interface HomeNotice {
  id: string
  title: string
  detail: string
  actionLabel: string
  /** Credit review only: the pending application is a limit increase. */
  increase?: boolean
  /** Ids this notice was saved under before it was renamed (see attention-dismissals.ts). */
  legacyIds?: string[]
}

export const LOW_BALANCE_ID = 'credit-low'
export const CREDIT_REVIEW_ID = 'credit-review'

/** Approved accounts that are not under review, below the country's buffer. */
export function lowBalanceNotice(input: {
  creditStatus: string
  available: number
  countryCode: string
  format: (amount: number) => string
}): HomeNotice | null {
  const underReview = input.creditStatus === 'pending'
  const low = input.creditStatus === 'approved' && !underReview && isCreditRunningLow(input.available, input.countryCode)
  if (!low) return null
  return {
    id: LOW_BALANCE_ID,
    title: 'Your allocation is running low',
    detail: `${input.format(input.available)} left, below the ${input.format(getLowCreditThreshold(input.countryCode))} buffer we recommend.`,
    actionLabel: 'Request increase',
  }
}

/** While the finance partner reviews an application or a limit increase. */
export function creditReviewNotice(input: {
  creditStatus: string
  applicationType?: string | null
  partnerName: string
}): HomeNotice | null {
  if (input.creditStatus !== 'pending') return null
  const increase = input.applicationType === 'increase'
  return {
    id: CREDIT_REVIEW_ID,
    title: increase ? 'Limit increase under review' : 'Allocation application under review',
    detail: `${input.partnerName} is reviewing your request. We'll notify you as soon as there's a decision.`,
    actionLabel: 'View status',
    increase,
  }
}

export interface PendingVisit {
  id: string | number
  date: string
  time: string
  provider?: string
  service?: string
  rescheduledAt?: string | null
}

/** The first upcoming visit still waiting on the provider (not a reschedule proposal). */
export function findPendingVisit<T extends PendingVisit>(visits: T[], statusOf: (visit: T) => string): T | undefined {
  return visits
    .filter(visit => {
      const status = statusOf(visit)
      return status !== 'completed' && status !== 'cancelled'
    })
    .find(visit => statusOf(visit) === 'pending' && !visit.rescheduledAt)
}

export function pendingAppointmentNotice(visit: PendingVisit, formatTime: (time: string) => string): HomeNotice {
  const day = new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    id: `pending-${visit.id}`,
    title: 'Waiting for the provider to confirm',
    detail: `${visit.provider ?? 'Your provider'} · ${day} at ${formatTime(visit.time)} · ${visit.service ?? ''}`,
    actionLabel: 'View',
  }
}

/** Web's "Invoice waiting for your approval", with its count and "provider · amount" detail. */
export function pendingInvoiceNotice(input: {
  invoiceId: string
  count: number
  providerName: string
  amount: number
  format: (amount: number) => string
}): HomeNotice {
  return {
    id: `invoice-${input.invoiceId}`,
    title: input.count > 1 ? `${input.count} invoices waiting for your approval` : 'Invoice waiting for your approval',
    detail: `${input.providerName} · ${input.format(input.amount)}`,
    actionLabel: 'Review & approve',
    // Dismissals saved under the old copy's id still hide it.
    legacyIds: [`pending-invoice-${input.invoiceId}`],
  }
}

/** Web's "New appointment time proposed", with the proposed date and time. */
export function rescheduleNotice(visit: PendingVisit, formatTime: (time: string) => string): HomeNotice {
  const day = new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const service = visit.service ? ` · ${visit.service}` : ''
  return {
    id: `reschedule-${visit.id}`,
    title: 'New appointment time proposed',
    detail: `${visit.provider ?? 'Your provider'} suggested ${day} at ${formatTime(visit.time)}${service}`,
    actionLabel: 'Respond',
  }
}
