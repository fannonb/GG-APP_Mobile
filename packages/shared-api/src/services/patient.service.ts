import { getIsMockApi } from '../config'
import { apiClient } from '../client'
import { mockDelay } from '../mock/delay'
import { getCountryByCode, isOperatingCountryCode } from '@gg/shared-config'
import type {
  CancelPatientAppointmentPayload,
  ChangePatientPasswordPayload,
  ChangePatientPasswordResult,
  CreateAppointmentPayload,
  CreateAppointmentResult,
  CreatePrescriptionRequestPayload,
  PatientProfileResponse,
  UpdatePatientProfilePayload,
  PrescriptionRequest,
  SetupPaymentPinPayload,
  SetupPaymentPinResult,
  UpsertBeneficiaryPayload,
  Provider,
  Patient,
  Beneficiary,
  NewsItem,
  Transaction,
  Appointment,
  Notification,
} from '@gg/shared-types'
export type UserMode = 'existing' | 'new'

import { useUserStore } from '@gg/shared-stores'

import {
  MOCK_USER,
  MOCK_BENEFICIARIES,
  MOCK_NEWS,
  MOCK_TRANSACTIONS,
  MOCK_APPOINTMENTS,
  MOCK_PAST_APPOINTMENTS,
  MOCK_NOTIFICATIONS,
  MOCK_PROVIDERS,
} from '../mock/patient.mock'

const mockReadNotificationIds = new Set<string>()
const mockPrescriptionRequests: PrescriptionRequest[] = []

export interface PatientProfile {
  user: Patient
  beneficiaries: Beneficiary[]
}

export interface PatientDashboard {
  user: Patient
  transactions: Transaction[]
  news: NewsItem[]
  appointments: Appointment[]
}

export interface PatientAppointments {
  upcoming: Appointment[]
  past: Appointment[]
}

export interface AppointmentRebookContext {
  appointmentId: string
  provider: Provider
  service: string
  forSelf: boolean
  beneficiaryId?: string
  description?: string
}

const NEW_USER: Patient = {
  ...MOCK_USER,
  creditLimit: 0,
  creditUsed: 0,
  creditAvailable: 0,
  creditStatus: 'not_applied',
  hasPaymentPin: false,
  financePartnerId: undefined,
  creditAccountRef: undefined,
}

function resolveUser(mode: UserMode): Patient {
  return mode === 'new' ? NEW_USER : MOCK_USER
}

function buildDashboard(mode: UserMode): PatientDashboard {
  return {
    user: resolveUser(mode),
    transactions: mode === 'new' ? [] : MOCK_TRANSACTIONS,
    news: MOCK_NEWS,
    appointments: mode === 'new' ? [] : MOCK_APPOINTMENTS,
  }
}

function buildProfile(mode: UserMode): PatientProfile {
  return {
    user: resolveUser(mode),
    beneficiaries: mode === 'new' ? [] : MOCK_BENEFICIARIES,
  }
}

function buildAppointments(mode: UserMode): PatientAppointments {
  return {
    upcoming: mode === 'new' ? [] : MOCK_APPOINTMENTS,
    past: mode === 'new' ? [] : MOCK_PAST_APPOINTMENTS,
  }
}

function normalizePatient(user: Patient): Patient {
  const country = getCountryByCode(user.countryCode)
  const name = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return {
    ...user,
    name,
    country: country?.name ?? user.country,
  }
}

