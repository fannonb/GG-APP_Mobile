export type CreditApplicationType = 'initial' | 'increase'
export type CreditApplicationStatus = 'submitted' | 'approved' | 'rejected'

export interface CreditApplication {
  id: string
  reference: string
  type: CreditApplicationType
  status: CreditApplicationStatus
  financePartnerId: string
  employment: string
  monthlyIncome: number
  requestedAmount: number
  approvedAmount?: number
  reason?: string
  notes?: string
  declineReason?: string
  submittedAt: string
  reviewedAt?: string
}

export interface CreditStatusResponse {
  creditStatus: 'approved' | 'pending' | 'rejected' | 'not_applied'
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  financePartnerId?: string
  creditAccountRef?: string
  application: CreditApplication | null
}

export interface ApplyCreditPayload {
  financePartnerId: string
  employment: string
  monthlyIncome: number
  requestedAmount: number
  consent: boolean
  /** ISO country code for where the patient currently lives (KE/ZW/ZM or any other). */
  residenceCountryCode?: string
  /** Country display name (especially useful for non-operating markets). */
  residenceCountryName?: string
  /** Who the credit covers. Defaults to 'self' when omitted. */
  coverageType?: 'self' | 'self_and_beneficiaries'
  beneficiaries?: {
    name: string
    relation: string
    dob: string
    countryCode: string
    nationalId?: string
  }[]
}

export interface IncreaseCreditPayload {
  increaseAmount: number
  monthlyIncome: number
  reason: string
  notes?: string
  consent: boolean
}

export interface AdminCreditApplication extends CreditApplication {
  patientUserId: string
  patientName: string
  patientEmail: string
  patientPhone: string
  country: string
  currentCreditLimit: number
  currentCreditAvailable: number
  currentCreditUsed: number
  creditStatus: string
}

export interface CreditApplicationActionPayload {
  note?: string
  approvedAmount?: number
}
