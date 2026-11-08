import type { PatientAd } from '@gg/shared-api'
import { openSafeUrl } from '@/lib/open-attachment'

/** An ad from GET /patient/ads. The server has already filtered it for this patient. */
export type AdBanner = PatientAd

/** Ad links open outside the app, so only https:// is allowed (release builds block cleartext http). */
const HTTPS_URL = /^https:\/\/\S+$/i
/** Images the app can load: an https:// URL, or an inline data:image URL from a local backend without object storage. */
const IMAGE_URL = /^(https:\/\/\S+|data:image\/[a-z0-9.+-]+[;,]\S+)$/i

/** The image to show on a phone: the mobile artwork first, then desktop. Null when neither is loadable. */
export function getAdImageUrl(ad: AdBanner): string | null {
  for (const candidate of [ad.mobileImageUrl, ad.desktopImageUrl]) {
    const url = typeof candidate === 'string' ? candidate.trim() : ''
    if (url && IMAGE_URL.test(url)) return url
  }
  return null
}

/** An in-app destination for an `/app/...` ad link. */
export interface AdRoute {
  tab: 'ServicesTab' | 'WalletTab'
  params: { initial?: boolean; screen: string }
}

/**
 * Maps the web paths an ad can link to onto the app's tabs: `/app/services` and
 * `/app/services/...` open Find care, `/app/pharmacy...` the prescription request,
 * and `/app/credit...` or `/app/wallet...` the wallet. Null for any other path.
 */
export function getAdRoute(ctaUrl: string): AdRoute | null {
  const path = ctaUrl.trim().split(/[?#]/)[0]
  if (!path.startsWith('/app/')) return null
  const section = path.slice('/app/'.length).split('/')[0].toLowerCase()
  switch (section) {
    case 'services':
      return { tab: 'ServicesTab', params: { screen: 'FindService' } }
    case 'pharmacy':
      return { tab: 'ServicesTab', params: { initial: false, screen: 'PrescriptionRequest' } }
    case 'credit':
    case 'wallet':
      return { tab: 'WalletTab', params: { screen: 'CreditWallet' } }
    default:
      return null
  }
}

/** Whether tapping an ad does anything: an https:// link, or an /app/ path the app maps. */
export function isAdLinkActionable(ctaUrl: string): boolean {
  return HTTPS_URL.test(ctaUrl.trim()) || getAdRoute(ctaUrl) !== null
}

/**
 * Opens an ad's link. An https:// link opens in the browser through openSafeUrl; an
 * /app/ path navigates inside the app. Any other link is ignored.
 */
export function openAdLink(
  ctaUrl: string,
  navigation: { navigate: (name: string, params?: object) => void },
): void {
  const url = ctaUrl.trim()
  if (url.startsWith('/app/')) {
    const route = getAdRoute(url)
    if (route) navigation.navigate(route.tab, route.params)
    return
  }
  openSafeUrl(url).catch(() => undefined)
}

/**
 * GG'APP's house ad, drawn in the app by SampleAd. Shown when there are no ads, while
 * they load, or when they fail to load. Its image and tap target are built in, so the
 * URL fields stay empty.
 */
export const SAMPLE_AD: AdBanner = {
  id: 'sample-ad',
  ctaUrl: '',
  desktopImageUrl: '',
  mobileImageUrl: '',
  updatedAt: '1970-01-01T00:00:00.000Z',
}
