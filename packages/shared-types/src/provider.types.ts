export type ProviderCategory = 'doctor' | 'pharmacy' | 'laboratory' | 'radiology' | 'hospital' | 'clinic' | 'specialist'

export type ProviderStatus = 'open' | 'closed'

export interface Provider {
  id: number
  name: string
  category: ProviderCategory
  categories?: ProviderCategory[]
  rating: number
  reviews: number
  distance: string
  status: ProviderStatus
  services: string[]
  hours: string
  openingHours?: Record<string, { open: boolean; from: string; to: string }>
  phone: string
  country?: string
  address: string
  about?: string
  license?: string
  logoUrl?: string
  languages?: string[]
  establishedYear?: number
  lat?: number
  lng?: number
}

export interface BookingSlot {
  date: string
  time: string
  available: boolean
}

export interface ProviderReview {
  id: string
  providerId: number
  name: string
  date: string
  rating: number
  text: string
}
