import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import { adsService } from '@gg/shared-api'
import { useAuthStore } from '@gg/shared-stores'

/** The ads the admin configured for this patient. The server filters them; newest first. */
export function usePatientAds() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.ads(userMode),
    queryFn: () => adsService.getPatientAds(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
