import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import Pressable from '@/components/Pressable'
import { colors, fontWeights, radii } from '@/theme'

export interface MapPoint {
  lat: number
  lng: number
}

interface MapPinPickerProps {
  /** The pin pharmacies are searched from. Null until one is dropped. */
  value: MapPoint | null
  onChange: (point: MapPoint) => void
  /** The patient's current location, when known. Centres the map and feeds "Use my location". */
  center?: MapPoint | null
}

/** Harare, the same fallback view the web map uses, until a location is known. */
const DEFAULT_CENTER: MapPoint = { lat: -17.8292, lng: 31.0522 }
const MAP_BG = '#E8EEF4'
const CLEAR_PIN_JS = 'window.ggClearPin && window.ggClearPin(); true;'

function setPinJs(point: MapPoint) {
  return `window.ggSetPin && window.ggSetPin(${point.lat}, ${point.lng}); true;`
}

function setCenterJs(point: MapPoint) {
  return `window.ggSetCenter && window.ggSetCenter(${point.lat}, ${point.lng}); true;`
}

/**
 * The Leaflet page. Built once per mount: the start view is baked in, and every later
 * change arrives through injected JS, so the WebView never reloads on a pin move.
 */
function buildMapHtml(start: MapPoint, zoom: number): string {
  const init = JSON.stringify({ lat: start.lat, lng: start.lng, zoom })
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${MAP_BG}; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function () {
  function send(message) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    } catch (e) {}
  }

  if (!window.L) {
    send({ error: 'map-unavailable' });
    return;
  }

  var init = ${init};
  var map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([init.lat, init.lng], init.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var pinIcon = L.divIcon({
    className: '',
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    html: '<svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 28.4 17 42.5 17 42.5S32.5 28.4 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z" fill="#0B7BC0" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16.5" r="5.5" fill="#fff"/></svg>'
  });

  var marker = null;

  function postPoint(latlng) {
    send({ lat: latlng.lat, lng: latlng.lng });
  }

  function setPin(lat, lng) {
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
      marker.on('dragend', function () { postPoint(marker.getLatLng()); });
    } else {
      marker.setLatLng([lat, lng]);
    }
  }

  function clearPin() {
    if (marker) {
      marker.remove();
      marker = null;
    }
  }

  map.on('click', function (event) {
    setPin(event.latlng.lat, event.latlng.lng);
    postPoint(event.latlng);
  });

  window.ggSetPin = function (lat, lng) {
    setPin(lat, lng);
    map.panTo([lat, lng]);
  };
  window.ggClearPin = clearPin;
  window.ggSetCenter = function (lat, lng) {
    map.setView([lat, lng], 16);
  };

  setTimeout(function () { map.invalidateSize(); }, 150);
  send({ ready: true });
})();
</script>
</body>
</html>`
}

/**
 * Map to drop or drag the pin that pharmacies are searched from. Tapping the map or dragging
 * the marker posts {lat, lng} back. "Use my location" sits outside the WebView.
 */
/** The part of the WebView this component calls. A callback ref keeps the WebView's props typed. */
interface WebViewHandle {
  injectJavaScript: (script: string) => void
}

export function MapPinPicker({ value, onChange, center }: MapPinPickerProps) {
  const webRef = useRef<WebViewHandle | null>(null)
  const setWebRef = useCallback((instance: WebViewHandle | null) => {
    webRef.current = instance
  }, [])
  // Injected JS is dropped until the page reports ready, so pushes wait for that signal.
  const readyRef = useRef(false)
  // The last point the map itself sent. Its echo must not be pushed back, or a drag would pan the map.
  const lastFromMapRef = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const [source] = useState(() => ({
    html: buildMapHtml(value ?? center ?? DEFAULT_CENTER, value || center ? 16 : 12),
  }))

  const valueLat = value?.lat ?? null
  const valueLng = value?.lng ?? null
  const centerLat = center?.lat ?? null
  const centerLng = center?.lng ?? null
  const hasPin = valueLat !== null && valueLng !== null

  // Pin moved from outside (Use my location, a GPS update): push it unless the map just sent it.
  useEffect(() => {
    if (!readyRef.current) return
    if (valueLat === null || valueLng === null) {
      lastFromMapRef.current = null
      webRef.current?.injectJavaScript(CLEAR_PIN_JS)
      return
    }
    const key = `${valueLat},${valueLng}`
    if (key === lastFromMapRef.current) return
    lastFromMapRef.current = key
    webRef.current?.injectJavaScript(setPinJs({ lat: valueLat, lng: valueLng }))
  }, [valueLat, valueLng])

  // Until a pin exists, follow the current location (e.g. GPS arriving after the map mounted).
  useEffect(() => {
    if (!readyRef.current || hasPin || centerLat === null || centerLng === null) return
    webRef.current?.injectJavaScript(setCenterJs({ lat: centerLat, lng: centerLng }))
  }, [centerLat, centerLng, hasPin])

  const handleMessage = (event: WebViewMessageEvent) => {
    let data: unknown
    try {
      data = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    const message = (data ?? {}) as { lat?: unknown; lng?: unknown; ready?: unknown; error?: unknown }

    if (
      typeof message.lat === 'number' &&
      typeof message.lng === 'number' &&
      Number.isFinite(message.lat) &&
      Number.isFinite(message.lng)
    ) {
      const point = { lat: message.lat, lng: message.lng }
      lastFromMapRef.current = `${point.lat},${point.lng}`
      onChange(point)
      return
    }

    if (message.ready === true) {
      readyRef.current = true
      if (valueLat !== null && valueLng !== null) {
        lastFromMapRef.current = `${valueLat},${valueLng}`
        webRef.current?.injectJavaScript(setPinJs({ lat: valueLat, lng: valueLng }))
      } else if (centerLat !== null && centerLng !== null) {
        webRef.current?.injectJavaScript(setCenterJs({ lat: centerLat, lng: centerLng }))
      }
      return
    }

    if (message.error) setFailed(true)
  }

  const retry = () => {
    readyRef.current = false
    lastFromMapRef.current = null
    setFailed(false)
    setAttempt(n => n + 1)
  }

  const useMyLocation = () => {
    if (center) onChange({ lat: center.lat, lng: center.lng })
  }

  const hint = hasPin
    ? 'Drag the pin to the exact spot.'
    : centerLat === null
      ? 'Location is off. Tap the map to drop the pin.'
      : 'Tap the map to drop the pin.'

  return (
    <View style={s.wrap}>
      <View style={s.frame}>
        {failed ? (
          <View style={s.fallback}>
            <Text style={s.fallbackText}>The map could not load. Check your connection, then try again.</Text>
            <Pressable style={s.retryBtn} onPress={retry} accessibilityRole="button">
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={attempt}
            ref={setWebRef}
            source={source}
            style={s.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={s.loading}>
                <ActivityIndicator color={colors.blue} />
              </View>
            )}
            nestedScrollEnabled
            scrollEnabled={false}
            onMessage={handleMessage}
            onError={() => setFailed(true)}
          />
        )}
      </View>

      <View style={s.footer}>
        <Text style={s.hint}>{hint}</Text>
        <Pressable
          style={[s.locateBtn, centerLat === null && s.locateBtnDisabled]}
          disabled={centerLat === null}
          onPress={useMyLocation}
          accessibilityRole="button"
          accessibilityState={{ disabled: centerLat === null }}
        >
          <Text style={s.locateText}>Use my location</Text>
        </Pressable>
      </View>
    </View>
  )
}

export default MapPinPicker

const s = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  frame: {
    height: 220,
    borderRadius: radii.default,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: MAP_BG,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MAP_BG,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.blue3,
  },
  fallbackText: {
    fontSize: 13.5,
    fontFamily: fontWeights.medium,
    color: colors.navy,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  retryText: {
    fontSize: 13.5,
    fontFamily: fontWeights.semiBold,
    color: colors.navy,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hint: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },
  locateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: colors.navy,
  },
  locateBtnDisabled: {
    opacity: 0.4,
  },
  locateText: {
    fontSize: 13.5,
    fontFamily: fontWeights.semiBold,
    color: '#FFFFFF',
  },
})
