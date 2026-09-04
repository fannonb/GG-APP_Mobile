import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, fontWeights, radii, shadows } from '@/theme'
import { Screen, ScrollArea, MCard, MBtn, GGPill, NotifBanner, AdBanner, MoneyText, StatusPill } from '@/components'
import BellIcon from '@/icons/BellIcon'
import PharmacyIcon from '@/icons/PharmacyIcon'
import LaboratoryIcon from '@/icons/LaboratoryIcon'
import DoctorIcon from '@/icons/DoctorIcon'
import RadiologyIcon from '@/icons/RadiologyIcon'
import HospitalIcon from '@/icons/HospitalIcon'
import ClinicIcon from '@/icons/ClinicIcon'
import GlobeIcon from '@/icons/GlobeIcon'
import CalendarIcon from '@/icons/CalendarIcon'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import CheckIcon from '@/icons/CheckIcon'
import {
  usePatientDashboard,
  usePatientProfile,
  usePatientInvoices,
  useCreditStatus,
  usePatientNotifications,
  useLedgerStatus,
  usePatientPrescriptionRequests,
  useMarkPatientNotificationReadMutation,
} from '@gg/shared-hooks'
import { useUserStore, useAuthStore, useNotificationsStore } from '@gg/shared-stores'
import { EmptyDashboardScreen } from './EmptyDashboardScreen'
import HealthNewsSection from '@/components/HealthNewsSection'
import { openPatientNotification } from '@/lib/patient-notification-routing'
import {
  getUnreadCreditApprovalItems,
  getUnreadConfirmedAppointmentItems,
  getUnreadProviderCancelledAppointmentItems,
  getUnreadPrescriptionReadyItems,
  getUnreadPrescriptionInvoiceItems,
  buildPrescriptionQuoteBannerItems,
  isSyntheticPrescriptionBannerId,
} from '@/lib/notification-banners'
import type { NotifBannerItem } from '@/lib/notification-banners'

// Removed logo import
import {
  formatCurrency,
  formatDate,
  formatTime12h,
  getAppointmentDisplayStatus,
  isCreditRunningLow,
  isActionablePendingInvoice,
} from '@gg/shared-utils'
import { getCountryByCode, SERVICE_CATEGORIES } from '@gg/shared-config'
import type { Appointment, PrescriptionRequest, Transaction } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Category icon map                                                  */
/* ------------------------------------------------------------------ */
const CAT_ICONS: Record<string, React.ReactNode> = {
  pharmacy:   <PharmacyIcon size={22} color={colors.blue} />,
  laboratory: <LaboratoryIcon size={22} color={colors.blue} />,
  doctor:     <DoctorIcon size={22} color={colors.blue} />,
  radiology:  <RadiologyIcon size={22} color={colors.blue} />,
  hospital:   <HospitalIcon size={22} color={colors.blue} />,
  clinic:     <ClinicIcon size={22} color={colors.blue} />,
  global_specialists: <GlobeIcon size={22} color={colors.blue} />,
}

/* ------------------------------------------------------------------ */
/*  Greeting helper                                                    */
/* ------------------------------------------------------------------ */
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

const FLAG_EMOJI: Record<string, string> = {
  KE: '\u{1F1F0}\u{1F1EA}',
  ZW: '\u{1F1FF}\u{1F1FC}',
  ZM: '\u{1F1FF}\u{1F1F2}',
}

