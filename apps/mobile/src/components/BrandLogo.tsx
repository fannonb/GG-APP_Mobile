import React from 'react'
import { Image, type ImageStyle, type StyleProp } from 'react-native'

/*
 * The GG'APP wordmark, the same artwork the web uses. The first G and the PP
 * are brand blue; the middle "G'A" is off-white on navy and navy on light
 * surfaces. Both files share the same 4.7:1 proportions.
 */
const WORDMARK_ON_DARK = require('../../assets/gg-wordmark.png')
const WORDMARK_ON_LIGHT = require('../../assets/gg-wordmark-light.png')

const ASPECT = 654 / 139

const HEIGHT = {
  /** App bar: 24pt tall, about 113pt wide. */
  sm: 24,
  /** Auth screens: the hero logo above the sign-in title. */
  lg: 36,
} as const

export type BrandLogoVariant = 'onDark' | 'onLight'
export type BrandLogoSize = keyof typeof HEIGHT

interface BrandLogoProps {
  /** `onDark` for navy backgrounds, `onLight` for light backgrounds. */
  variant?: BrandLogoVariant
  size?: BrandLogoSize
  style?: StyleProp<ImageStyle>
}

export default function BrandLogo({ variant = 'onDark', size = 'sm', style }: BrandLogoProps) {
  const height = HEIGHT[size]
  return (
    <Image
      source={variant === 'onLight' ? WORDMARK_ON_LIGHT : WORDMARK_ON_DARK}
      style={[{ width: Math.round(height * ASPECT), height }, style]}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="GG'APP"
    />
  )
}
