import type { Notification, PrescriptionRequest } from '@gg/shared-types'

/**
 * Dashboard banner derivation — ported from the PWA
 * (gg-app/src/utils/credit-notifications.ts and prescription-notifications.ts)
 * so mobile shows the same notification-driven banners as web: a banner is
 * visible while its source notification is unread, and the CTA/dismiss marks
 * that notification read (see DashboardScreen).
 */
export interface NotifBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
  /** Source notification — used for routing and marking read. Absent for synthetic items. */
  notification?: Notification
}

function toBannerItem(notification: Notification): NotifBannerItem {
  return {
    id: notification.id,
    headline: notification.title,
    detail: notification.body,
    screen: notification.screen,
    notification,
  }
}

export function getUnreadCreditApprovalItems(notifications: Notification[]): NotifBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'credit' &&
        /approved/i.test(notification.title),
    )
    .map(toBannerItem)
}

export function getUnreadConfirmedAppointmentItems(notifications: Notification[]): NotifBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'appointment' &&
        /confirm/i.test(notification.title),
    )
    .map(toBannerItem)
}

export function getUnreadProviderCancelledAppointmentItems(notifications: Notification[]): NotifBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'appointment' &&
        /cancelled by provider/i.test(notification.title),
    )
    .map(toBannerItem)
}

function isPrescriptionQuoteNotification(notification: Notification) {
  return (
    notification.type === 'prescription' &&
    (/quote ready/i.test(notification.title) ||
      /sent pricing/i.test(notification.title) ||
      /sent pricing/i.test(notification.body) ||
      /review and accept or decline/i.test(notification.body))
  )
}

export function getUnreadPrescriptionQuoteItems(notifications: Notification[]): NotifBannerItem[] {
  return notifications
    .filter(notification => !notification.read && isPrescriptionQuoteNotification(notification))
    .map(toBannerItem)
}

/**
 * Quote banners from unread notifications plus synthetic banners for quoted
 * prescriptions that never produced a notification. Synthetic ids use the
 * `rx-` prefix (see isSyntheticPrescriptionBannerId) and are dismissed via
 * the persisted dismissed-id set instead of marking a notification read.
 */
export function buildPrescriptionQuoteBannerItems(
  notifications: Notification[],
  prescriptions: PrescriptionRequest[],
  dismissedIds: Set<string>,
): NotifBannerItem[] {
  const fromNotifications = getUnreadPrescriptionQuoteItems(notifications).filter(
    item => !dismissedIds.has(item.id),
  )

  const coveredPrescriptionIds = new Set(
    fromNotifications
      .map(item => item.screen?.match(/\/app\/prescriptions\/([^/]+)/)?.[1])
      .filter((id): id is string => Boolean(id)),
  )

  const fromPrescriptions: NotifBannerItem[] = prescriptions
    .filter(request => request.status === 'quoted')
    .filter(request => !coveredPrescriptionIds.has(request.id))
    .filter(request => !dismissedIds.has(`rx-${request.id}`))
    .map(request => ({
      id: `rx-${request.id}`,
      headline: 'Quote Ready',
      detail: `${request.provider ?? 'Your pharmacy'} sent pricing for prescription ${request.id}. Review and accept or decline the quote to continue.`,
      screen: `/app/prescriptions/${request.id}`,
    }))

  return [...fromNotifications, ...fromPrescriptions]
}

export function getUnreadPrescriptionReadyItems(notifications: Notification[]): NotifBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'prescription' &&
        /medication ready/i.test(notification.title),
    )
    .map(toBannerItem)
}

export function getUnreadPrescriptionInvoiceItems(notifications: Notification[]): NotifBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'invoice' &&
        (/invoice ready for payment/i.test(notification.title) ||
          /medication invoice/i.test(notification.body)),
    )
    .map(toBannerItem)
}

export function isSyntheticPrescriptionBannerId(id: string) {
  return id.startsWith('rx-')
}
