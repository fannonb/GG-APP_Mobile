import type { Appointment } from '@gg/shared-types'

export interface AppointmentRebookPrefill {
  service: string
  forSelf: boolean
  beneficiaryId?: string
  description?: string
}

export interface AppointmentRebookNavigationParams {
  providerId: number | string
  rebook: AppointmentRebookPrefill
}

export function buildAppointmentRebookParams(
  appointment: Appointment,
  patientName?: string,
): AppointmentRebookNavigationParams | null {
  const providerId = appointment.providerId
  if (!providerId) return null

  const forSelf =
    appointment.forSelf ??
    (appointment.for === 'Self' || (!!patientName && appointment.for === patientName))

  return {
    providerId,
    rebook: {
      service: appointment.service,
      forSelf,
      beneficiaryId: appointment.beneficiaryId,
      description: `Follow-up booking for ${appointment.service}`,
    },
  }
}
