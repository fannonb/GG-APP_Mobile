import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { useLocationStore } from '@gg/shared-stores'

export function useMobileLocation() {
  const started = useRef(false)
  const watchRef = useRef<Location.LocationSubscription | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const store = useLocationStore.getState()
    if (store.locState !== 'idle') return

    store.setLoading()

    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          useLocationStore.getState().setDenied('Location permission denied')
          return
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30_000,
            distanceInterval: 50,
          },
          (loc) => {
            useLocationStore.getState().setPosition({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            })
          },
        )

        watchRef.current = sub
      } catch {
        useLocationStore.getState().setDenied('Failed to get location')
      }
    })()

    return () => {
      watchRef.current?.remove()
      watchRef.current = null
    }
  }, [])
}

export async function requestLocationRetry() {
  const store = useLocationStore.getState()
  store.setLoading()

  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      store.setDenied('Location permission denied')
      return
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
    store.setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude })
  } catch {
    store.setDenied('Failed to get location')
  }
}
