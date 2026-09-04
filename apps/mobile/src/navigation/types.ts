import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native'
import type { AppointmentRebookPrefill } from '@gg/shared-utils'

export interface GoogleProfileState {
  firstName: string
  lastName: string
  email: string
  googleIdToken: string
}

export type AuthStackParamList = {
  Splash: undefined
  Login: undefined
  ForgotPassword: undefined
  ResetPassword: { token?: string }
  Register: { googleProfile?: GoogleProfileState } | undefined
  EmailVerify: { token?: string }
  Onboarding: undefined
  Terms: undefined
  Privacy: undefined
}

export type HomeStackParamList = {
  Dashboard: undefined
  Appointments: undefined
  RescheduleReview: { appointmentId: string }
}

export type ServicesStackParamList = {
  FindService: undefined
  ProviderList: { category: string }
  ProviderProfile: { providerId: string | number }
  BookingForm: {
    providerId: string | number
    rebook?: AppointmentRebookPrefill
  }
  BookingConfirm: { result: Record<string, unknown> }
  PrescriptionRequest: { providerId: string | number }
  PrescriptionConfirm: {
    referenceId: string
    provider: string
    fulfillmentMode: 'pickup' | 'delivery'
    forLabel: string
    attachmentName: string
  }
  PrescriptionRequests: undefined
  PrescriptionDetail: { prescriptionId: string }
}

export type InvoicesStackParamList = {
  InvoiceList: undefined
  InvoiceReview: { invoiceId: string }
  PINAuth: {
    invoiceId: string
    amount: number
    walletPayAmount: number
    offAppDue: number
    provider: string
  }
  PaymentSuccess: {
    invoiceId: string
    amount: number
    walletAmountPaid?: number
    offAppAmountDue?: number
    provider: string
  }
}

export type WalletStackParamList = {
  CreditWallet: undefined
  CreditDisclaimer: undefined
  CreditInitialApply: undefined
  CreditApply: undefined
  CreditIncrease: undefined
  CreditStatus: { requestType?: 'application' | 'increase' } | undefined
  TransactionHistory: undefined
}

export type ProfileStackParamList = {
  /** openSection deep-links the profile root to a section after the tab mounts. */
  Profile: { openSection?: 'security' | 'notifications' } | undefined
  Beneficiaries: undefined
  Notifications: undefined
  SecurityPIN: undefined
  HealthLedger: undefined
  LedgerPinSetup: undefined
  LedgerAccess: undefined
}

export type AppTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>
  ServicesTab: NavigatorScreenParams<ServicesStackParamList>
  InvoicesTab: NavigatorScreenParams<InvoicesStackParamList>
  WalletTab: NavigatorScreenParams<WalletStackParamList>
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>
}

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>
  App: NavigatorScreenParams<AppTabsParamList>
  Notifications: undefined
}

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<HomeStackParamList, T>,
    BottomTabScreenProps<AppTabsParamList>
  >

export type ServicesScreenProps<T extends keyof ServicesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ServicesStackParamList, T>,
    BottomTabScreenProps<AppTabsParamList>
  >

export type InvoicesScreenProps<T extends keyof InvoicesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<InvoicesStackParamList, T>,
    BottomTabScreenProps<AppTabsParamList>
  >

export type WalletScreenProps<T extends keyof WalletStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<WalletStackParamList, T>,
    BottomTabScreenProps<AppTabsParamList>
  >

export type ProfileScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<AppTabsParamList>
  >
