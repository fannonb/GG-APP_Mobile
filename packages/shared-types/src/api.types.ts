import type { InvoiceStatus } from './invoice.types'
import type { Patient, UserRole } from './user.types'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  role: UserRole
  expiresAt: number
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  role: UserRole
  expiresAt: number
}

export interface LoginPayload {
  email: string
  password: string
  role: UserRole
}

export interface RegisterPatientPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  dob: string
  /** Collected for KYC; optional until the backend persists it. */
  gender?: string
  nationalId: string
  password?: string
  /** Present when the patient is completing registration after a Google sign-in. */
  googleIdToken?: string
  /** Google OAuth client ID used for the sign-in (mobile uses the Android client). */
  googleClientId?: string
}

export interface RegisterPatientResponse {
  session?: AuthSession
  verificationToken?: string
  message: string
}

export interface GoogleAuthPayload {
  code: string
  redirectUri: string
  /** PKCE code verifier sent to the authorization server when the challenge was used. */
  codeVerifier?: string
  /** Google OAuth client ID used for the request — the backend uses it to pick the matching client config. */
  clientId?: string
}

export interface GoogleAuthSessionResult extends AuthSession {
  needsRegistration: false
}

export interface GoogleAuthRegistrationResult {
  needsRegistration: true
  firstName: string
  lastName: string
  email: string
  googleIdToken: string
}

export type GoogleAuthResult = GoogleAuthSessionResult | GoogleAuthRegistrationResult

export interface VerifyEmailResponse {
  success?: boolean
  message: string
}

export interface EmailChangeStatusResponse {
  id: string
  currentEmail: string
  newEmail: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
}

export interface ForgotPasswordResponse {
  message: string
  resetUrl?: string
}

export interface ResetPasswordResponse {
  success?: boolean
  message: string
}

export interface ProviderOpeningHoursEntry {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  status: 'open' | 'closed'
  from?: string
  to?: string
}

export interface ProviderLocationPayload {
  label?: string
  address: string
  city?: string
  region?: string
  lat?: number
  lng?: number
}

export interface ProviderPayoutMethodPayload {
  method: 'mpesa' | 'bank' | 'mobile_money'
  summary?: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  bankBranch?: string
}

export interface RegisterSPPayload {
  practiceName: string
  email: string
  emailSecondary?: string
  phone: string
  password: string
  country: string
  serviceTypes: string[]
  licenseNumber: string
  hours: ProviderOpeningHoursEntry[]
  location: ProviderLocationPayload
  payoutMethod: ProviderPayoutMethodPayload
  documents: Array<{
    kind: 'logo' | 'license' | 'supporting' | 'invoice_pdf'
    originalName: string
    mimeType: string
    sizeBytes: number
    displaySize: string
    storageKey: string
  }>
}

export interface RegisterSPResponse {
  message: string
  applicationId: string
  status: 'pending' | 'info_requested' | 'approved' | 'rejected'
}

export interface SPApplicationStatusResponse {
  applicationId: string
  status: 'pending' | 'info_requested' | 'approved' | 'rejected'
  note?: string | null
  submittedAt: string
  decidedAt: string | null
}

export interface AppointmentAttachmentPayload {
  name: string
  type: 'pdf' | 'image' | 'document'
  size: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  dataUrl?: string
}

export interface CreateAppointmentPayload {
  providerId: number
  description: string
  date: string
  time: string
  forSelf: boolean
  beneficiaryId?: string
  selectedServices?: string[]
  address?: string
  attachments?: AppointmentAttachmentPayload[]
}

export interface CreateAppointmentResult {
  id: string
  status: string
  provider: string
  date: string
  time: string
  service: string
  for: string
  message: string
}

export interface CancelPatientAppointmentPayload {
  reason: string
  note?: string
}

export interface AuthorizePaymentPayload {
  invoiceId: string
  pin: string
  step: number
}

export interface AuthorizePaymentResult {
  success: boolean
  complete: boolean
  attemptsRemaining?: number
  lockedUntil?: number
  message?: string
  walletAmountPaid?: number
  offAppAmountDue?: number
  invoiceAmount?: number
}

export interface ChangePatientPasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePatientPasswordResult {
  message: string
}

export interface SetupPaymentPinPayload {
  pin: string
  confirmPin: string
  currentPin?: string
}

export interface SetupPaymentPinResult {
  configured: boolean
  message: string
}

export interface PrescriptionAttachmentPayload {
  name: string
  type: 'pdf' | 'image' | 'document'
  size: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  dataUrl?: string
  /** Resolved download URL (presigned object-storage link) when available. */
  url?: string
}

export interface CreatePrescriptionRequestPayload {
  providerId: number
  forSelf: boolean
  beneficiaryId?: string
  sourceAppointmentId?: string
  fulfillmentMode?: 'pickup' | 'delivery'
  deliveryAddress?: string
  patientNotes?: string
  attachment: PrescriptionAttachmentPayload
}

export interface PrescriptionQuotedItem {
  name: string
  quantity?: string
  unitPrice?: number
  availability?: string
  substitute?: string
}

export type PrescriptionRequestStatus =
  | 'submitted'
  | 'quoted'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected'

export interface PrescriptionRequest {
  id: string
  providerId: number
  provider: string
  category?: 'pharmacy'
  status: PrescriptionRequestStatus
  fulfillmentMode: 'pickup' | 'delivery'
  deliveryAddress?: string
  patientNotes?: string
  pharmacyNotes?: string
  attachment: PrescriptionAttachmentPayload
  quotedItems?: PrescriptionQuotedItem[]
  quotedAmount?: number
  quotedAt?: string
  quoteReviewedAt?: string
  acceptedAt?: string
  declinedAt?: string
  declineReason?: string
  readyAt?: string
  fulfilledAt?: string
  forSelf: boolean
  for: string
  submittedAt: string
  invoiceId?: string
  invoiceStatus?: InvoiceStatus
  patient?: string
}

export interface PatientProfileResponse {
  user: Patient
  beneficiaries: import('./user.types').Beneficiary[]
}

export interface UpdatePatientProfilePayload {
  name: string
  email: string
  phone: string
  residenceCountryCode?: string
  residenceCountryName?: string
}

export interface UpsertBeneficiaryPayload {
  name: string
  relation: string
  dob: string
  nationalId?: string
  countryCode?: import('@gg/shared-config').CountryCode
}

export interface SubmitReviewPayload {
  providerId: number
  invoiceId: string
  rating: number
  text?: string
  providerName?: string
}
