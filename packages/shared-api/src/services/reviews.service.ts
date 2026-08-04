import { getIsMockApi } from '../config'
import { apiClient } from '../client'
import { mockDelay } from '../mock/delay'
import type { SubmitReviewPayload } from '@gg/shared-types'
import type { ProviderReview } from '@gg/shared-types'
import { MOCK_PROVIDERS } from '../mock/patient.mock'

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

function resolveMockProviderId(providerId: number, providerName?: string) {
  if (providerId > 0) return providerId
  if (!providerName) return 1
  return MOCK_PROVIDERS.find(p => p.name === providerName)?.id ?? 1
}

/**
 * Reviews service for the shared API package.
 *
 * Note: The web-app version uses Zustand stores (useReviewsStore,
 * useUserStore) and a local helper (getPatientDisplayName) for
 * mock-mode state. In the shared package, mock submit returns
 * a sensible default review. Consumers can override mock behavior
 * by wrapping this service with their own store logic.
 */
export const reviewsService = {
  async getByProvider(providerId: number): Promise<ProviderReview[]> {
    if (getIsMockApi()) {
      await mockDelay(200)
      // In the shared package, return an empty array for mock mode.
      // Consumers should provide their own review store integration.
      return []
    }

    const { data } = await apiClient.get<ProviderReview[]>(`/providers/${providerId}/reviews`)
    return data
  },

  async submit(payload: SubmitReviewPayload): Promise<ProviderReview> {
    if (getIsMockApi()) {
      await mockDelay(300)
      const providerId = resolveMockProviderId(payload.providerId, payload.providerName)
      const review: ProviderReview = {
        id: `REV-${Date.now()}`,
        providerId,
        name: 'Patient',
        rating: payload.rating,
        text: payload.text?.trim() || RATING_LABELS[payload.rating] || 'No comment',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }
      return review
    }

    const { data } = await apiClient.post<ProviderReview>('/patient/reviews', {
      providerId: payload.providerId,
      invoiceId: payload.invoiceId,
      rating: payload.rating,
      text: payload.text,
    })
    return data
  },
}