export const patientService = {
  getDashboardMock: buildDashboard,
  getProfileMock: buildProfile,
  getAppointmentsMock: buildAppointments,
  getNewsMock: () => MOCK_NEWS,

  async getProfile(mode: UserMode = 'existing'): Promise<PatientProfile> {
    if (getIsMockApi()) {
      await mockDelay(250)
      return buildProfile(mode)
    }
    const { data } = await apiClient.get<PatientProfile>('/patient/profile')
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async updateProfile(
    payload: UpdatePatientProfilePayload,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (getIsMockApi()) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      return {
        ...profile,
        user: {
          ...profile.user,
          name: payload.name ?? profile.user.name,
          email: payload.email ?? profile.user.email,
          phone: payload.phone ?? profile.user.phone,
          residenceCountry: payload.residenceCountryName ?? profile.user.residenceCountry,
          residesAbroad: payload.residenceCountryCode
            ? !isOperatingCountryCode(payload.residenceCountryCode)
            : profile.user.residesAbroad,
        },
      }
    }

    const { data } = await apiClient.patch<PatientProfileResponse>('/patient/profile', payload)
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async setBeneficiariesEnabled(
    enabled: boolean,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (getIsMockApi()) {
      await mockDelay(200)
      const profile = buildProfile(mode)
      const current = useUserStore.getState()
      return {
        user: {
          ...(current.user.email ? current.user : profile.user),
          beneficiariesEnabled: enabled,
        },
        beneficiaries: current.beneficiaries.length > 0 ? current.beneficiaries : profile.beneficiaries,
      }
    }

    const { data } = await apiClient.patch<PatientProfileResponse>('/patient/beneficiaries/enabled', {
      enabled,
    })
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async getDashboard(mode: UserMode = 'existing'): Promise<PatientDashboard> {
    if (getIsMockApi()) {
      await mockDelay(300)
      return buildDashboard(mode)
    }
    const { data } = await apiClient.get<PatientDashboard>('/patient/dashboard')
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async getAppointments(mode: UserMode = 'existing'): Promise<PatientAppointments> {
    if (getIsMockApi()) {
      await mockDelay(250)
      return buildAppointments(mode)
    }
    const { data } = await apiClient.get<PatientAppointments>('/patient/appointments')
    return data
  },

  async getRebookContext(appointmentId: string, mode: UserMode = 'existing'): Promise<AppointmentRebookContext> {
    if (getIsMockApi()) {
      await mockDelay(200)
      const appointment = [...buildAppointments(mode).upcoming, ...buildAppointments(mode).past].find(
        item => item.id === appointmentId,
      )
      if (!appointment) {
        throw new Error('Appointment not found')
      }
      const provider =
        MOCK_PROVIDERS.find(item => item.id === appointment.providerId) ??
        MOCK_PROVIDERS.find(item => item.name === appointment.provider) ??
        MOCK_PROVIDERS[0]
      return {
        appointmentId: appointment.id,
        provider,
        service: appointment.service,
        forSelf: appointment.forSelf ?? appointment.for === 'Self',
        beneficiaryId: appointment.beneficiaryId,
        description: `Follow-up booking for ${appointment.service}`,
      }
    }

    const { data } = await apiClient.get<AppointmentRebookContext>(`/patient/appointments/${appointmentId}/rebook`)
    return data
  },

  async getTransactions(mode: UserMode = 'existing'): Promise<Transaction[]> {
    if (getIsMockApi()) {
      await mockDelay(250)
      return mode === 'new' ? [] : MOCK_TRANSACTIONS
    }
    const { data } = await apiClient.get<Transaction[]>('/patient/transactions')
    return data
  },

  async getNotifications(mode: UserMode = 'existing'): Promise<Notification[]> {
    if (getIsMockApi()) {
      await mockDelay(200)
      const base = mode === 'new'
        ? MOCK_NOTIFICATIONS.filter(n => n.type === 'system')
        : MOCK_NOTIFICATIONS
      return base.map(notification => ({
        ...notification,
        read: notification.read || mockReadNotificationIds.has(notification.id),
      }))
    }
    const { data } = await apiClient.get<Notification[]>('/patient/notifications')
    return data
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    if (getIsMockApi()) {
      await mockDelay(100)
      mockReadNotificationIds.add(id)
      return { success: true }
    }
    const { data } = await apiClient.post<{ success: boolean }>(`/patient/notifications/${id}/read`)
    return data
  },

  async getNews(): Promise<NewsItem[]> {
    if (getIsMockApi()) {
      await mockDelay(200)
      return MOCK_NEWS
    }
    const { data } = await apiClient.get<NewsItem[]>('/patient/news')
    return data
  },

  async createAppointment(
    payload: CreateAppointmentPayload,
    mode: UserMode = 'existing',
  ): Promise<CreateAppointmentResult> {
    if (getIsMockApi()) {
      await mockDelay(400)
      return {
        id: `BK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        provider:
          MOCK_PROVIDERS.find(provider => provider.id === payload.providerId)?.name ??
          'Provider',
        status: 'pending',
        date: payload.date,
        time: payload.time,
        service: payload.selectedServices?.[0] ?? 'General Consultation',
        for: payload.forSelf
          ? 'Self'
          : MOCK_BENEFICIARIES.find(
              beneficiary => beneficiary.id === payload.beneficiaryId,
            )?.name ?? 'Beneficiary',
        message:
          mode === 'new'
            ? 'Appointment request created successfully.'
            : 'Appointment request created successfully.',
      }
    }

    const { data } = await apiClient.post<CreateAppointmentResult>(
      '/patient/appointments',
      payload,
    )
    return data
  },

  async confirmRescheduledAppointment(
    appointmentId: string,
    mode: UserMode = 'existing',
  ): Promise<Appointment> {
    if (getIsMockApi()) {
      await mockDelay(300)
      const existing = [...buildAppointments(mode).upcoming, ...buildAppointments(mode).past].find(
        appointment => appointment.id === appointmentId,
      )
      if (!existing) throw new Error('Appointment not found')
      return { ...existing, status: 'confirmed', rescheduledAt: null }
    }

    const { data } = await apiClient.patch<Appointment>(
      `/patient/appointments/${appointmentId}/confirm-reschedule`,
    )
    return data
  },

  async cancelAppointment(
    appointmentId: string,
    payload: CancelPatientAppointmentPayload,
    mode: UserMode = 'existing',
  ): Promise<Appointment> {
    if (getIsMockApi()) {
      await mockDelay(300)
      const existing =
        [...buildAppointments(mode).upcoming, ...buildAppointments(mode).past].find(
          appointment => appointment.id === appointmentId,
        )

      if (!existing) {
        throw new Error('Appointment not found')
      }

      return {
        ...existing,
        status: 'cancelled',
      }
    }

    const { data } = await apiClient.patch<Appointment>(
      `/patient/appointments/${appointmentId}/cancel`,
      payload,
    )
    return data
  },

  async setupPaymentPin(
    payload: SetupPaymentPinPayload,
  ): Promise<SetupPaymentPinResult> {
    if (getIsMockApi()) {
      await mockDelay(250)
      return {
        configured: true,
        message: payload.currentPin
          ? 'Payment PIN updated successfully.'
          : 'Payment PIN created successfully.',
      }
    }

    const { data } = await apiClient.post<SetupPaymentPinResult>(
      '/patient/security/payment-pin',
      payload,
    )
    return data
  },

  async changePassword(
    payload: ChangePatientPasswordPayload,
  ): Promise<ChangePatientPasswordResult> {
    if (getIsMockApi()) {
      await mockDelay(250)
      if (payload.newPassword !== payload.confirmPassword) {
        throw new Error('New password confirmation does not match')
      }
      if (payload.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters')
      }
      if (!payload.currentPassword.trim()) {
        throw new Error('Current password is required')
      }
      return { message: 'Password updated successfully.' }
    }

    const { data } = await apiClient.patch<ChangePatientPasswordResult>(
      '/patient/security/password',
      payload,
    )
    return data
  },

  async createPrescriptionRequest(
    payload: CreatePrescriptionRequestPayload,
  ): Promise<PrescriptionRequest> {
    if (getIsMockApi()) {
      await mockDelay(400)
      const provider = MOCK_PROVIDERS.find(item => item.id === payload.providerId)
      const request: PrescriptionRequest = {
        id: `RX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        providerId: payload.providerId,
        provider: provider?.name ?? 'Pharmacy',
        category: 'pharmacy',
        status: 'submitted',
        fulfillmentMode: payload.fulfillmentMode ?? 'pickup',
        deliveryAddress: payload.deliveryAddress,
        patientNotes: payload.patientNotes,
        attachment: payload.attachment,
        forSelf: payload.forSelf,
        for: payload.forSelf
          ? 'Self'
          : MOCK_BENEFICIARIES.find(item => item.id === payload.beneficiaryId)?.name ?? 'Beneficiary',
        submittedAt: new Date().toISOString(),
        patient: MOCK_USER.name,
      }
      mockPrescriptionRequests.unshift(request)
      return request
    }

    const { data } = await apiClient.post<PrescriptionRequest>(
      '/patient/prescription-requests',
      payload,
    )
    return data
  },

  async getPrescriptionRequests(): Promise<PrescriptionRequest[]> {
    if (getIsMockApi()) {
      await mockDelay(200)
      return mockPrescriptionRequests
    }

    const { data } = await apiClient.get<PrescriptionRequest[]>(
      '/patient/prescription-requests',
    )
    return data
  },

  async markPrescriptionQuoteReviewed(id: string): Promise<PrescriptionRequest> {
    if (getIsMockApi()) {
      await mockDelay(150)
      const index = mockPrescriptionRequests.findIndex(item => item.id === id)
      if (index < 0) {
        throw new Error('Prescription request not found')
      }
      const updated: PrescriptionRequest = {
        ...mockPrescriptionRequests[index],
        quoteReviewedAt: new Date().toISOString(),
      }
      mockPrescriptionRequests[index] = updated
      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/patient/prescription-requests/${id}/review`,
    )
    return data
  },

  async acceptPrescriptionQuote(id: string): Promise<PrescriptionRequest> {
    if (getIsMockApi()) {
      await mockDelay(200)
      const index = mockPrescriptionRequests.findIndex(item => item.id === id)
      if (index < 0) {
        throw new Error('Prescription request not found')
      }
      const updated: PrescriptionRequest = {
        ...mockPrescriptionRequests[index],
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      }
      mockPrescriptionRequests[index] = updated
      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/patient/prescription-requests/${id}/accept`,
    )
    return data
  },

  async declinePrescriptionQuote(
    id: string,
    reason?: string,
  ): Promise<PrescriptionRequest> {
    if (getIsMockApi()) {
      await mockDelay(200)
      const index = mockPrescriptionRequests.findIndex(item => item.id === id)
      if (index < 0) {
        throw new Error('Prescription request not found')
      }
      const updated: PrescriptionRequest = {
        ...mockPrescriptionRequests[index],
        status: 'cancelled',
        declinedAt: new Date().toISOString(),
        declineReason: reason,
      }
      mockPrescriptionRequests[index] = updated
      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/patient/prescription-requests/${id}/decline`,
      { reason },
    )
    return data
  },

  async addBeneficiary(
    payload: UpsertBeneficiaryPayload,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (getIsMockApi()) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      const beneficiary: Beneficiary = {
        id: `BEN-${Date.now()}`,
        name: payload.name,
        relation: payload.relation,
        dob: payload.dob ?? '',
        countryCode: payload.countryCode,
        nationalId: payload.nationalId ? `****${payload.nationalId.slice(-4)}` : '',
        age: payload.dob ? Math.floor((Date.now() - new Date(payload.dob).getTime()) / 31557600000) : 0,
      }
      return {
        ...profile,
        beneficiaries: [...profile.beneficiaries, beneficiary],
      }
    }

    const { data } = await apiClient.post<PatientProfileResponse>('/patient/beneficiaries', payload)
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async updateBeneficiary(
    beneficiaryId: string,
    payload: UpsertBeneficiaryPayload,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (getIsMockApi()) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      return {
        ...profile,
        beneficiaries: profile.beneficiaries.map(beneficiary =>
          beneficiary.id === beneficiaryId
            ? {
                ...beneficiary,
                name: payload.name,
                relation: payload.relation,
                dob: payload.dob ?? beneficiary.dob,
                countryCode: payload.countryCode ?? beneficiary.countryCode,
                nationalId: payload.nationalId ? `****${payload.nationalId.slice(-4)}` : '',
                age: payload.dob ? Math.floor((Date.now() - new Date(payload.dob).getTime()) / 31557600000) : 0,
              }
            : beneficiary,
        ),
      }
    }

    const { data } = await apiClient.patch<PatientProfileResponse>(
      `/patient/beneficiaries/${beneficiaryId}`,
      payload,
    )
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async deleteBeneficiary(
    beneficiaryId: string,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (getIsMockApi()) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      return {
        ...profile,
        beneficiaries: profile.beneficiaries.filter(beneficiary => beneficiary.id !== beneficiaryId),
      }
    }

    const { data } = await apiClient.delete<PatientProfileResponse>(`/patient/beneficiaries/${beneficiaryId}`)
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },
}
