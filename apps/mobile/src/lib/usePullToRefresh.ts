import { useCallback, useState } from 'react'

/**
 * Pull-to-refresh state for a screen. Pass the screen's query refetch
 * functions; spread the result onto <ScrollArea>.
 */
export function usePullToRefresh(...refetchers: Array<() => Promise<unknown>>) {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all(refetchers.map(refetch => refetch()))
    } finally {
      setRefreshing(false)
    }
    // Refetch functions from react-query are stable between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refetchers)
  return { refreshing, onRefresh }
}
