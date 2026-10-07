import type { Notification } from '@gg/shared-types'
import { TAB_ROOTS } from '@/navigation/tabRoots'

type PatientNotificationNavigation = {
  navigate: (routeName: string, params?: unknown) => void
}

function shouldOpenCreditIncrease(notification: Notification) {
  const text = `${notification.title} ${notification.body ?? notification.message ?? ''}`.toLowerCase()
  return text.includes('increase') || text.includes('low balance')
}

export function openPatientNotification(
  navigation: PatientNotificationNavigation,
  notification: Notification,
) {
  // The Notifications screen sits above the tab navigator in the root stack, so a
  // bare navigate('InvoicesTab') from there is "not handled by any navigator"
  // (React Navigation 7 doesn't search sibling navigators). Routing through the
  // root 'App' screen works from the tabs and from Notifications alike.
  // Deeper screens keep the tab's root underneath them, so Back lands there.
  const goToTab = (tab: string, params: { screen: string; params?: object; initial?: boolean }) =>
    navigation.navigate('App', {
      screen: tab,
      params: params.screen === TAB_ROOTS[tab] ? params : { initial: false, ...params },
    })

  const screen = notification.screen?.trim()

  if (screen) {
    // Deep-link routes may carry query strings (e.g. `/app/credit/status?type=increase`).
    const screenPath = screen.split('?')[0]
    const normalizedScreen = screenPath.toLowerCase()

    const rescheduleMatch = screenPath.match(/^\/app\/appointments\/([^/]+)\/reschedule$/i)
    if (rescheduleMatch?.[1]) {
      goToTab('HomeTab', {
        screen: 'RescheduleReview',
        params: { appointmentId: rescheduleMatch[1] },
      })
      return
    }

    const prescriptionMatch = screenPath.match(/^\/app\/prescriptions\/([^/]+)$/i)
    if (prescriptionMatch?.[1] && prescriptionMatch[1].toLowerCase() !== 'confirm') {
      goToTab('ServicesTab', {
        screen: 'PrescriptionDetail',
        params: { prescriptionId: decodeURIComponent(prescriptionMatch[1]) },
      })
      return
    }

    const invoiceSuccessMatch = screenPath.match(/^\/app\/invoices\/([^/]+)\/success$/i)
    if (invoiceSuccessMatch?.[1]) {
      goToTab('InvoicesTab', {
        screen: 'PaymentSuccess',
        params: { invoiceId: decodeURIComponent(invoiceSuccessMatch[1]) },
        initial: false,
      })
      return
    }

    const invoiceMatch = screenPath.match(/^\/app\/invoices\/([^/]+)/i)
    if (invoiceMatch?.[1]) {
      goToTab('InvoicesTab', {
        screen: 'InvoiceReview',
        params: { invoiceId: decodeURIComponent(invoiceMatch[1]) },
        initial: false,
      })
      return
    }

    switch (normalizedScreen) {
      case 'appointments':
      case '/app/appointments':
        goToTab('HomeTab', { screen: 'Appointments' })
        return
      case 'credit-increase':
        goToTab('WalletTab', { screen: 'CreditIncrease' })
        return
      case 'credit-status':
        goToTab('WalletTab', { screen: 'CreditStatus' })
        return
      case 'credit-wallet':
      case '/app/credit':
        goToTab('WalletTab', { screen: 'CreditWallet' })
        return
      case '/app/credit/disclaimer':
        goToTab('WalletTab', { screen: 'CreditDisclaimer' })
        return
      case '/app/credit/status':
        goToTab('WalletTab', { screen: 'CreditStatus' })
        return
      case '/app/credit/increase':
        goToTab('WalletTab', { screen: 'CreditIncrease' })
        return
      case 'find-service':
      case '/app/services':
        goToTab('ServicesTab', { screen: 'FindService' })
        return
      case 'invoice-list':
      case 'invoice-review':
      case '/app/invoices':
        goToTab('InvoicesTab', { screen: 'InvoiceList' })
        return
      case 'notifications':
      case '/app/notifications':
        navigation.navigate('Notifications')
        return
      case 'prescription-requests':
      case '/app/prescriptions':
        goToTab('ServicesTab', { screen: 'PrescriptionRequests' })
        return
      case 'profile':
      case '/app/profile':
        goToTab('ProfileTab', { screen: 'Profile' })
        return
      case 'ledger':
      case '/app/ledger':
        goToTab('ProfileTab', { screen: 'HealthLedger' })
        return
      case 'ledger-access':
      case '/app/ledger/access':
        goToTab('ProfileTab', { screen: 'LedgerAccess' })
        return
      case 'ledger-pin':
      case '/app/ledger/pin':
        goToTab('ProfileTab', { screen: 'LedgerPinSetup' })
        return
      case 'transaction-history':
      case '/app/transactions':
        goToTab('WalletTab', { screen: 'TransactionHistory' })
        return
      default:
        break
    }
  }

  switch (notification.type) {
    case 'appointment':
      goToTab('HomeTab', { screen: 'Appointments' })
      return
    case 'invoice':
      goToTab('InvoicesTab', { screen: 'InvoiceList' })
      return
    case 'payment':
      goToTab('WalletTab', { screen: 'TransactionHistory' })
      return
    case 'credit':
      goToTab('WalletTab', {
        screen: shouldOpenCreditIncrease(notification) ? 'CreditIncrease' : 'CreditWallet',
      })
      return
    case 'prescription':
      goToTab('ServicesTab', { screen: 'PrescriptionRequests' })
      return
    case 'ledger':
      goToTab('ProfileTab', { screen: 'HealthLedger' })
      return
    case 'system':
      goToTab('ProfileTab', { screen: 'Profile' })
      return
    default:
      goToTab('HomeTab', { screen: 'Dashboard' })
  }
}
