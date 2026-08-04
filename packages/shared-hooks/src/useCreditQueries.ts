import { useQuery } from '@tanstack/react-query'
import { getIsMockApi } from '@gg/shared-api'
import { queryKeys } from './query-keys'
import { creditService } from '@gg/shared-api'
import { useUserStore } from '@gg/shared-stores'

export function useCreditStatus() {
  const creditMode = getIsMockApi() ? 'mock' : 'live'

  return useQuery({
    queryKey: queryKeys.patient.credit(creditMode),
    queryFn: async () => {
      const status = await creditService.getStatus()
      useUserStore.getState().updateUser({
        creditStatus: status.creditStatus,
        creditLimit: status.creditLimit,
        creditUsed: status.creditUsed,
        creditAvailable: status.creditAvailable,
        financePartnerId: status.financePartnerId as 'moneymart' | 'equity' | undefined,
        creditAccountRef: status.creditAccountRef,
      })
      return status
    },
  })
}
