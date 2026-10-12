import { StyleSheet } from 'react-native'

/**
 * Figtree — the PWA's brand typeface (`gg-app` design-system `font.family`).
 * Mobile previously shipped Plus Jakarta Sans, which was part of the same
 * brand drift as the colour tokens.
 */
export const fontWeights = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semiBold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extraBold: 'Figtree_800ExtraBold',
} as const

export type FontWeight = keyof typeof fontWeights

export function fontFamily(weight: FontWeight = 'regular') {
  return fontWeights[weight]
}

export const typography = StyleSheet.create({
  h1:      { fontFamily: fontWeights.extraBold, fontSize: 28, letterSpacing: -1.2, lineHeight: 34 },
  h2:      { fontFamily: fontWeights.extraBold, fontSize: 22, letterSpacing: -0.8, lineHeight: 28 },
  h3:      { fontFamily: fontWeights.bold, fontSize: 18, letterSpacing: -0.4, lineHeight: 24 },
  title:   { fontFamily: fontWeights.bold, fontSize: 16, letterSpacing: -0.3, lineHeight: 21 },
  body:    { fontFamily: fontWeights.regular, fontSize: 15.5, lineHeight: 22 },
  bodySm:  { fontFamily: fontWeights.regular, fontSize: 14.5, lineHeight: 20 },
  caption: { fontFamily: fontWeights.medium, fontSize: 13.5, lineHeight: 18 },
  label:   { fontFamily: fontWeights.bold, fontSize: 12.5, letterSpacing: 0.5, lineHeight: 16 },
  tiny:    { fontFamily: fontWeights.bold, fontSize: 11.5, lineHeight: 16 },
  pill:    { fontFamily: fontWeights.bold, fontSize: 11.5, letterSpacing: 0.3, lineHeight: 16 },
})
