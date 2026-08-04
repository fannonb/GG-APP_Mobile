/** Section is unlocked if the flag is on, or the account already has beneficiaries. */
export function isBeneficiariesActive(
  beneficiariesEnabled: boolean | undefined,
  beneficiaryCount: number,
): boolean {
  return Boolean(beneficiariesEnabled) || beneficiaryCount > 0
}
