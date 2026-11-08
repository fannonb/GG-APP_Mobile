import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import { adsService } from '@gg/shared-api'
import { usePatientAds } from '@gg/shared-hooks'
import Pressable from '@/components/Pressable'
import SampleAd from '@/components/SampleAd'
import { radii } from '@/theme'
import {
  SAMPLE_AD,
  getAdImageUrl,
  isAdLinkActionable,
  openAdLink,
  type AdBanner as AdData,
} from '@/lib/ads'

/** How long each ad stays on screen before the carousel moves on. */
const ROTATE_MS = 6000
/** Every ad is 4:3 (800 x 600). */
const HEIGHT_PER_WIDTH = 3 / 4

/** Ids of the ads already counted as seen this app session. Each ad counts one impression per session. */
const countedImpressions = new Set<string>()

interface AdBannerProps {
  /** Shows the round close button, which hides the carousel for the rest of the app session. */
  onClose?: () => void
  /** Opens Find care when the GG'APP house ad is tapped. */
  onSampleAdPress?: () => void
}

/**
 * The home ad carousel: the admin's 4:3 ads at full card width, paged sideways,
 * with dots below and a six-second auto-advance that pauses while the patient
 * touches it. With one ad there are no dots and no auto-advance. With no ads, or
 * while they load or fail to load, the GG'APP house ad is shown.
 */
export default function AdBanner({ onClose, onSampleAdPress }: AdBannerProps) {
  const navigation = useNavigation<any>()
  const { data } = usePatientAds()
  const ads = useMemo<AdData[]>(() => {
    const usable = (data ?? []).filter(ad => getAdImageUrl(ad) !== null)
    return usable.length > 0 ? usable : [SAMPLE_AD]
  }, [data])
  const count = ads.length

  const scrollRef = useRef<ScrollViewInstance>(null)
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0)
  const [touching, setTouching] = useState(false)
  // The stored index can outlive a change in the number of ads, so it is clamped at render time.
  const current = Math.min(index, count - 1)

  const showAd = useCallback(
    (next: number) => {
      setIndex(next)
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
    },
    [width],
  )

  // One timer at a time. It restarts on every slide change, and stays off while the patient is touching.
  useEffect(() => {
    if (count < 2 || touching || width <= 0) return
    const id = setTimeout(() => showAd((current + 1) % count), ROTATE_MS)
    return () => clearTimeout(id)
  }, [count, current, touching, width, showAd])

  // Counts one impression when a real ad's slide is on screen, once per ad per app session.
  useEffect(() => {
    if (width <= 0) return
    const ad = ads[current]
    if (!ad || ad.id === SAMPLE_AD.id || countedImpressions.has(ad.id)) return
    countedImpressions.add(ad.id)
    adsService.recordImpression(ad.id).catch(() => undefined)
  }, [ads, current, width])

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width
    if (next === width) return
    setWidth(next)
    // Keep the same ad in view if the width changes.
    scrollRef.current?.scrollTo({ x: current * next, animated: false })
  }

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    setIndex(Math.min(Math.max(next, 0), count - 1))
  }

  const onAdPress = (ad: AdData) => {
    if (ad.id === SAMPLE_AD.id) {
      onSampleAdPress?.()
      return
    }
    // Fire-and-forget: a failed count must never block the tap.
    adsService.recordClick(ad.id).catch(() => undefined)
    openAdLink(ad.ctaUrl, navigation)
  }

  const pause = () => setTouching(true)
  const resume = () => setTouching(false)

  const pageHeight = width * HEIGHT_PER_WIDTH

  return (
    <View>
      <View
        style={styles.viewport}
        onLayout={onLayout}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
      >
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={pause}
            onScrollEndDrag={resume}
            onMomentumScrollEnd={onMomentumEnd}
            style={{ width, height: pageHeight }}
          >
            {ads.map(ad => (
              <AdSlide key={ad.id} ad={ad} width={width} height={pageHeight} onPress={onAdPress} />
            ))}
          </ScrollView>
        ) : null}

        {onClose ? <CloseButton onPress={onClose} /> : null}
      </View>

      {count > 1 && width > 0 ? (
        <View style={styles.dots}>
          {ads.map((ad, i) => {
            const active = i === current
            return (
              <Pressable
                key={ad.id}
                onPress={() => showAd(i)}
                hitSlop={4}
                style={styles.dotHit}
                accessibilityRole="button"
                accessibilityLabel={`Show ad ${i + 1} of ${count}`}
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.dot, active ? styles.dotActive : styles.dotIdle]} />
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

function AdSlide({
  ad,
  width,
  height,
  onPress,
}: {
  ad: AdData
  width: number
  height: number
  onPress: (ad: AdData) => void
}) {
  const isHouseAd = ad.id === SAMPLE_AD.id
  const imageUrl = getAdImageUrl(ad)
  const tappable = isHouseAd || isAdLinkActionable(ad.ctaUrl)

  return (
    <Pressable
      onPress={() => onPress(ad)}
      disabled={!tappable}
      accessibilityRole="link"
      accessibilityLabel={isHouseAd ? "GG'APP: Care now. Pay over time." : 'Sponsored ad'}
      style={{ width, height }}
    >
      {isHouseAd ? (
        <SampleAd width={width} />
      ) : imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width, height }} resizeMode="cover" />
      ) : null}
    </Pressable>
  )
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Close ad"
      style={styles.close}
    >
      <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
        <Path d="M2 2l8 8M10 2l-8 8" stroke="#091C44" strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  viewport: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.large,
    overflow: 'hidden',
    backgroundColor: '#E8F4FD',
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  dotHit: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotIdle: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
})
