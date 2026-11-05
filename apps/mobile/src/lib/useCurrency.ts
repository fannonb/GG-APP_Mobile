import { useUserStore } from '@gg/shared-stores'
import { getCountryByCode } from '@gg/shared-config'

/** The signed-in patient's currency symbol, for formatCurrency(). */
export function useCurrency(): string {
  const countryCode = useUserStore(s => s.user?.countryCode) ?? ''
  return getCountryByCode(countryCode)?.currencySymbol ?? ''
}
