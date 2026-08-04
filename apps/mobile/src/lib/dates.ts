/** Normalize DD/MM/YYYY or YYYY-MM-DD to ISO date string (YYYY-MM-DD). */
export function normalizeDobInput(value: string): string | null {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const parts = trimmed.split(/[/-]/).map(part => part.trim())
  if (parts.length !== 3) {
    return null
  }

  const [day, month, year] = parts
  if (year.length !== 4 || month.length < 1 || day.length < 1) {
    return null
  }

  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }

  return normalized
}

/** Format raw digits as DD/MM/YYYY while typing. */
export function formatDobDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Convert ISO or display DOB to DD/MM/YYYY for the input field. */
export function formatDobForDisplay(value: string): string {
  const normalized = normalizeDobInput(value)
  if (!normalized) return value
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

/** Convert a Date to DD/MM/YYYY display format. */
export function dateToDobDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Parse DD/MM/YYYY or YYYY-MM-DD to a Date, or null if invalid. */
export function parseDobToDate(value: string): Date | null {
  const normalized = normalizeDobInput(value)
  if (!normalized) return null
  const [year, month, day] = normalized.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function defaultDobPickerDate(): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 25)
  return date
}
