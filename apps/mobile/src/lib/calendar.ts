import * as Calendar from 'expo-calendar/legacy'
import type { Appointment } from '@gg/shared-types'

/** Appointment slots are booked as 30-minute visits, matching the web calendar export. */
const APPOINTMENT_MINUTES = 30

/**
 * Builds the local start time from the appointment's date (YYYY-MM-DD) and time
 * ("HH:mm", or "h:mm AM/PM"). The date is read as a local calendar day so the
 * event never shifts to the previous day in timezones behind UTC.
 */
export function getAppointmentStart(apt: Pick<Appointment, 'date' | 'time'>): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(apt.date)
  const start = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(apt.date)
  if (Number.isNaN(start.getTime())) return null

  const time = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(apt.time?.trim() ?? '')
  let hours = time ? Number(time[1]) : 9
  const minutes = time ? Number(time[2]) : 0
  const meridiem = time?.[3]?.toUpperCase()
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  start.setHours(hours, minutes, 0, 0)
  return start
}

/**
 * Opens the phone's own "new event" screen pre-filled with the appointment, so
 * the patient reviews it and taps Save. Nothing is written to the calendar
 * without their confirmation. Resolves false if the event could not be built.
 */
export async function addAppointmentToCalendar(
  apt: Pick<Appointment, 'date' | 'time' | 'service' | 'provider'>,
  location?: string,
): Promise<boolean> {
  const startDate = getAppointmentStart(apt)
  if (!startDate) return false
  const endDate = new Date(startDate.getTime() + APPOINTMENT_MINUTES * 60_000)

  await Calendar.createEventInCalendarAsync({
    title: [apt.service, apt.provider].filter(Boolean).join(' · ') || 'GG\'APP appointment',
    startDate,
    endDate,
    location: location || undefined,
    notes: 'Booked through GG\'APP.',
  })
  return true
}
