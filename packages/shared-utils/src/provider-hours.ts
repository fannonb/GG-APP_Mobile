import { formatTime12h } from './format'
import type { Provider } from '@gg/shared-types'

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

type HoursDay = { open: boolean; from: string; to: string }

function nextOpenLabel(
  hours: Record<string, HoursDay> | undefined,
  fromDayIndex: number,
): string | null {
  if (!hours) return null
  for (let offset = 1; offset <= 7; offset++) {
    const key = DAY_KEYS[(fromDayIndex + offset) % 7]
    const day = hours[key]
    if (day?.open && day.from) {
      const when = offset === 1 ? 'tomorrow' : key
      return `Opens ${when} ${formatTime12h(day.from)}`
    }
  }
  return null
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * The booking slots a provider can actually take on `date`: inside that day's
 * opening hours, and (for today) at least `leadMinutes` from now. Providers
 * without structured hours get every candidate slot, as before.
 */
export function getBookableSlots(
  provider: Pick<Provider, 'hours' | 'openingHours'> | undefined,
  date: Date,
  candidates: readonly string[],
  now: Date = new Date(),
  leadMinutes = 60,
): { slots: string[]; closed: boolean } {
  let slots = [...candidates]
  const is247 = provider?.hours?.trim().toLowerCase() === '24/7'
  const hours = provider?.openingHours

  if (hours && !is247) {
    const day = hours[DAY_KEYS[date.getDay()]]
    if (!day?.open) return { slots: [], closed: true }
    const from = toMinutes(day.from || '00:00')
    // "00:00" or "23:59" as a closing time means open until midnight.
    const to = !day.to || day.to === '00:00' || day.to === '23:59' ? 24 * 60 : toMinutes(day.to)
    slots = slots.filter(slot => {
      const m = toMinutes(slot)
      return m >= from && m < to
    })
  }

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    const earliest = now.getHours() * 60 + now.getMinutes() + leadMinutes
    slots = slots.filter(slot => toMinutes(slot) >= earliest)
  }

  return { slots, closed: false }
}

/** Short browse label: “Open until 6:00 PM”, “Closed today”, or “Open 24 hours”. */
export function getProviderHoursSummary(provider: Pick<Provider, 'status' | 'hours' | 'openingHours'>): string {
  const hoursStr = provider.hours?.trim()
  if (hoursStr?.toLowerCase() === '24/7') return 'Open 24 hours'

  const todayIndex = new Date().getDay()
  const today = provider.openingHours?.[DAY_KEYS[todayIndex]]

  if (today) {
    const allDay = today.from === '00:00' && (today.to === '23:59' || today.to === '00:00')
    if (provider.status === 'open' && today.open && allDay) return 'Open 24 hours'
    if (provider.status === 'open' && today.open && today.to) {
      return `Open until ${formatTime12h(today.to)}`
    }
    if (today.open && today.from) return `Opens ${formatTime12h(today.from)}`
    return nextOpenLabel(provider.openingHours, todayIndex) ?? 'Closed today'
  }

  if (provider.status === 'open') {
    return hoursStr && hoursStr !== '—' ? hoursStr : 'Open now'
  }
  return hoursStr && hoursStr !== '—' ? hoursStr : 'Closed'
}
