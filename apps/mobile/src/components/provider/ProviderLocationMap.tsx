import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { WebView } from 'react-native-webview'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import {
  buildOpenStreetMapEmbedUrl,
  hasMappableLocation,
  type MapLocationInput,
} from '@/lib/maps'

interface ProviderLocationMapProps {
  location: MapLocationInput
  onDirections: () => void
}

function PinGlyph({ size = 28, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9} r={2.4} stroke={color} strokeWidth={1.6} />
    </Svg>
  )
}

export function ProviderLocationMap({
  location,
  onDirections,
}: ProviderLocationMapProps) {
  const [mapUnavailable, setMapUnavailable] = useState(false)

  if (!hasMappableLocation(location)) return null

  const hasCoordinates = location.lat != null && location.lng != null
  const addressText =
    location.address?.trim() ||
    (hasCoordinates ? `${location.lat?.toFixed(5)}, ${location.lng?.toFixed(5)}` : '')

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Location</Text>
      <Text style={s.address}>{addressText}</Text>

      <View style={s.mapFrame}>
        {hasCoordinates && !mapUnavailable ? (
          <WebView
            source={{ uri: buildOpenStreetMapEmbedUrl(location.lat!, location.lng!) }}
            style={s.webMap}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            onError={() => setMapUnavailable(true)}
            onHttpError={() => setMapUnavailable(true)}
          />
        ) : (
          <View style={s.pinFallback}>
            <View style={s.pinCircle}>
              <PinGlyph size={26} color={colors.blue} />
            </View>
            <Text style={s.pinFallbackTitle} numberOfLines={1}>
              {location.name}
            </Text>
            <Text style={s.pinFallbackSub} numberOfLines={2}>
              {addressText}
            </Text>
            {hasCoordinates ? (
              <Text style={s.coordsText}>
                {location.lat!.toFixed(5)}, {location.lng!.toFixed(5)}
              </Text>
            ) : null}
          </View>
        )}
        {hasCoordinates && !mapUnavailable ? (
          <View style={s.mapPin} pointerEvents="none">
            <PinGlyph size={14} color={colors.blue} />
            <Text style={s.mapPinText} numberOfLines={1}>{location.name}</Text>
          </View>
        ) : null}
      </View>

      <Pressable style={s.directionsBtn} onPress={onDirections}>
        <Text style={s.directionsBtnText}>Get Directions</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.text },
  address: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 20,
  },
  mapFrame: {
    height: 168,
    borderRadius: radii.default,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EEF4',
  },
  webMap: {
    width: '100%',
    height: '100%',
  },
  mapPin: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapPinText: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: colors.navy,
    flexShrink: 1,
  },
  pinFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
    backgroundColor: colors.blue3,
  },
  pinCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinFallbackTitle: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.navy,
    textAlign: 'center',
  },
  pinFallbackSub: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 16,
  },
  coordsText: {
    fontSize: 10,
    fontFamily: fontWeights.medium,
    color: colors.blueInk,
    marginTop: 2,
  },
  directionsBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: colors.navy,
  },
  directionsBtnText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: '#FFFFFF',
  },
})
