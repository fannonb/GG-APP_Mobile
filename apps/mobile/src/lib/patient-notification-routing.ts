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
  const normalizedScreen = screen?.toLowerCase()

  if (screen) {
    const rescheduleMatch = screen.match(/^\/app\/appointments\/([^/]+)\/reschedule$/i)
    if (rescheduleMatch?.[1]) {
      navigation.navigate('HomeTab', {
        screen: 'RescheduleReview',
        params: { appointmentId: rescheduleMatch[1] },
      })
      return
    }

    const prescriptionMatch = screen.match(/^\/app\/prescriptions\/([^/]+)$/i)
    if (prescriptionMatch?.[1] && prescriptionMatch[1].toLowerCase() !== 'confirm') {
      navigation.navigate('ServicesTab', {
        screen: 'PrescriptionDetail',
        params: { prescriptionId: decodeURIComponent(prescriptionMatch[1]) },
      })
      return
    }

    const invoiceMatch = screen.match(/^\/app\/invoices\/([^/]+)/i)
    if (invoiceMatch?.[1]) {
      navigation.navigate('InvoicesTab', {
        screen: 'InvoiceReview',
        params: { invoiceId: decodeURIComponent(invoiceMatch[1]) },
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
        navigation.navigate('ProfileTab', { screen: 'Notifications' })
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
