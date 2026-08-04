import { create } from 'zustand'
import type { Patient, Beneficiary } from '@gg/shared-types'

const EMPTY_PATIENT: Patient = {
  name: '',
  email: '',
  phone: '',
  nationalId: '',
  country: '',
  countryCode: 'KE',
  creditLimit: 0,
  creditUsed: 0,
  creditAvailable: 0,
  creditStatus: 'not_applied',
  memberSince: '',
  hasPaymentPin: false,
}

const EMPTY_BENEFICIARIES: Beneficiary[] = []

interface UserStore {
  user: Patient
  beneficiaries: Beneficiary[]
  setUser: (u: Patient) => void
  updateUser: (partial: Partial<Patient>) => void
  addBeneficiary: (b: Beneficiary) => void
  removeBeneficiary: (id: string) => void
  reset: () => void
}

export const useUserStore = create<UserStore>(set => ({
  user: EMPTY_PATIENT,
  beneficiaries: EMPTY_BENEFICIARIES,
  setUser:    user => set({ user }),
  updateUser: partial => set(s => ({ user: { ...s.user, ...partial } })),
  addBeneficiary: b => set(s => ({ beneficiaries: [...s.beneficiaries, b] })),
  removeBeneficiary: id => set(s => ({ beneficiaries: s.beneficiaries.filter(b => b.id !== id) })),
  reset: () => set({ user: EMPTY_PATIENT, beneficiaries: EMPTY_BENEFICIARIES }),
}))
