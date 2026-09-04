import type { Patient } from '@gg/shared-types'

/** Section is unlocked if the flag is on, or the account already has beneficiaries. */
export function isBeneficiariesActive(
  beneficiariesEnabled: boolean | undefined,
  beneficiaryCount: number,
): boolean {
  return Boolean(beneficiariesEnabled) || beneficiaryCount > 0
}

/** Server-derived onboarding steps: 1 account, 2 email, 3 PIN, 4 credit, 5 first booking. */
export function derivePatientOnboardingCompletedSteps(
  user: Pick<Patient, 'hasPaymentPin' | 'creditStatus'>,
  appointmentCount: number,
): number[] {
  const steps = [1, 2]
  if (user.hasPaymentPin) steps.push(3)
  if (user.creditStatus !== 'not_applied') steps.push(4)
  if (appointmentCount > 0) steps.push(5)
  return steps
}
