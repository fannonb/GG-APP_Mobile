import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getIsMockApi } from '@gg/shared-api'
import { queryKeys } from './query-keys'
import { creditService } from '@gg/shared-api'
import type { ApplyCreditPayload, IncreaseCreditPayload } from '@gg/shared-types'

export function useApplyCreditMutation() {
  const queryClient = useQueryClient()
  const creditMode = getIsMockApi() ? 'mock' : 'live'

  return useMutation({
    mutationFn: (payload: ApplyCreditPayload) => creditService.apply(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.credit(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.profile(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(creditMode) })
    },
  })
}

export function useIncreaseCreditMutation() {
  const queryClient = useQueryClient()
  const creditMode = getIsMockApi() ? 'mock' : 'live'

  return useMutation({
    mutationFn: (payload: IncreaseCreditPayload) => creditService.increase(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.credit(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.profile(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(creditMode) })
    },
  })
}
