export type AdBannerStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired'
export type AdFrequency = 'always' | 'every_other' | 'every_third'

export interface AdBanner {
  id: string
  advertiserName: string
  ctaUrl: string
  desktopImageUrl: string
  mobileImageUrl: string
  status: AdBannerStatus
  frequency: AdFrequency
  startDate: string
  expiresAt: string
  countries: string[]
  impressions: number
  clicks: number
  updatedAt: string
}

export const MOCK_AD_BANNERS: AdBanner[] = [
  {
    id: 'AD-001',
    advertiserName: 'HealthShield Medical Aid',
    ctaUrl: 'https://healthshield.co.zw',
    desktopImageUrl: '/ads/ad-001-desktop.svg',
    mobileImageUrl: '/ads/ad-001-mobile.svg',
    status: 'active',
    frequency: 'always',
    startDate: '2026-05-01',
    expiresAt: '2026-07-31',
    countries: [],
    impressions: 3842,
    clicks: 291,
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'AD-002',
    advertiserName: 'TeleMed Africa',
    ctaUrl: 'https://telemedafrica.com',
    desktopImageUrl: '',
    mobileImageUrl: '',
    status: 'active',
    frequency: 'every_other',
    startDate: '2026-06-01',
    expiresAt: '2026-06-30',
    countries: ['Kenya', 'Zimbabwe'],
    impressions: 1204,
    clicks: 67,
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'AD-003',
    advertiserName: 'NutriPlus Pharmacy',
    ctaUrl: 'https://nutriplus.co.zw',
    desktopImageUrl: '',
    mobileImageUrl: '',
    status: 'paused',
    frequency: 'every_third',
    startDate: '2026-04-15',
    expiresAt: '2026-09-15',
    countries: ['Zimbabwe'],
    impressions: 892,
    clicks: 44,
    updatedAt: '2026-04-15T08:00:00.000Z',
  },
  {
    id: 'AD-004',
    advertiserName: 'Harare Dental Care',
    ctaUrl: 'https://hararedentalcare.co.zw',
    desktopImageUrl: '',
    mobileImageUrl: '',
    status: 'draft',
    frequency: 'always',
    startDate: '2026-07-01',
    expiresAt: '2026-09-30',
    countries: ['Zimbabwe'],
    impressions: 0,
    clicks: 0,
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
]

export function getActiveAdBanner(countryName?: string): AdBanner | null {
  const today = new Date().toISOString().split('T')[0]

  return (
    [...MOCK_AD_BANNERS]
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .find(banner => {
        if (banner.status !== 'active') return false
        if (banner.startDate > today || banner.expiresAt < today) return false
        if (banner.countries.length > 0 && countryName && !banner.countries.includes(countryName)) {
          return false
        }
        return true
      }) ?? null
  )
}
