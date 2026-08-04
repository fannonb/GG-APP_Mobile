import { useEffect } from 'react'
import { authService, getIsMockApi, patientService } from '@gg/shared-api'
import { queryKeys } from '@gg/shared-hooks'
import { useAuthStore, useNotificationsStore, useUserStore } from '@gg/shared-stores'
import { queryClient } from '@/lib/query-client'
import { loadSessionFromStore } from '@/lib/token-storage'
import { registerPushSubscription } from '@/services/notifications'

export function SessionBootstrap() {
  const loggedIn = useAuthStore(s => s.loggedIn)
  const userRole = useAuthStore(s => s.userRole)
  const setSession = useAuthStore(s => s.setSession)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    void (async () => {
      await loadSessionFromStore()
      try {
        const session = await authService.refreshSession()
        if (session) {
          setSession(session.role)
          return
        }
      } catch {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      }

      if (!getIsMockApi()) {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      }
      logout()
    })()
  }, [setSession, logout])

  useEffect(() => {
    if (!loggedIn || userRole !== 'patient') return

    void (async () => {
      try {
        const { userMode } = useAuthStore.getState()
        const [profile, notifications] = await Promise.all([
          patientService.getProfile(userMode),
          patientService.getNotifications(userMode),
        ])
        useUserStore.setState({
          user: profile.user,
          beneficiaries: profile.beneficiaries,
        })
        queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
        useNotificationsStore.setState({ patientNotifs: notifications })
        void registerPushSubscription()
      } catch {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [] })
      }
    })()
  }, [loggedIn, userRole])

  return null
}
