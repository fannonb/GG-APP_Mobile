import { getIsMockApi } from '../config'
import { apiClient } from '../client'
import { mockDelay } from '../mock/delay'
import type {
  LedgerAccessLogResponse,
  LedgerEntry,
  LedgerPinResult,
  LedgerResponse,
  LedgerStatusResponse,
  SetupLedgerPinPayload,
  ResetLedgerPinPayload,
} from '@gg/shared-types'

const MOCK_ENTRIES: LedgerEntry[] = [
  {
    kind: 'visit',
    id: 'visit-1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
    beneficiaryName: null,
    appointmentRef: 'APT-1001',
    service: 'General Consultation',
    diagnosis: 'Mild hypertension',
    treatment: 'Lifestyle advice and follow-up blood pressure check',
    followUp: 'Return in 2 weeks',
    services: ['Consultation', 'Blood Pressure Check'],
    vitals: { bp: '138/88', temp: '36.7°C', pulse: '78 bpm' },
  },
  {
    kind: 'prescription',
    id: 'rx-1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    provider: { id: 7, name: 'MedPlus Pharmacy', category: 'pharmacy' },
    beneficiaryName: null,
    reference: 'RX-2026-1042',
    fulfillmentMode: 'PICKUP',
    items: [{ name: 'Amlodipine 5mg', quantity: '30 tablets', unitPrice: 12 }],
    amount: 12,
  },
]

let mockHasPin = false
let mockPinExpiresAt: string | null = null

export const ledgerService = {
  async setupPin(payload: SetupLedgerPinPayload): Promise<LedgerPinResult> {
    if (getIsMockApi()) {
      await mockDelay(350)
      if (payload.pin !== payload.confirmPin) {
        throw new Error('PIN confirmation does not match')
      }
      if (!/^\d{4,6}$/.test(payload.pin)) {
        throw new Error('PIN must be 4 to 6 digits')
      }
      if (mockHasPin && !payload.currentPin) {
        throw new Error('Current PIN is required to change your ledger PIN')
      }
      mockHasPin = true
      mockPinExpiresAt = payload.expiresInDays
        ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null
      return {
        configured: true,
        message: payload.currentPin
          ? 'Ledger PIN updated successfully.'
          : 'Ledger PIN created successfully.',
      }
    }

    const { data } = await apiClient.post<LedgerPinResult>('/patient/ledger/pin', payload)
    return data
  },

  async resetPin(payload: ResetLedgerPinPayload): Promise<LedgerPinResult> {
    if (getIsMockApi()) {
      await mockDelay(350)
      if (!payload.password.trim()) {
        throw new Error('Account password is required')
      }
      if (payload.pin !== payload.confirmPin) {
        throw new Error('PIN confirmation does not match')
      }
      if (!/^\d{4,6}$/.test(payload.pin)) {
        throw new Error('PIN must be 4 to 6 digits')
      }
      mockHasPin = true
      mockPinExpiresAt = payload.expiresInDays
        ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null
      return {
        configured: true,
        message: 'Ledger PIN reset. Existing provider access has been revoked.',
      }
    }

    const { data } = await apiClient.post<LedgerPinResult>('/patient/ledger/pin/reset', payload)
    return data
  },

  async revokePin(): Promise<LedgerPinResult> {
    if (getIsMockApi()) {
      await mockDelay(250)
      mockHasPin = false
      mockPinExpiresAt = null
      return {
        configured: false,
        message: 'Ledger PIN revoked. All provider access has been removed.',
      }
    }

    const { data } = await apiClient.delete<LedgerPinResult>('/patient/ledger/pin')
    return data
  },

  async getStatus(): Promise<LedgerStatusResponse> {
    if (getIsMockApi()) {
      await mockDelay(200)
      return {
        hasPin: mockHasPin,
        pinExpired: false,
        pinCreatedAt: mockHasPin ? new Date().toISOString() : null,
        pinExpiresAt: mockPinExpiresAt,
        activeGrants: mockHasPin
          ? [
              {
                id: 'grant-mock-1',
                provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
                unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 21).toISOString(),
              },
            ]
          : [],
      }
    }

    const { data } = await apiClient.get<LedgerStatusResponse>('/patient/ledger/status')
    return data
  },

  async getOwnLedger(beneficiaryId?: string): Promise<LedgerResponse> {
    if (getIsMockApi()) {
      await mockDelay(250)
      const entries =
        beneficiaryId === 'self'
          ? MOCK_ENTRIES.filter(entry => !entry.beneficiaryName)
          : beneficiaryId
            ? MOCK_ENTRIES.filter(entry => !!entry.beneficiaryName)
            : MOCK_ENTRIES

      return {
        patient: {
          id: 'patient-1',
          name: 'Patient',
          beneficiaries: [{ id: 'ben-1', name: 'Beneficiary', relation: 'Child' }],
        },
        grant: null,
        filter: beneficiaryId
          ? { beneficiaryId, scope: 'beneficiary' }
          : { beneficiaryId: null, scope: 'all' },
        entries,
      }
    }

    const { data } = await apiClient.get<LedgerResponse>('/patient/ledger', {
      params: beneficiaryId ? { beneficiaryId } : undefined,
    })
    return data
  },

  async getAccessLog(): Promise<LedgerAccessLogResponse> {
    if (getIsMockApi()) {
      await mockDelay(200)
      return {
        grants: mockHasPin
          ? [
              {
                id: 'grant-mock-1',
                provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
                unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 21).toISOString(),
                status: 'active',
              },
            ]
          : [],
        events: mockHasPin
          ? [
              {
                id: 'evt-1',
                action: 'PIN_CREATED',
                provider: null,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              },
              {
                id: 'evt-2',
                action: 'UNLOCK_SUCCESS',
                provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
              },
            ]
          : [],
      }
    }

    const { data } = await apiClient.get<LedgerAccessLogResponse>('/patient/ledger/access')
    return data
  },

  async revokeGrant(grantId: string): Promise<{ revoked: boolean }> {
    if (getIsMockApi()) {
      await mockDelay(250)
      return { revoked: true }
    }

    const { data } = await apiClient.patch<{ revoked: boolean }>(
      `/patient/ledger/grants/${grantId}/revoke`,
    )
    return data
  },
}
