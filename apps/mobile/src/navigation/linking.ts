import * as Linking from 'expo-linking'
import type { LinkingOptions } from '@react-navigation/native'
import type { RootStackParamList } from './types'

/**
 * Deep links for the ggapp:// scheme, mirroring the PWA's URL routes so push
 * notifications and shared links land on the right patient screen.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'ggapp://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Splash: '',
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password',
          EmailVerify: 'verify',
          Terms: 'terms',
          Privacy: 'privacy',
        },
      },
      App: {
        screens: {
          HomeTab: {
            screens: {
              Dashboard: 'app/dashboard',
              Appointments: 'app/appointments',
              RescheduleReview: 'app/appointments/:appointmentId/reschedule',
            },
          },
          ServicesTab: {
            screens: {
              FindService: 'app/services',
              ProviderList: 'app/services/:category',
              ProviderProfile: 'app/services/provider/:providerId',
              // Booking carries the provider as a query param in links
              // (the PWA passes it via router state instead). React
              // Navigation parses ?providerId=... into route params
              // automatically.
              BookingForm: 'app/booking',
              BookingConfirm: 'app/booking/confirm',
              PrescriptionRequests: 'app/prescriptions',
              PrescriptionRequest: 'app/prescriptions/request',
              PrescriptionConfirm: 'app/prescriptions/confirm',
              PrescriptionDetail: 'app/prescriptions/:prescriptionId',
            },
          },
          InvoicesTab: {
            screens: {
              InvoiceList: 'app/invoices',
              InvoiceReview: 'app/invoices/:invoiceId',
              PINAuth: 'app/invoices/:invoiceId/pay',
              PaymentSuccess: 'app/invoices/:invoiceId/success',
            },
          },
          WalletTab: {
            screens: {
              CreditWallet: 'app/credit',
              CreditDisclaimer: 'app/credit/disclaimer',
              CreditInitialApply: 'app/credit/apply',
              CreditIncrease: 'app/credit/increase',
              CreditStatus: 'app/credit/status',
              TransactionHistory: 'app/transactions',
            },
          },
          ProfileTab: {
            screens: {
              Profile: 'app/profile',
              Beneficiaries: 'app/beneficiaries',
              SecurityPIN: 'app/security/pin',
              HealthLedger: 'app/ledger',
              LedgerPinSetup: 'app/ledger/pin',
              LedgerAccess: 'app/ledger/access',
              Terms: 'app/terms',
              Privacy: 'app/privacy',
            },
          },
        },
      },
      Notifications: 'app/notifications',
    },
  },
}
