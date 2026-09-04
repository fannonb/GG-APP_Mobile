import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ledgerService } from '@gg/shared-api'
import type { SetupLedgerPinPayload, ResetLedgerPinPayload } from '@gg/shared-types'
import { queryKeys } from './query-keys'

export function useLedgerStatus() {
  return useQuery({
    queryKey: queryKeys.patient.ledgerStatus,
    queryFn: () => ledgerService.getStatus(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useOwnLedger(beneficiaryId?: string) {
  return useQuery({
    queryKey: [...queryKeys.patient.ledger, beneficiaryId ?? 'all'] as const,
    queryFn: () => ledgerService.getOwnLedger(beneficiaryId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useLedgerAccessLog() {
  return useQuery({
    queryKey: queryKeys.patient.ledgerAccess,
    queryFn: () => ledgerService.getAccessLog(),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

function useLedgerInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.ledgerStatus })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.ledgerAccess })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.ledger })
    void queryClient.invalidateQueries({ queryKey: ['patient', 'notifications'] })
  }
}

export function useSetupLedgerPinMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: (payload: SetupLedgerPinPayload) => ledgerService.setupPin(payload),
    onSuccess: invalidate,
  })
}

export function useResetLedgerPinMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: (payload: ResetLedgerPinPayload) => ledgerService.resetPin(payload),
    onSuccess: invalidate,
  })
}

export function useRevokeLedgerPinMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: () => ledgerService.revokePin(),
    onSuccess: invalidate,
  })
}

export function useRevokeLedgerGrantMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: (grantId: string) => ledgerService.revokeGrant(grantId),
    onSuccess: invalidate,
  })
}
