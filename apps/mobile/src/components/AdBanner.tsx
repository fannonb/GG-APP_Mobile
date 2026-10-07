import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Linking, Image } from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Circle, Path } from 'react-native-svg'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { getActiveAdBanner } from '@/lib/ads'

interface AdBannerStripProps {
  countryName?: string
}

function CloseIcon({ size = 10, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <Path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  )
}

function ExternalArrow({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M5 11L11 5M6 5h5v5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function renderFallbackArt(advertiserName: string) {
  return (
    <View style={styles.fallbackArt}>
      <View style={styles.fallbackGlowLarge} />
      <View style={styles.fallbackGlowSmall} />
      <CircleAccent />
      <View style={styles.fallbackContent}>
        <View style={styles.sponsoredPill}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
        <Text style={styles.fallbackTitle}>{advertiserName}</Text>
        <Text style={styles.fallbackBody}>
          Explore a partner healthcare offer selected for GG&apos;APP patients.
        </Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Learn more</Text>
          <ExternalArrow />
        </View>
      </View>
    </View>
  )
}

function CircleAccent() {
  return (
    <Svg width={92} height={92} viewBox="0 0 92 92" style={styles.circleSvg}>
      <Circle cx={46} cy={46} r={32} stroke="rgba(255,255,255,0.14)" strokeWidth={1.2} />
      <Circle cx={46} cy={46} r={20} stroke="rgba(255,255,255,0.1)" strokeWidth={1.2} />
    </Svg>
  )
}

export default function AdBannerStrip({ countryName }: AdBannerStripProps) {
  const [dismissed, setDismissed] = useState(false)
  const banner = useMemo(() => getActiveAdBanner(countryName), [countryName])

  if (!banner || dismissed) return null

  const imageUrl = banner.mobileImageUrl || banner.desktopImageUrl
  const canRenderImage = imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/')

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.card}
        onPress={() => void Linking.openURL(banner.ctaUrl)}
      >
        {canRenderImage ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          renderFallbackArt(banner.advertiserName)
        )}
      </Pressable>

      <Pressable
        style={styles.dismissBtn}
        hitSlop={8}
        onPress={() => setDismissed(true)}
      >
        <CloseIcon />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  card: {
    borderRadius: radii.large,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: 132,
    backgroundColor: colors.navy,
  },
  fallbackArt: {
    height: 132,
    borderRadius: radii.large,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  fallbackGlowLarge: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(47,155,255,0.16)',
    right: -30,
    top: -26,
  },
  fallbackGlowSmall: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: 34,
    bottom: -20,
  },
  circleSvg: {
    position: 'absolute',
    right: 6,
    top: 6,
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sponsoredPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  sponsoredText: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: 'rgba(255,255,255,0.72)',
  },
  fallbackTitle: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    maxWidth: '72%',
  },
  fallbackBody: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
    maxWidth: '74%',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },
  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
