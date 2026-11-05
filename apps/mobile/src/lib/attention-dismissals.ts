/**
 * Pure rules for dismissing "Needs your attention" notices. Mirrors the PWA's
 * attention-dismissals.ts: a dismissal is remembered per item id together with
 * a signature of the item's visible text, so the notice comes back when its
 * situation changes (new amount, new invoice, new count).
 *
 * No React or storage imports here; see useAttentionDismissals.ts for those.
 */

export interface DismissibleAttentionItem {
  /** Stable id for the notice. Notification-backed items use the notification id. */
  id: string
  title: string
  meta?: string
  detail: string
  /**
   * Ids this notice was saved under before it was renamed. A dismissal saved under
   * any of them still hides the notice, since the saved text belongs to the old copy.
   */
  legacyIds?: readonly string[]
}

/** Saved map: item id -> signature of the text that was dismissed. */
export type DismissedMap = Record<string, string>

/** Oldest dismissals drop first so the saved value stays small. */
export const MAX_SAVED_DISMISSALS = 40

/** FNV-1a: short, stable, and changes whenever the text changes. */
export function hashText(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function attentionSignature(item: DismissibleAttentionItem): string {
  return hashText([item.title, item.meta ?? '', item.detail].join('|'))
}

export function isAttentionDismissed(map: DismissedMap, item: DismissibleAttentionItem): boolean {
  if (map[item.id] === attentionSignature(item)) return true
  return (item.legacyIds ?? []).some(id => Object.prototype.hasOwnProperty.call(map, id))
}

export function visibleAttention<T extends DismissibleAttentionItem>(items: T[], map: DismissedMap): T[] {
  return items.filter(item => !isAttentionDismissed(map, item))
}

/** Returns a new map with the item dismissed as its current text. */
export function withAttentionDismissed(
  map: DismissedMap,
  item: DismissibleAttentionItem,
  maxSaved = MAX_SAVED_DISMISSALS,
): DismissedMap {
  const next: DismissedMap = { ...map }
  // Re-inserting moves the id to the end, so the newest dismissals survive pruning.
  delete next[item.id]
  next[item.id] = attentionSignature(item)
  const keys = Object.keys(next)
  for (const key of keys.slice(0, Math.max(0, keys.length - maxSaved))) delete next[key]
  return next
}

/** Accepts whatever was read back from storage and keeps only well-formed entries. */
export function sanitizeDismissedMap(value: unknown): DismissedMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const clean: DismissedMap = {}
  for (const [id, signature] of Object.entries(value as Record<string, unknown>)) {
    if (typeof signature === 'string' && signature.length > 0 && signature.length <= 32) clean[id] = signature
  }
  return clean
}
