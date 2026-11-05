import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { focusManager } from '@tanstack/react-query'
import { ApiError, apiClient, authService, patientService } from '@gg/shared-api'
import { queryKeys } from '@gg/shared-hooks'
import { useAuthStore, useNotificationsStore, useUserStore } from '@gg/shared-stores'
import { queryClient } from '@/lib/query-client'
import { loadSessionFromStore, mobileTokenStorage, onSessionCleared } from '@/lib/token-storage'
import { clearPatientQueryCache, restorePatientQueryCache } from '@/lib/patient-query-cache'
import { checkConnection, setReachable, useConnectionStore } from '@/lib/connection'
import { registerPushSubscription } from '@/services/notifications'

function restoreProfileFromCache() {
  for (const mode of ['existing', 'new'] as const) {
    const profile = queryClient.getQueryData<Awaited<ReturnType<typeof patientService.getProfile>>>(queryKeys.patient.profile(mode))
      ?? queryClient.getQueryData<Awaited<ReturnType<typeof patientService.getDashboard>>>(queryKeys.patient.dashboard(mode))
    if (!profile) continue
    useAuthStore.getState().setUserMode(mode)
    useUserStore.setState({ user: profile.user, beneficiaries: 'beneficiaries' in profile ? profile.beneficiaries : [] })
    useNotificationsStore.setState({ patientNotifs: queryClient.getQueryData(queryKeys.patient.notifications(mode)) ?? [] })
    break
  }
}

export function SessionBootstrap() {
  const loggedIn = useAuthStore(s => s.loggedIn)
  const userRole = useAuthStore(s => s.userRole)
  const prepared = useRef(false)

  useEffect(() => {
    let active = true
    const clearLocalSession = () => {
      prepared.current = false
      void queryClient.cancelQueries()
      queryClient.clear()
      useUserStore.getState().reset()
      useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      useAuthStore.getState().logout()
      void clearPatientQueryCache()
    }
    const unsubscribe = onSessionCleared(clearLocalSession)
    const networkInterceptor = apiClient.interceptors.response.use(response => response, error => {
      if (error instanceof ApiError && error.status === 0) setReachable(false)
      return Promise.reject(error)
    })
    void (async () => {
      try {
        const stored = await loadSessionFromStore()
        if (!active) return
        if (!stored || stored.role !== 'patient') {
          mobileTokenStorage.clear()
          return
        }
        await restorePatientQueryCache(stored)
        if (!active || !mobileTokenStorage.getSession()) return
        prepared.current = true
        restoreProfileFromCache()
        if (await checkConnection()) {
          try {
            const refreshed = await authService.refreshSession()
            if (!refreshed || refreshed.role !== 'patient') { mobileTokenStorage.clear(); return }
          } catch (error) {
            if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) setReachable(false)
            // A connection/server failure does not invalidate the saved session.
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
              mobileTokenStorage.clear()
              return
            }
          }
        }
        if (active && mobileTokenStorage.getSession()?.role === 'patient') useAuthStore.getState().setSession('patient')
      } finally {
        if (active) useConnectionStore.setState({ restoring: false })
      }
    })().catch(() => { if (active) useConnectionStore.setState({ restoring: false }) })
    return () => { active = false; unsubscribe(); apiClient.interceptors.response.eject(networkInterceptor) }
  }, [])

  useEffect(() => {
    if (!loggedIn || userRole !== 'patient') return

    let active = true
    const session = mobileTokenStorage.getSession()
    void (async () => {
      if (!prepared.current && session) {
        await restorePatientQueryCache(session)
        prepared.current = true
      }
      if (!await checkConnection() || !active) return
      const { userMode } = useAuthStore.getState()
      const results = await Promise.allSettled([patientService.getProfile(userMode), patientService.getNotifications(userMode)])
      if (!active || !mobileTokenStorage.getSession()) return
      const [profile, notifications] = results
      if (profile.status === 'fulfilled') {
        useUserStore.setState({ user: profile.value.user, beneficiaries: profile.value.beneficiaries })
        queryClient.setQueryData(queryKeys.patient.profile(userMode), profile.value)
      }
      if (notifications.status === 'fulfilled') {
        useNotificationsStore.setState({ patientNotifs: notifications.value })
        queryClient.setQueryData(queryKeys.patient.notifications(userMode), notifications.value)
      }
      void registerPushSubscription().catch(() => {})
    })().catch(() => {})
    return () => { active = false }
  }, [loggedIn, userRole])

  useEffect(() => {
    let active = true
    let refreshing = false
    const check = async (resumed: boolean) => {
      if (refreshing || AppState.currentState === 'background') return
      refreshing = true
      try {
        const wasOffline = useConnectionStore.getState().reachable === false
        const online = await checkConnection()
        if (!active || !online || (!resumed && !wasOffline)) return
        if (!useAuthStore.getState().loggedIn) return
        const session = await authService.refreshSession()
        if (!active) return
        if (!session || session.role !== 'patient') { mobileTokenStorage.clear(); return }
        await queryClient.invalidateQueries({ queryKey: ['patient'] })
      } catch (error) {
        if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) setReachable(false)
        // Token storage is cleared only when the backend rejects credentials.
      } finally { refreshing = false }
    }
    const appState = AppState.addEventListener('change', state => {
      focusManager.setFocused(state === 'active')
      if (state === 'active') void check(true)
    })
    focusManager.setFocused(AppState.currentState === 'active')
    void check(false)
    const interval = setInterval(() => void check(false), 30_000)
    return () => { active = false; appState.remove(); clearInterval(interval) }
  }, [])

  return null
}
