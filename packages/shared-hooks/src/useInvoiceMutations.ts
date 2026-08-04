import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import { patientService } from '@gg/shared-api'
import { invoicesService } from '@gg/shared-api'
import type {
  AuthorizePaymentPayload,
  AuthorizePaymentResult,
  CreateAppointmentPayload,
  SetupPaymentPinPayload,
} from '@gg/shared-types'
import { useAuthStore } from '@gg/shared-stores'
import { useUserStore } from '@gg/shared-stores'

export function useAuthorizePaymentMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: AuthorizePaymentPayload) =>
      invoicesService.authorizePayment(payload),
    onSuccess: (result: AuthorizePaymentResult, payload) => {
      if (result.complete && result.walletAmountPaid != null) {
        useUserStore.setState(state => ({
          user: {
            ...state.user,
            creditAvailable: Number(
              (state.user.creditAvailable - result.walletAmountPaid!).toFixed(2),
            ),
            creditUsed: Number(
              (state.user.creditUsed + result.walletAmountPaid!).toFixed(2),
            ),
          },
        }))
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoice(payload.invoiceId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoices(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.transactions(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: ['patient', 'credit'],
      })
    },
  })
}

export function useCreateAppointmentMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) =>
      patientService.createAppointment(payload, userMode),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.appointments(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
    },
  })
}

export function useSetupPaymentPinMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)
  const completeOnboardingStep = useAuthStore(s => s.completeOnboardingStep)

  return useMutation({
    mutationFn: (payload: SetupPaymentPinPayload) =>
      patientService.setupPaymentPin(payload),
    onSuccess: () => {
      completeOnboardingStep(3)
      useUserStore.setState(state => ({
        user: {
          ...state.user,
          hasPaymentPin: true,
        },
      }))
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
    },
  })
}

export function useRejectInvoiceMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      invoicesService.rejectInvoice(invoiceId, reason),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoice(variables.invoiceId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoices(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
    },
  })
}
