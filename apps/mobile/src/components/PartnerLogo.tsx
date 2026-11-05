import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { getFinancePartnerLogo } from '@/lib/finance-partner-logo'
import { colors, fontWeights } from '@/theme'

export type PartnerLogoSize = 'sm' | 'md' | 'lg'

/**
 * 'md' is web's allocation hero: a 48px white tile with the mark at web's height.
 * 'sm' and 'lg' scale the mark and the tile together.
 */
const SIZES: Record<PartnerLogoSize, { scale: number; tileHeight: number }> = {
  sm: { scale: 0.8, tileHeight: 36 },
  md: { scale: 1, tileHeight: 48 },
  lg: { scale: 1.2, tileHeight: 56 },
}

export interface PartnerLogoProps {
  partnerId: string | null | undefined
  /** The accessibility label, and the text shown when the partner has no artwork. */
  partnerName: string
  size?: PartnerLogoSize
  /**
   * 'tile' puts the logo on a white rounded tile with padding, as on web's allocation hero.
   * 'plain' draws the mark bare, for surfaces that already supply their own background.
   */
  variant?: 'tile' | 'plain'
}

/** A finance partner's logo. With no artwork for the partner, it shows the partner's name, as web does. */
export function PartnerLogo({ partnerId, partnerName, size = 'md', variant = 'tile' }: PartnerLogoProps) {
  const logo = getFinancePartnerLogo(partnerId)
  if (!logo && !partnerName) return null

  const { scale, tileHeight } = SIZES[size]
  let content: React.ReactNode
  if (logo) {
    const height = Math.round(logo.markHeight * scale)
    const width = Math.round(height * logo.aspect)
    content = logo.file.kind === 'svg'
      ? <SvgXml xml={logo.file.xml} width={width} height={height} />
      : <Image source={logo.file.source} style={{ width, height }} resizeMode="contain" />
  } else {
    content = <Text style={styles.fallback} numberOfLines={1}>{partnerName}</Text>
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={partnerName}
      style={variant === 'tile' ? [styles.tile, { height: tileHeight }] : styles.plain}
    >
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    flexShrink: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
  },
})
