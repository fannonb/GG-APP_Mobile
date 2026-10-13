/**
 * Standard lists for data the app collects for admin insights. Keep in step
 * with the API (gg-app backend/src/common/constants/health-data.ts), which
 * validates these codes.
 */

/** How the patient prefers to repay credit. `short` fits on a chip. */
export const REPAYMENT_METHODS: Array<{ code: string; label: string; short: string }> = [
  { code: 'mobile_money', label: 'Mobile money (M-Pesa, EcoCash, Airtel Money)', short: 'Mobile money' },
  { code: 'bank', label: 'Bank transfer or debit order', short: 'Bank / debit order' },
  { code: 'salary', label: 'Salary deduction', short: 'Salary deduction' },
  { code: 'card', label: 'Debit or credit card', short: 'Card' },
  { code: 'cash', label: "Cash at the finance partner's branch", short: 'Cash at branch' },
]

export const BENEFICIARY_GENDERS: Array<{ code: 'female' | 'male' | 'prefer_not_to_say'; label: string }> = [
  { code: 'female', label: 'Female' },
  { code: 'male', label: 'Male' },
  { code: 'prefer_not_to_say', label: 'Prefer not to say' },
]
