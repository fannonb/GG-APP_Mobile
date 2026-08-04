import { getIsMockApi } from '../config'
import { apiClient } from '../client'
import { mockDelay } from '../mock/delay'
import type {
  ApplyCreditPayload,
  CreditApplication,
  CreditStatusResponse,
  IncreaseCreditPayload,
} from '@gg/shared-types'

/**
 * Credit service for the shared API package.
 *
 * Note: The web-app version of this service uses Zustand stores
 * (useCreditStore, useUserStore) for mock-mode state management.
 * In the shared package, consumers must provide their own mock
 * state handlers by wrapping or extending this service.
 * The `getStatus`, `apply`, and `increase` methods delegate to the
 * real API when not in mock mode.
 */
export const creditService = {
  async getStatus(): Promise<CreditStatusResponse> {
    if (getIsMockApi()) {
      await mockDelay(200)
      // In the shared package, mock credit status returns a sensible default.
      // Consumers should override this via their own store integration.
      return {
        creditStatus: 'approved',
        creditLimit: 5000,
        creditUsed: 2550,
        creditAvailable: 2450,
        financePartnerId: 'equity',
        creditAccountRef: 'GGA-847291',
      } as CreditStatusResponse
    }

    const { data } = await apiClient.get<CreditStatusResponse>('/patient/credit/status')
    return data
  },

  async apply(payload: ApplyCreditPayload): Promise<CreditApplication> {
    if (getIsMockApi()) {
      await mockDelay(400)
      // In the shared package, mock apply returns a sensible default.
      // Consumers should override this via their own store integration.
      return {
        id: `credit-app-${Date.now()}`,
        reference: `GGC-${Date.now()}`,
        type: 'initial',
        status: 'submitted',
        financePartnerId: payload.financePartnerId,
        employment: payload.employment,
        monthlyIncome: payload.monthlyIncome,
        requestedAmount: payload.requestedAmount,
        notes: 'Credit application submitted successfully.',
        submittedAt: new Date().toISOString(),
      }
    }

    const { data } = await apiClient.post<CreditApplication>('/patient/credit/apply', payload)
    return data
  },

  async increase(payload: IncreaseCreditPayload): Promise<CreditApplication> {
    if (getIsMockApi()) {
      await mockDelay(400)
      // In the shared package, mock increase returns a sensible default.
      // Consumers should override this via their own store integration.
      return {
        id: `credit-inc-${Date.now()}`,
        reference: `GGC-${Date.now()}`,
        type: 'increase',
        status: 'submitted',
        financePartnerId: 'equity',
        employment: 'Self-employed',
        monthlyIncome: payload.monthlyIncome,
        requestedAmount: payload.increaseAmount,
        reason: payload.reason,
        notes: payload.notes ?? 'Credit increase request submitted successfully.',
        submittedAt: new Date().toISOString(),
      }
    }

    const { data } = await apiClient.post<CreditApplication>('/patient/credit/increase', payload)
    return data
  },
}
