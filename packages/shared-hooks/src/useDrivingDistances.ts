import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GeoPosition } from '@gg/shared-utils'
import { fetchDrivingDistancesKm, toGeoCoord, formatDistance, getCalculatedDistance } from '@gg/shared-utils'

interface LocatableItem {
  id: string | number
  lat?: number | null
  lng?: number | null
  distance?: string
}

function itemKey(id: string | number) {
  return String(id)
}

function buildRoutableKey(items: LocatableItem[]): string {
  return items
    .filter(item => item.lat != null && item.lng != null)
    .map(item => `${item.id}:${item.lat},${item.lng}`)
    .join('|')
}

const EMPTY_MAP = new Map<string, number>()

export function useDrivingDistances(
  origin: GeoPosition | null,
  items: LocatableItem[],
) {
  const [distancesKm, setDistancesKm] = useState<Map<string, number>>(EMPTY_MAP)
  const [loading, setLoading] = useState(false)
  const fetchedKey = useRef('')
  const itemsRef = useRef(items)
  itemsRef.current = items

  const routableKey = useMemo(() => buildRoutableKey(items), [items])

  useEffect(() => {
    const cacheKey = `${origin?.lat ?? ''},${origin?.lng ?? ''}|${routableKey}`
    if (cacheKey === fetchedKey.current) return
    fetchedKey.current = cacheKey

    if (!origin || routableKey === '') {
      setDistancesKm(EMPTY_MAP)
      setLoading(false)
      return
    }

    const currentItems = itemsRef.current
    const routable = currentItems
      .map(item => ({ item, coord: toGeoCoord(item.lat, item.lng) }))
      .filter((e): e is { item: LocatableItem; coord: GeoPosition } => e.coord != null)

    if (routable.length === 0) return

    let cancelled = false
    setLoading(true)

    fetchDrivingDistancesKm(origin, routable.map(e => e.coord))
      .then(values => {
        if (cancelled) return
        const next = new Map<string, number>()
        routable.forEach((entry, index) => {
          const km = values[index]
          if (km != null) next.set(itemKey(entry.item.id), km)
        })
        setDistancesKm(next)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setDistancesKm(EMPTY_MAP)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [origin?.lat, origin?.lng, routableKey])

  const getLabel = useCallback((item: LocatableItem) => {
    const km = distancesKm.get(itemKey(item.id))
    if (km != null) return formatDistance(km)
    if (loading && item.lat != null && item.lng != null) return 'Calculating…'
    return getCalculatedDistance(item, origin)
  }, [distancesKm, loading, origin])

  const getKm = useCallback(
    (item: LocatableItem) => distancesKm.get(itemKey(item.id)) ?? null,
    [distancesKm],
  )

  return { distancesKm, getLabel, getKm, loading }
}
