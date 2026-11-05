import type { ImageSourcePropType } from 'react-native'
import { MONEYMART_LOGO_SVG } from './moneymart-logo-svg'

/**
 * Finance partner logos, the same files the web app bundles (gg-app/src/assets/partners).
 * Keyed by the partner ids in @gg/shared-config. `markHeight` is the height web's
 * allocation hero uses (PARTNER_MARKS), so both apps weigh the two logos the same way.
 */
export type FinancePartnerLogoFile =
  | { kind: 'svg'; xml: string }
  | { kind: 'png'; source: ImageSourcePropType }

export interface FinancePartnerLogo {
  file: FinancePartnerLogoFile
  /** Width over height of the artwork. */
  aspect: number
  /** Mark height on web's allocation hero, before a size is applied. */
  markHeight: number
}

const LOGOS = new Map<string, FinancePartnerLogo>([
  [
    'moneymart',
    { file: { kind: 'svg', xml: MONEYMART_LOGO_SVG }, aspect: 773.46 / 227.68, markHeight: 26 },
  ],
  [
    'equity',
    {
      file: { kind: 'png', source: require('../../assets/partners/equity-bank-transparent.png') },
      aspect: 320 / 208,
      markHeight: 34,
    },
  ],
])

/**
 * The artwork for a finance partner id, or null when there is none. Callers show
 * the partner's name instead, as web does, so an unknown id never renders a blank tile.
 */
export function getFinancePartnerLogo(partnerId: string | null | undefined): FinancePartnerLogo | null {
  if (!partnerId) return null
  return LOGOS.get(partnerId) ?? null
}
