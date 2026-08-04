import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@gg/shared-api'
import { useAuthStore } from '@gg/shared-stores'
import { useNotificationsStore } from '@gg/shared-stores'
import { useUserStore } from '@gg/shared-stores'
import type { LoginPayload, RegisterPatientPayload, RegisterSPPayload } from '@gg/shared-types'

export function useLoginMutation() {
  const setSession = useAuthStore(s => s.setSession)

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: session => {
      setSession(session.role)
    },
  })
}

export function useRegisterPatientMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPatientPayload) => authService.registerPatient(payload),
  })
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  })
}

export function useRegisterSPMutation() {
  return useMutation({
    mutationFn: (payload: RegisterSPPayload) => authService.registerSP(payload),
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const logout = useAuthStore(s => s.logout)
  const resetUser = useUserStore(s => s.reset)

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      logout()
      resetUser()
      useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      queryClient.clear()
    },
  })
}
