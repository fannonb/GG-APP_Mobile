/** Client-side checks that mirror the backend DTOs, so users see field errors before a 400. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/** Matches RegisterPatientDto: 8+ chars, one uppercase letter, one digit. */
export function passwordProblem(value: string): string | null {
  if (value.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter.'
  if (!/[0-9]/.test(value)) return 'Add at least one number.'
  return null
}

/** National ID formats differ by market: Zimbabwe uses letters and Zambia uses slashes. */
export const NATIONAL_ID_FORMATS: Record<string, { placeholder: string; hint: string; numeric: boolean }> = {
  KE: { placeholder: 'e.g. 30127843', hint: 'Your Kenyan ID or alien card number.', numeric: true },
  ZW: { placeholder: 'e.g. 63-123456-A-42', hint: 'As printed on your Zimbabwean national ID.', numeric: false },
  ZM: { placeholder: 'e.g. 123456/78/1', hint: 'Your Zambian NRC number, including the slashes.', numeric: false },
}
