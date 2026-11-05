import { useEffect, useState } from 'react'

/** Every list in the app shows at most this many rows per page. */
export const PAGE_SIZE = 10

/**
 * What to do when the requested page no longer exists after the list shrinks:
 * 'last' shows the last page (the default), 'first' returns to page 1 as the PWA's
 * allocation screen does.
 */
export type OutOfRangePage = 'last' | 'first'

export function resolvePage(requested: number, pageCount: number, outOfRange: OutOfRangePage = 'last'): { page: number; reset: boolean } {
  if (requested < pageCount) return { page: requested, reset: false }
  if (outOfRange === 'first') return { page: 0, reset: true }
  return { page: pageCount - 1, reset: false }
}

/**
 * Client-side paging for lists that are already loaded. Pass a `resetKey` that changes
 * with the filter or tab, so the list returns to page 1 when it changes.
 */
export function usePaged<T>(items: T[], resetKey: unknown = null, pageSize = PAGE_SIZE, outOfRange: OutOfRangePage = 'last') {
  const [requested, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [resetKey])
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  // The page can be past the end after a filter or refresh. Handled during render, as the PWA does, so it sticks.
  const { page, reset } = resolvePage(requested, pageCount, outOfRange)
  if (reset) setPage(0)
  const pageItems = items.slice(page * pageSize, (page + 1) * pageSize)
  return { pageItems, pager: { page, pageSize, total: items.length, onPage: setPage } }
}
