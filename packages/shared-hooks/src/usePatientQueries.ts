import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import { patientService, providersService, reviewsService, invoicesService, getIsMockApi } from '@gg/shared-api'
import { useAuthStore, useUserStore } from '@gg/shared-stores'

export function usePatientProfile() {
  const userMode = useAuthStore(s => s.userMode)
  const query = useQuery({
    queryKey: queryKeys.patient.profile(userMode),
    queryFn: () => patientService.getProfile(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  useEffect(() => {
    if (!query.data) return
    useUserStore.setState({
      user: query.data.user,
      beneficiaries: query.data.beneficiaries,
    })
  }, [query.data])

  return query
}

export function usePatientDashboard() {
  const userMode = useAuthStore(s => s.userMode)
  const query = useQuery({
    queryKey: queryKeys.patient.dashboard(userMode),
    queryFn: () => patientService.getDashboard(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!query.data?.user) return
    useUserStore.getState().setUser(query.data.user)
  }, [query.data])

  return query
}

export function usePatientAppointments() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.appointments(userMode),
    queryFn: () => patientService.getAppointments(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function usePatientTransactions() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.transactions(userMode),
    queryFn: () => patientService.getTransactions(userMode),
  })
}

export function usePatientNotifications() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.notifications(userMode),
    queryFn: () => patientService.getNotifications(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  })
}

export function usePatientNews() {
  return useQuery({
    queryKey: queryKeys.patient.news,
    queryFn: () => patientService.getNews(),
    staleTime: 0,
    refetchOnMount: 'always',
    initialData: getIsMockApi() ? patientService.getNewsMock() : undefined,
  })
}

export function usePatientPrescriptionRequests() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.prescriptionRequests(userMode),
    queryFn: () => patientService.getPrescriptionRequests(),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useProviders() {
  const countryCode = useUserStore(s => s.user.countryCode)
  return useQuery({
    queryKey: queryKeys.patient.providers(countryCode),
    queryFn: () => providersService.getAll(countryCode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useProvidersByCategory(category: string) {
  const countryCode = useUserStore(s => s.user.countryCode)
  return useQuery({
    queryKey: queryKeys.patient.providersByCategory(category, countryCode),
    queryFn: () => providersService.getByCategory(category, countryCode),
    enabled: !!category,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useProvider(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.patient.provider(id ?? ''),
    queryFn: () => providersService.getById(id!),
    enabled: id !== undefined && id !== '',
  })
}

export function useProviderReviews(providerId: number | string | undefined) {
  const numericId = providerId !== undefined && providerId !== '' ? Number(providerId) : undefined

  return useQuery({
    queryKey: queryKeys.patient.providerReviews(providerId ?? ''),
    queryFn: () => reviewsService.getByProvider(numericId!),
    enabled: numericId !== undefined && !Number.isNaN(numericId),
  })
}

export function usePatientInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patient.invoice(id ?? ''),
    queryFn: () => invoicesService.getPatientInvoice(id!),
    enabled: !!id,
  })
}

export function usePatientInvoiceAttachment(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.patient.invoiceAttachment(id ?? ''),
    queryFn: () => invoicesService.getPatientInvoiceAttachment(id!),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePatientInvoices() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.invoices(userMode),
    queryFn: () => invoicesService.getPatientInvoices(),
  })
}
