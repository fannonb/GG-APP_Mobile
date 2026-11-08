import { getIsMockApi } from '../config'
import { apiClient } from '../client'
import { mockDelay } from '../mock/delay'

/** An ad the admin configured. The server has already filtered it for this patient. */
export interface PatientAd {
  id: string
  /** An https:// link, or an in-app web path starting with /app/. */
  ctaUrl: string
  desktopImageUrl: string
  /** '' when the ad has no mobile artwork. */
  mobileImageUrl: string
  updatedAt: string
}

export const adsService = {
  async getPatientAds(): Promise<PatientAd[]> {
    if (getIsMockApi()) {
      await mockDelay(200)
      // Mock mode has no ads, so the app's built-in house ad is shown.
      return []
    }
    const { data } = await apiClient.get<PatientAd[]>('/patient/ads')
    return data
  },

  async recordImpression(id: string): Promise<{ success: boolean }> {
    if (getIsMockApi()) return { success: true }
    const { data } = await apiClient.post<{ success: boolean }>(
      `/patient/ads/${encodeURIComponent(id)}/impression`,
    )
    return data
  },

  async recordClick(id: string): Promise<{ success: boolean }> {
    if (getIsMockApi()) return { success: true }
    const { data } = await apiClient.post<{ success: boolean }>(
      `/patient/ads/${encodeURIComponent(id)}/click`,
    )
    return data
  },
}