function recentActivityStatus(status: Transaction['status']): {
  label: string
  tone: 'success' | 'warning' | 'error'
} {
  if (status === 'failed') return { label: 'Failed', tone: 'error' }
  if (status === 'pending') return { label: 'Pending', tone: 'warning' }
  return { label: 'Paid', tone: 'success' }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const u = useUserStore(s => s.user)
  const userMode = useAuthStore(s => s.userMode)

  /* data hooks */
  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = usePatientProfile()
  const { data: dashData, isLoading, refetch: refetchDash } = usePatientDashboard()
  const { data: invoices = [], refetch: refetchInv } = usePatientInvoices()
  const { data: fetchedNotifs, refetch: refetchNotifs } = usePatientNotifications()
  const { data: creditData, refetch: refetchCredit } = useCreditStatus()
  const { data: ledgerStatus, refetch: refetchLedger } = useLedgerStatus()
  const { data: prescriptionRequestsData } = usePatientPrescriptionRequests()
  const markNotificationRead = useMarkPatientNotificationReadMutation()
  const patientNotifs = useNotificationsStore(s => s.patientNotifs)
  const notifications = fetchedNotifs ?? patientNotifs
  const unreadCount = notifications.filter(n => !n.read).length

  /* Keep the shared stores in sync with the freshest server data so every
     screen (profile, security, wallet) reflects completed actions. */
  useEffect(() => {
    if (profileData) {
      useUserStore.setState({
        user: profileData.user,
        beneficiaries: profileData.beneficiaries,
      })
    }
  }, [profileData])

  useEffect(() => {
    if (fetchedNotifs) {
      useNotificationsStore.setState({ patientNotifs: fetchedNotifs })
    }
  }, [fetchedNotifs])

  /* pull-to-refresh */
  const [refreshing, setRefreshing] = useState(false)
  /* Dismissed banner ids are persisted per account. Banners are only ever
     suppressed after an explicit dismiss — never auto-marked on render. */
  const bannerStorageKey = `gg_dashboard_viewed_banners_${(u?.email ?? 'anonymous').replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const [viewedBannerIds, setViewedBannerIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    let active = true
    setViewedBannerIds(null)

    SecureStore.getItemAsync(bannerStorageKey)
      .then(value => {
        if (!active) return
        try {
          const ids = value ? JSON.parse(value) : []
          setViewedBannerIds(new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []))
        } catch {
          setViewedBannerIds(new Set())
        }
      })
      .catch(() => {
        if (active) setViewedBannerIds(new Set())
      })

    return () => {
      active = false
    }
  }, [bannerStorageKey])

  const dismissBanner = useCallback((id: string) => {
    setViewedBannerIds(previous => {
      const next = new Set(previous ?? [])
      next.add(id)
      void SecureStore.setItemAsync(bannerStorageKey, JSON.stringify([...next]))
      return next
    })
  }, [bannerStorageKey])

  const isBannerViewed = (id: string) => viewedBannerIds === null || viewedBannerIds.has(id)

  const profileUser = profileData?.user
  const dashboardUser = (dashData as any)?.user
  const currentUser = profileUser ?? dashboardUser ?? u
  const creditStatus =
    profileUser?.creditStatus ??
    dashboardUser?.creditStatus ??
    (creditData as any)?.creditStatus ??
    u?.creditStatus

  const waitingForLiveUser =
    userMode === 'existing' &&
    !profileUser &&
    !dashboardUser &&
    (isProfileLoading || isLoading)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      refetchProfile(),
      refetchDash(),
      refetchInv(),
      refetchNotifs(),
      refetchCredit(),
      refetchLedger(),
    ])
    setRefreshing(false)
  }, [refetchProfile, refetchDash, refetchInv, refetchNotifs, refetchCredit, refetchLedger])

  if (waitingForLiveUser) {
    return (
      <View style={[s.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  /* Show new user dashboard if userMode is 'new' or live creditStatus is 'not_applied' */
  const isNewUser = userMode === 'new' || creditStatus === 'not_applied'
  if (isNewUser) {
    return <EmptyDashboardScreen />
  }

  const firstName = currentUser?.name?.split(' ')[0] || 'there'
  const country = getCountryByCode(currentUser?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'
  const flag = FLAG_EMOJI[currentUser?.countryCode ?? 'KE'] ?? ''

  /* derived data (resilient to null) */
  const transactions: Transaction[] = (dashData as any)?.transactions ?? []
  const appointments: Appointment[] = ((dashData as any)?.appointments ?? []).filter(
    (a: Appointment) => {
      const s = getAppointmentDisplayStatus(a)
      return s !== 'completed' && s !== 'cancelled'
    },
  )
  const nextApt = appointments[0] ?? null
  const nextAptStatus = nextApt ? getAppointmentDisplayStatus(nextApt) : null
  const nextAptDate = nextApt ? new Date(nextApt.date) : null
  const nextAptDateLabel = nextAptDate
    ? nextAptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  const nextAptTime = nextApt ? formatTime12h(nextApt.time) : ''
  const nextAptProvider = (nextApt as any)?.provider ?? 'Provider'

  const pendingApt = appointments.find(
    a => getAppointmentDisplayStatus(a) === 'pending' && !(a as any).rescheduledAt,
  )
  const pendingAptDate = pendingApt
    ? new Date(pendingApt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const rescheduleApt = appointments.find(
    a => getAppointmentDisplayStatus(a) === 'pending' && (a as any).rescheduledAt,
  )
  const pendingInvoice = (invoices as any[]).find(isActionablePendingInvoice)
  const isLowBalance =
    creditStatus === 'approved' &&
    isCreditRunningLow(currentUser?.creditAvailable ?? 0, currentUser?.countryCode ?? 'KE')
  const isCreditUnderReview = creditStatus === 'pending'

  const confirmedToday = appointments.find(a => {
    if (getAppointmentDisplayStatus(a) !== 'confirmed') return false
    const d = new Date(a.date)
    const today2 = new Date()
    return d.getFullYear() === today2.getFullYear() && d.getMonth() === today2.getMonth() && d.getDate() === today2.getDate()
  })
  const confirmedTomorrow = !confirmedToday ? appointments.find(a => {
    if (getAppointmentDisplayStatus(a) !== 'confirmed') return false
    const d = new Date(a.date)
    const tmr = new Date()
    tmr.setDate(tmr.getDate() + 1)
    return d.getFullYear() === tmr.getFullYear() && d.getMonth() === tmr.getMonth() && d.getDate() === tmr.getDate()
  }) : null

  const creditLimit = currentUser?.creditLimit ?? 0
  const creditAvailable = currentUser?.creditAvailable ?? 0
  const creditReviewBannerId = `credit-review-${creditStatus}`
  const rescheduleBannerId = `reschedule-${rescheduleApt?.id ?? 'none'}`
  const pendingInvoiceBannerId = `pending-invoice-${pendingInvoice?.id ?? 'none'}`
  const appointmentReminder = confirmedToday ?? confirmedTomorrow
  const appointmentReminderBannerId = `appt-reminder-${appointmentReminder?.id ?? 'none'}`
  const lowBalanceBannerId = `low-balance-${creditLimit}-${creditAvailable}`
  const activeLedgerGrants = ledgerStatus?.activeGrants ?? []
  const ledgerAccessFingerprint = activeLedgerGrants.map(g => g.id).sort().join('|')
  const ledgerAccessBannerId = `ledger-access-${ledgerAccessFingerprint || 'none'}`

  /* Notification-driven banners (web parity): visible while the source
     notification is unread; CTA/dismiss marks the notification read. */
  const prescriptionRequests: PrescriptionRequest[] =
    (prescriptionRequestsData as PrescriptionRequest[] | undefined) ?? []
  const dismissedBannerIds = viewedBannerIds ?? new Set<string>()
  const creditApprovalItems = getUnreadCreditApprovalItems(notifications)
  const apptConfirmedNotifItems = getUnreadConfirmedAppointmentItems(notifications)
  const apptCancelledItems = getUnreadProviderCancelledAppointmentItems(notifications)
  const prescriptionQuoteItems = buildPrescriptionQuoteBannerItems(
    notifications,
    prescriptionRequests,
    dismissedBannerIds,
  )
  const prescriptionReadyItems = getUnreadPrescriptionReadyItems(notifications)
  const prescriptionInvoiceItems = getUnreadPrescriptionInvoiceItems(notifications)
  const hasUnresolvedAction = Boolean(
    pendingInvoice ||
      rescheduleApt ||
      pendingApt ||
      prescriptionQuoteItems.length ||
      prescriptionInvoiceItems.length ||
      prescriptionReadyItems.length ||
      isCreditUnderReview,
  )
  const recentActivity = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  const dismissNotifBannerItems = (items: NotifBannerItem[]) => {
    items.forEach(item => {
      if (item.notification) markNotificationRead.mutate(item.notification.id)
      else dismissBanner(item.id)
    })
  }

  const openNotifBannerItems = (items: NotifBannerItem[]) => {
    items.forEach(item => {
      if (item.notification) markNotificationRead.mutate(item.notification.id)
      else dismissBanner(item.id)
    })
    const target = items[0]
    if (!target) return
    if (target.notification) {
      openPatientNotification(navigation, target.notification)
    } else if (isSyntheticPrescriptionBannerId(target.id)) {
      navigation.navigate('ServicesTab', {
        screen: 'PrescriptionDetail',
        params: { prescriptionId: target.id.replace(/^rx-/, '') },
      })
    }
  }
  // Match web/profile: spend figures come from settled transactions, not
  // outstanding creditUsed or pending_auth invoices (those inflated this card).
  const now = new Date()
  const spendableThisMonth = transactions.filter(t => {
    if (t.status !== 'completed' && t.status !== 'authorized') return false
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const spentThisMonth = spendableThisMonth.reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const spentThisMonthCount = spendableThisMonth.length

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  /* loading state */
  if (isLoading && !dashData) {
    return (
      <Screen headerPattern="dark-curve">
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.loadingText}>Loading dashboard...</Text>
        </View>
      </Screen>
    )
  }

  /* ---------------------------------------------------------------- */
  return (
    <Screen headerPattern="dark-curve">
      {/* === 1. Header === */}
      <View style={[s.header, { paddingTop: insets.top + 20 }]}>
        <View style={s.headerRow}>
          {/* left */}
          <View style={s.headerLeft}>
            <Text style={s.greetLabel}>{getGreeting()}</Text>
            <Text style={s.greetName}>
              {firstName} {flag}
            </Text>
            <Text style={s.greetDate}>{today}</Text>
          </View>

          {/* right */}
          <View style={s.headerRight}>
            <Pressable
              style={({ pressed }) => [s.bellWrap, pressed && s.bellWrapPressed]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <BellIcon size={20} color={colors.navy} />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Scrollable body */}
      <ScrollArea
        gap={14}
        px={16}
        py={14}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {/* === 2. Notification Banners === */}
        {/* Notification-driven banners mirror the PWA: they stay visible while
            the underlying notification is unread, and the CTA/dismiss marks
            it read (which also clears the banner). */}
        {creditApprovalItems.map(item => (
          <NotifBanner
            key={item.id}
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="brand"
            title={item.headline}
            body={item.detail}
            cta="View Wallet"
            onCta={() => openNotifBannerItems([item])}
            onDismiss={() => dismissNotifBannerItems([item])}
          />
        ))}

        {apptConfirmedNotifItems.map(item => (
          <NotifBanner
            key={item.id}
            icon={<CalendarIcon size={18} color="#FFFFFF" />}
            tone="success"
            title={item.headline}
            body={item.detail}
            cta="View"
            onCta={() => openNotifBannerItems([item])}
            onDismiss={() => dismissNotifBannerItems([item])}
          />
        ))}

        {isCreditUnderReview && !isBannerViewed(creditReviewBannerId) && (
          <NotifBanner
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="info"
            title="Credit Application Under Review"
            body="Your credit application is being reviewed. You'll be notified once a decision is made."
            cta="View Status"
            onCta={() => navigation.navigate('WalletTab', { screen: 'CreditStatus' })}
            onDismiss={() => dismissBanner(creditReviewBannerId)}
          />
        )}

        {rescheduleApt && !isBannerViewed(rescheduleBannerId) && (
          <NotifBanner
            icon={<CalendarIcon size={18} color="#FFFFFF" />}
            tone="purple"
            title="Reschedule Proposed"
            body={`${(rescheduleApt as any).provider ?? 'Provider'} has proposed a new time for your appointment.`}
            cta="Review"
            onCta={() => navigation.navigate('RescheduleReview', { appointmentId: String(rescheduleApt.id) })}
            onDismiss={() => dismissBanner(rescheduleBannerId)}
          />
        )}

        {pendingInvoice && !isBannerViewed(pendingInvoiceBannerId) && (
          <NotifBanner
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="warning"
            title="Invoice Awaiting Authorization"
            body={`${pendingInvoice.provider?.name ?? pendingInvoice.provider ?? 'Provider'} - ${formatCurrency(pendingInvoice.amount, currency)}`}
            cta="Authorize Now"
            onCta={() => navigation.navigate('InvoicesTab', { screen: 'InvoiceReview', params: { invoiceId: pendingInvoice.id }, initial: false })}
            onDismiss={() => dismissBanner(pendingInvoiceBannerId)}
          />
        )}

        {appointmentReminder && !isBannerViewed(appointmentReminderBannerId) && (
          <NotifBanner
            icon={<CalendarIcon size={18} color="#FFFFFF" />}
            tone="info"
            title={confirmedToday ? 'Appointment Today' : 'Appointment Tomorrow'}
            body={`${(appointmentReminder as any).provider ?? 'Provider'} at ${formatTime12h(appointmentReminder.time)}`}
            cta="View"
            onCta={() => navigation.navigate('Appointments')}
            onDismiss={() => dismissBanner(appointmentReminderBannerId)}
          />
        )}

        {isLowBalance && !isBannerViewed(lowBalanceBannerId) && (
          <NotifBanner
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="navy"
            title="Low Credit Balance"
            body={`Your available balance is ${formatCurrency(currentUser?.creditAvailable ?? 0, currency)}. Request an increase to continue accessing healthcare services.`}
            cta="Request Increase"
            onCta={() => navigation.navigate('WalletTab', { screen: 'CreditIncrease' })}
            onDismiss={() => dismissBanner(lowBalanceBannerId)}
          />
        )}

        {activeLedgerGrants.length > 0 && !isBannerViewed(ledgerAccessBannerId) && (
          <NotifBanner
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="brand"
            title={
              activeLedgerGrants.length === 1
                ? `${activeLedgerGrants[0].provider.name} can view your health ledger`
                : `${activeLedgerGrants.length} providers can view your health ledger`
            }
            body={
              activeLedgerGrants.length === 1
                ? `Access expires soon. You can revoke it anytime from the access log.`
                : `${activeLedgerGrants
                    .slice(0, 2)
                    .map(g => g.provider.name)
                    .join(', ')}${
                    activeLedgerGrants.length > 2 ? ` +${activeLedgerGrants.length - 2} more` : ''
                  }. Access lasts 24 hours per unlock.`
            }
            cta="Manage access"
            onCta={() => navigation.navigate('ProfileTab', { screen: 'LedgerAccess' })}
            onDismiss={() => dismissBanner(ledgerAccessBannerId)}
          />
        )}

        {apptCancelledItems.map(item => (
          <NotifBanner
            key={item.id}
            icon={<CalendarIcon size={18} color="#FFFFFF" />}
            tone="error"
            title={item.headline}
            body={item.detail}
            cta="View Appointments"
            onCta={() => openNotifBannerItems([item])}
            onDismiss={() => dismissNotifBannerItems([item])}
          />
        ))}

        {prescriptionQuoteItems.map(item => (
          <NotifBanner
            key={item.id}
            icon={<PharmacyIcon size={18} color="#FFFFFF" />}
            tone="purple"
            title={item.headline}
            body={item.detail}
            cta="Review Quote"
            onCta={() => openNotifBannerItems([item])}
            onDismiss={() => dismissNotifBannerItems([item])}
          />
        ))}

        {!pendingInvoice && prescriptionInvoiceItems.map(item => (
          <NotifBanner
            key={item.id}
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="warning"
            title={item.headline}
            body={item.detail}
            cta="Pay Invoice"
            onCta={() => openNotifBannerItems([item])}
            onDismiss={() => dismissNotifBannerItems([item])}
          />
        ))}

        {prescriptionReadyItems.map(item => (
          <NotifBanner
            key={item.id}
            icon={<PharmacyIcon size={18} color="#FFFFFF" />}
            tone="success"
            title={item.headline}
            body={item.detail}
            cta="View"
            onCta={() => openNotifBannerItems([item])}
            onDismiss={() => dismissNotifBannerItems([item])}
          />
        ))}

        {/* === 3. Digital Credit Card Hero === */}
        <Pressable
          style={({ pressed }) => [
            s.creditCardHero,
            pressed && s.creditCardHeroPressed,
          ]}
          onPress={() => navigation.navigate('WalletTab', { screen: 'CreditWallet' })}
        >
          <LinearGradient
            colors={['#091C44', '#132854']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.creditCardGradient}
          >
            <View style={s.ccGlow} />
            <View style={s.ccTopRow}>
              <Text style={s.ccBrand}>GG'APP Credit</Text>
              <Text style={s.ccFlag}>{flag}</Text>
            </View>

            <View style={s.ccBalanceSection}>
              <Text style={s.ccBalanceLabel}>AVAILABLE BALANCE ({country?.currencyCode ?? 'KES'})</Text>
              <MoneyText
                amount={currentUser?.creditAvailable ?? 0}
                currency={currency}
                size="hero"
                color="#FFFFFF"
              />
              <Text style={s.ccLimit}>
                of {formatCurrency(currentUser?.creditLimit ?? 0, currency)} limit
              </Text>
            </View>

            <View style={s.ccBottomRow}>
              <View style={s.ccSpent}>
                <Text style={s.ccSpentLabel}>Spent this month</Text>
                <Text style={s.ccSpentAmount}>
                  {formatCurrency(spentThisMonth, currency)} ({spentThisMonthCount})
                </Text>
              </View>
              <View style={s.ccHistoryBtn}>
                <Text style={s.ccHistoryText}>History →</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* === 6. Pending Confirmation Banner === */}
        {pendingApt && pendingAptDate && (
          <View style={s.pendingBanner}>
            <View style={s.pendingIconWrap}>
              <Text style={s.pendingIconText}>!</Text>
            </View>
            <View style={s.pendingInfo}>
              <Text style={s.pendingTitle}>
                Appointment Pending Confirmation
              </Text>
              <Text style={s.pendingDetail} numberOfLines={2} ellipsizeMode="tail">
                {(pendingApt as any)?.provider ?? 'Provider'} -{' '}
                {pendingAptDate} at {formatTime12h(pendingApt.time)}
                {(pendingApt as any)?.service ? ` for ${(pendingApt as any).service}` : ''}
              </Text>
            </View>
            <MBtn
              variant="primary"
              sm
              style={{ alignSelf: 'center', flexShrink: 0 }}
              onPress={() => navigation.navigate('Appointments')}
            >
              View Appointments
            </MBtn>
          </View>
        )}

        {/* === 6. Find a Service === */}
        <View style={s.servicesSection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Find a Service</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('ServicesTab', { screen: 'FindService' })
              }
            >
              <Text style={s.seeAll}>See all →</Text>
            </Pressable>
          </View>

          <View style={s.catGrid}>
            {SERVICE_CATEGORIES.filter(c => !c.isComingSoon).map(cat => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  s.catItem,
                  pressed && s.catItemPressed,
                ]}
                onPress={() => {
                  navigation.navigate('ServicesTab', {
                    screen: 'ProviderList',
                    params: { category: cat.id },
                  })
                }}
              >
                <View style={s.catIconWrap}>
                  {CAT_ICONS[cat.id] ?? <PharmacyIcon size={22} color={colors.blue} />}
                </View>
                <Text style={s.catLabel} numberOfLines={1}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

            {/* Global Specialists row */}
            <Pressable
              style={({ pressed }) => [
                s.globalRow,
                pressed && s.globalRowPressed,
              ]}
            >
              <View style={s.globalLeft}>
                <View style={s.globalIconWrap}>
                  <GlobeIcon size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={s.catLabelGlobal}>Global Specialists</Text>
                  <Text style={s.globalDesc}>International tertiary care</Text>
                </View>
              </View>
              <View style={s.comingSoonPill}>
                <Text style={s.comingSoonText}>Coming Soon</Text>
              </View>
            </Pressable>
        </View>

        {/* === 7. Appointments === */}
        <View style={s.appointmentsSection}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderLeft}>
              <CalendarIcon size={18} color={colors.navy} />
              <Text style={s.sectionTitle}>Appointments</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Appointments')}>
              <Text style={s.seeAll}>View all →</Text>
            </Pressable>
          </View>

          {nextApt ? (
            <Pressable
              style={({ pressed }) => [
                s.aptCard,
                pressed && s.aptCardPressed,
              ]}
              onPress={() =>
                getAppointmentDisplayStatus(nextApt) === 'pending' && (nextApt as any).rescheduledAt
                  ? navigation.navigate('RescheduleReview', { appointmentId: String(nextApt.id) })
                  : navigation.navigate('Appointments')
              }
            >
              {/* date badge */}
              <View style={s.aptBadge}>
                <Text style={s.aptBadgeDay}>
                  {nextAptDate ? nextAptDate.getDate() : '--'}
                </Text>
                <Text style={s.aptBadgeMonth}>
                  {nextAptDate
                    ? nextAptDate
                        .toLocaleDateString('en-US', { month: 'short' })
                        .toUpperCase()
                    : ''}
                </Text>
              </View>
              <View style={s.aptCardInfo}>
                <Text style={s.aptCardProvider} numberOfLines={1}>
                  {nextAptProvider}
                </Text>
                <Text style={s.aptCardTime}>
                  {nextAptDateLabel} at {nextAptTime}
                </Text>
                <GGPill type={nextAptStatus === 'confirmed' ? 'success' : 'warning'}>
                  {nextAptStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                </GGPill>
              </View>
              <ChevronRightIcon size={18} color={colors.textLight} />
            </Pressable>
          ) : (
            <View style={s.emptyAptCard}>
              <Text style={s.emptyText}>No upcoming appointments</Text>
            </View>
          )}
        </View>

        {recentActivity.length > 0 && (
          <View style={s.appointmentsSection}>
            <View style={s.sectionHeader}>
              <View style={s.sectionHeaderLeft}>
                <Text style={s.sectionTitle}>Recent activity</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('WalletTab', { screen: 'TransactionHistory' })}>
                <Text style={s.seeAll}>View all →</Text>
              </Pressable>
            </View>
            <MCard padding={0}>
              {recentActivity.map((tx, i) => {
                const status = recentActivityStatus(tx.status)
                return (
                <Pressable
                  key={tx.id}
                  style={[s.txRow, i < recentActivity.length - 1 && s.txRowBorder]}
                  onPress={() =>
                    tx.invoiceId
                      ? navigation.navigate('InvoicesTab', {
                          screen: 'InvoiceReview',
                          params: { invoiceId: tx.invoiceId },
                          initial: false,
                        })
                      : navigation.navigate('WalletTab', { screen: 'TransactionHistory' })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.txProvider} numberOfLines={1}>{tx.provider}</Text>
                    <Text style={s.txMeta}>{tx.service} · {formatDate(tx.date)}</Text>
                  </View>
                  <StatusPill
                    label={status.label}
                    tone={status.tone}
                    size="sm"
                  />
                </Pressable>
                )
              })}
            </MCard>
          </View>
        )}

        {!hasUnresolvedAction && <HealthNewsSection />}

        {!hasUnresolvedAction && <AdBanner countryName={country?.name} />}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollArea>
    </Screen>
  )
}

export default DashboardScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* loading */
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* ---- 1. header ---- */
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  headerLeft: { flex: 1, gap: 2 },
  greetLabel: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  greetName: {
    fontSize: 26,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  greetDate: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(9, 28, 68, 0.05)',
    ...shadows.card,
  },
  bellWrapPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.82,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },

  /* ---- 3. Digital Credit Card Hero ---- */
  creditCardHero: {
    marginHorizontal: 8,
    marginBottom: 24,
    ...shadows.raised,
  },
  creditCardHeroPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  creditCardGradient: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ccGlow: {
    position: 'absolute',
    top: '-40%',
    right: '-10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(56, 182, 255, 0.06)',
  },
  ccTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ccBrand: {
    fontSize: 14,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 1,
  },
  ccFlag: {
    fontSize: 18,
  },
  ccBalanceSection: {
    paddingVertical: 32,
  },
  ccBalanceLabel: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  ccLimit: {
    fontSize: 12,
    fontFamily: fontWeights.medium,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  ccBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  ccSpent: {
    flex: 1,
  },
  ccSpentLabel: {
    fontSize: 11,
    fontFamily: fontWeights.medium,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  ccSpentAmount: {
    fontSize: 15,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },
  ccHistoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
  },
  ccHistoryText: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },

  /* ---- 5. pending banner ---- */
  /* Matches the PWA's pending-confirmation banner: warm cream card, amber
     edge, brown ink (#8A4D00) and a navy icon/CTA. The gradient used on web
     (#FAF6F5 → #FFFAE8) is flattened to its midpoint here. */
  pendingBanner: {
    backgroundColor: '#FDF9EF',
    borderRadius: radii.large,
    borderWidth: 1.5,
    borderColor: 'rgba(245,166,35,0.35)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pendingIconText: {
    fontSize: 18,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },
  pendingInfo: { flex: 1, minWidth: 0, gap: 3 },
  pendingTitle: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: '#8A4D00',
    lineHeight: 17,
  },
  pendingDetail: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: '#8A4D00',
    lineHeight: 17,
  },

  /* ---- 6. find a service ---- */
  servicesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(9, 28, 68, 0.05)',
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.blueInk,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  catItem: {
    width: '28%',
    alignItems: 'center',
    gap: 8,
  },
  catItemPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.88,
  },
  catIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(9, 28, 68, 0.04)',
    ...shadows.card,
  },
  catLabel: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
    textAlign: 'center',
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  globalRowPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  globalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  globalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabelGlobal: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },
  globalDesc: {
    fontSize: 11,
    fontFamily: fontWeights.medium,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  comingSoonPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txProvider: {
    fontSize: 14,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
  },
  txMeta: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 2,
  },

  /* ---- 7. appointments ---- */
  appointmentsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(9, 28, 68, 0.05)',
    ...shadows.card,
  },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  aptCardPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: '#F8FAFC',
    borderColor: colors.blue100,
  },
  aptBadge: {
    width: 56,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(9, 28, 68, 0.05)',
    ...shadows.card,
  },
  aptBadgeDay: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
    lineHeight: 24,
  },
  aptBadgeMonth: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.textLight,
  },
  aptCardInfo: { flex: 1, gap: 4 },
  aptCardProvider: {
    fontSize: 15,
    fontFamily: fontWeights.extraBold,
    color: colors.navy,
  },
  aptCardTime: {
    fontSize: 13,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },
  emptyAptCard: {
    backgroundColor: colors.bg,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontWeights.medium,
    color: colors.textSub,
  },

  /* ---- 8. news ---- */
  liveFeed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.success,
  },
  newsCard: {
    width: 268,
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newsCardFeatured: {
    backgroundColor: colors.navy,
    borderColor: 'transparent',
  },
  newsCardTitle: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  newsCardTitleWhite: {
    color: '#FFFFFF',
  },
  newsCardBody: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
    marginBottom: 14,
  },
  newsCardBodyFaded: {
    color: 'rgba(255,255,255,0.5)',
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  newsFooterFeatured: {
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  newsSourceLabel: {
    fontSize: 8,
    fontFamily: fontWeights.bold,
    color: colors.textLight,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  newsSourceLabelWhite: {
    color: 'rgba(255,255,255,0.3)',
  },
  newsSource: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
  },
  newsSourceWhite: {
    color: 'rgba(255,255,255,0.6)',
  },
  newsDateBadge: {
    backgroundColor: colors.blue3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newsDateBadgeFeatured: {
    backgroundColor: 'rgba(56,182,255,0.2)',
  },
  newsDateText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  newsDateTextFeatured: {
    color: colors.blue400,
  },

  /* news modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,21,40,0.6)', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, maxHeight: '85%', overflow: 'hidden' },
  modalHeader: { backgroundColor: colors.navy, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  modalTitle: { flex: 1, fontSize: 18, fontFamily: fontWeights.extraBold, color: '#FFFFFF', lineHeight: 24, letterSpacing: -0.3 },
  modalClose: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: '#FFFFFF' },
  modalSourceBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalSourceLabel: { fontSize: 11, fontFamily: fontWeights.regular, color: colors.textSub, marginBottom: 2 },
  modalSourceName: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.text },
  modalSourceDate: { fontSize: 11, fontFamily: fontWeights.regular, color: colors.textSub, marginTop: 1 },
  modalVisitBtn: { backgroundColor: colors.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  modalVisitText: { fontSize: 12, fontFamily: fontWeights.semiBold, color: '#FFFFFF' },
  modalBody: { paddingHorizontal: 24, paddingTop: 20 },
  modalParagraph: { fontSize: 14, fontFamily: fontWeights.regular, color: colors.text, lineHeight: 24, marginBottom: 16 },
  modalFooter: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border },
})


