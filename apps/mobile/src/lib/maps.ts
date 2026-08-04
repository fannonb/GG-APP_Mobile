export interface MapLocationInput {
  name: string
  address?: string
  lat?: number | null
  lng?: number | null
}

export function hasMappableLocation(location: MapLocationInput): boolean {
  return Boolean(
    location.address?.trim() ||
      (location.lat != null && location.lng != null),
  )
}

/** Slippy-map tile index for raster tile providers (Carto / OSM). */
export function latLngToTile(lat: number, lng: number, zoom: number) {
  const scale = 2 ** zoom
  const x = Math.floor(((lng + 180) / 360) * scale)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  )
  return { x, y, zoom }
}

/** Single-image static map preview (no API key). Yandex uses lon,lat order. */
export function buildStaticMapPreviewUrl(lat: number, lng: number, width = 600, height = 220): string {
  const w = Math.min(Math.max(Math.round(width), 200), 650)
  const h = Math.min(Math.max(Math.round(height), 120), 450)
  return (
    `https://static-maps.yandex.ru/1.x/?lang=en_US` +
    `&ll=${lng},${lat}&z=15&l=map&size=${w},${h}` +
    `&pt=${lng},${lat},pm2rdm`
  )
}

/** CartoCDN light tiles — reliable fallback when a static map image fails. */
export function buildCartoTileUrl(zoom: number, x: number, y: number): string {
  return `https://a.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png`
}

/**
 * OpenStreetMap's embed page renders the map inside WebView and avoids the
 * native Image/tile loading path, which is unreliable in Expo Go on Android.
 */
export function buildOpenStreetMapEmbedUrl(lat: number, lng: number): string {
  const latitudeDelta = 0.012
  const longitudeDelta = 0.018
  const west = lng - longitudeDelta
  const south = lat - latitudeDelta
  const east = lng + longitudeDelta
  const north = lat + latitudeDelta

  return (
    'https://www.openstreetmap.org/export/embed.html' +
    `?bbox=${west},${south},${east},${north}` +
    '&layer=mapnik' +
    `&marker=${lat},${lng}`
  )
}

export const MAP_PREVIEW_ZOOM = 15
export const MAP_PREVIEW_GRID = 3
