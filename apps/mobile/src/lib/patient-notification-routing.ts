import type { Notification } from '@gg/shared-types'

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
  const screen = notification.screen?.trim()

  if (screen) {
    // Deep-link routes may carry query strings (e.g. `/app/credit/status?type=increase`).
    const screenPath = screen.split('?')[0]
    const normalizedScreen = screenPath.toLowerCase()

    const rescheduleMatch = screenPath.match(/^\/app\/appointments\/([^/]+)\/reschedule$/i)
    if (rescheduleMatch?.[1]) {
      navigation.navigate('HomeTab', {
        screen: 'RescheduleReview',
        params: { appointmentId: rescheduleMatch[1] },
      })
      return
    }

    const prescriptionMatch = screenPath.match(/^\/app\/prescriptions\/([^/]+)$/i)
    if (prescriptionMatch?.[1] && prescriptionMatch[1].toLowerCase() !== 'confirm') {
      navigation.navigate('ServicesTab', {
        screen: 'PrescriptionDetail',
        params: { prescriptionId: decodeURIComponent(prescriptionMatch[1]) },
      })
      return
    }

    const invoiceSuccessMatch = screenPath.match(/^\/app\/invoices\/([^/]+)\/success$/i)
    if (invoiceSuccessMatch?.[1]) {
      navigation.navigate('InvoicesTab', {
        screen: 'PaymentSuccess',
        params: { invoiceId: decodeURIComponent(invoiceSuccessMatch[1]) },
        initial: false,
      })
      return
    }

    const invoiceMatch = screenPath.match(/^\/app\/invoices\/([^/]+)/i)
    if (invoiceMatch?.[1]) {
      navigation.navigate('InvoicesTab', {
        screen: 'InvoiceReview',
        params: { invoiceId: decodeURIComponent(invoiceMatch[1]) },
        initial: false,
      })
      return
    }

    switch (normalizedScreen) {
      case 'appointments':
      case '/app/appointments':
        navigation.navigate('HomeTab', { screen: 'Appointments' })
        return
      case 'credit-increase':
        navigation.navigate('WalletTab', { screen: 'CreditIncrease' })
        return
      case 'credit-status':
        navigation.navigate('WalletTab', { screen: 'CreditStatus' })
        return
      case 'credit-wallet':
      case '/app/credit':
        navigation.navigate('WalletTab', { screen: 'CreditWallet' })
        return
      case '/app/credit/disclaimer':
        navigation.navigate('WalletTab', { screen: 'CreditDisclaimer' })
        return
      case '/app/credit/status':
        navigation.navigate('WalletTab', { screen: 'CreditStatus' })
        return
      case '/app/credit/increase':
        navigation.navigate('WalletTab', { screen: 'CreditIncrease' })
        return
      case 'find-service':
      case '/app/services':
        navigation.navigate('ServicesTab', { screen: 'FindService' })
        return
      case 'invoice-list':
      case 'invoice-review':
      case '/app/invoices':
        navigation.navigate('InvoicesTab', { screen: 'InvoiceList' })
        return
      case 'notifications':
      case '/app/notifications':
        navigation.navigate('Notifications')
        return
      case 'prescription-requests':
      case '/app/prescriptions':
        navigation.navigate('ServicesTab', { screen: 'PrescriptionRequests' })
        return
      case 'profile':
      case '/app/profile':
        navigation.navigate('ProfileTab', { screen: 'Profile' })
        return
      case 'ledger':
      case '/app/ledger':
        navigation.navigate('ProfileTab', { screen: 'HealthLedger' })
        return
      case 'ledger-access':
      case '/app/ledger/access':
        navigation.navigate('ProfileTab', { screen: 'LedgerAccess' })
        return
      case 'ledger-pin':
      case '/app/ledger/pin':
        navigation.navigate('ProfileTab', { screen: 'LedgerPinSetup' })
        return
      case 'transaction-history':
      case '/app/transactions':
        navigation.navigate('WalletTab', { screen: 'TransactionHistory' })
        return
      default:
        break
    }
  }

  switch (notification.type) {
    case 'appointment':
      navigation.navigate('HomeTab', { screen: 'Appointments' })
      return
    case 'invoice':
      navigation.navigate('InvoicesTab', { screen: 'InvoiceList' })
      return
    case 'payment':
      navigation.navigate('WalletTab', { screen: 'TransactionHistory' })
      return
    case 'credit':
      navigation.navigate('WalletTab', {
        screen: shouldOpenCreditIncrease(notification) ? 'CreditIncrease' : 'CreditWallet',
      })
      return
    case 'prescription':
      navigation.navigate('ServicesTab', { screen: 'PrescriptionRequests' })
      return
    case 'ledger':
      navigation.navigate('ProfileTab', { screen: 'HealthLedger' })
      return
    case 'system':
      navigation.navigate('ProfileTab', { screen: 'Profile' })
      return
    default:
      navigation.navigate('HomeTab', { screen: 'Dashboard' })
  }
}
