import { QueryClient, MutationCache, onlineManager } from '@tanstack/react-query'
import { ApiError } from '@gg/shared-api'

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onMutate: () => {
      if (!onlineManager.isOnline()) throw new ApiError('Reconnect before submitting changes or approving payments.', 0)
    },
  }),
  defaultOptions: {
    queries: {
      networkMode: 'always',
      retry: (count, error) => onlineManager.isOnline() && !(error instanceof ApiError && error.status < 500) && count < 2,
      staleTime: 30_000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'always',
      retry: false,
    },
  },
})
