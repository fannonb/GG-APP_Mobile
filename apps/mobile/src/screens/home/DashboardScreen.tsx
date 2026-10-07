import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { colors, fontWeights } from '@/theme'
import { SkeletonBalanceCard, SkeletonBlock, SkeletonGroup, SkeletonList } from '@/components/Skeleton'
import { Screen, ScrollArea, AdBanner } from '@/components'
import CreditSummaryCard from '@/components/home/CreditSummaryCard'
import AttentionList, { TONE_RANK, type AttentionItem } from '@/components/home/AttentionList'
import GetStartedCard, { type GetStartedStep } from '@/components/home/GetStartedCard'
import CareSection, { type PrescriptionSummary, type VisitSummary } from '@/components/home/CareSection'
import FindCare from '@/components/home/FindCare'
import HealthNewsSection from '@/components/HealthNewsSection'
import BellIcon from '@/icons/BellIcon'
import CalendarIcon from '@/icons/CalendarIcon'
import CheckIcon from '@/icons/CheckIcon'
import InvoiceIcon from '@/icons/InvoiceIcon'
import LockIcon from '@/icons/LockIcon'
import PharmacyIcon from '@/icons/PharmacyIcon'
import ProfileIcon from '@/icons/ProfileIcon'
import {
  usePatientDashboard,
  usePatientProfile,
  usePatientInvoices,
  usePatientAppointments,
  useCreditStatus,
  usePatientNotifications,
  useLedgerStatus,
  usePatientPrescriptionRequests,
  useMarkPatientNotificationReadMutation,
} from '@gg/shared-hooks'
import { useUserStore, useAuthStore, useNotificationsStore } from '@gg/shared-stores'
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
import {
  derivePatientOnboardingCompletedSteps,
  formatCurrency,
  formatTime12h,
  getAppointmentDisplayStatus,
  getDaysUntilAppointment,
  isCreditRunningLow,
  isActionablePendingInvoice,
} from '@gg/shared-utils'
import { getCountryByCode, getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@gg/shared-config'
import type { Appointment, CreditStatus, PrescriptionRequest } from '@gg/shared-types'

const wordmark = require('../../../assets/gg-wordmark.png')

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function relativeDay(days: number, date: Date): string {
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ACTIVE_RX_STATUSES = new Set(['submitted', 'quoted', 'accepted', 'preparing', 'ready'])

function prescriptionStatusLabel(rx: PrescriptionRequest): string {
  switch (rx.status) {
    case 'submitted':
      return 'Waiting for a quote'
    case 'quoted':
      return 'Quote ready to review'
    case 'ready':
      return rx.fulfillmentMode === 'delivery' ? 'Ready for delivery' : 'Ready for pickup'
    default:
      return 'Being prepared'
  }
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */
/**
 * One home for every patient. Ordered by what the patient needs first:
 * their credit at a glance, anything waiting on them (or, for a new account,
 * the setup checklist), their upcoming care, then ways to find care.
 */
export function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const u = useUserStore(s => s.user)
  const userMode = useAuthStore(s => s.userMode)
  const localCompletedSteps = useAuthStore(s => s.onboardingCompletedSteps)

  /* data hooks */
  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = usePatientProfile()
  const { data: dashData, isLoading, refetch: refetchDash } = usePatientDashboard()
  const { data: invoices = [], refetch: refetchInv } = usePatientInvoices()
  const { data: appointmentsData, refetch: refetchAppointments } = usePatientAppointments()
  const { data: fetchedNotifs, refetch: refetchNotifs } = usePatientNotifications()
  const { data: creditData, refetch: refetchCredit } = useCreditStatus()
  const { data: ledgerStatus, refetch: refetchLedger } = useLedgerStatus()
  const { data: prescriptionRequestsData, refetch: refetchRx } = usePatientPrescriptionRequests()
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

  const [refreshing, setRefreshing] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  /* Dismissed alert ids are persisted per account. Alerts are only ever
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

  /* account state */
  const profileUser = profileData?.user
  const dashboardUser = (dashData as any)?.user
  const currentUser = profileUser ?? dashboardUser ?? u
  const creditStatus: CreditStatus =
    profileUser?.creditStatus ??
    dashboardUser?.creditStatus ??
    (creditData as any)?.creditStatus ??
    u?.creditStatus ??
    'not_applied'
  const hasPaymentPin = profileUser?.hasPaymentPin ?? currentUser?.hasPaymentPin ?? false

  const allAppointments: Appointment[] = [
    ...((appointmentsData as any)?.upcoming ?? []),
    ...((appointmentsData as any)?.past ?? []),
  ]

  /* Setup checklist. Steps 3–5 come from backend truth as well as the local
     checklist, so they never revert after an action succeeds. */
  const completedSteps = useMemo(() => {
    const fromAccount = derivePatientOnboardingCompletedSteps(
      { hasPaymentPin, creditStatus },
      allAppointments.length,
    )
    return new Set([...localCompletedSteps, ...fromAccount])
  }, [localCompletedSteps, hasPaymentPin, creditStatus, allAppointments.length])

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
      refetchAppointments(),
      refetchNotifs(),
      refetchCredit(),
      refetchLedger(),
      refetchRx(),
    ])
    setRefreshing(false)
  }, [refetchProfile, refetchDash, refetchInv, refetchAppointments, refetchNotifs, refetchCredit, refetchLedger, refetchRx])

  if (waitingForLiveUser) {
    return (
      <View style={[s.loadingContainer, { paddingTop: insets.top }]}>
        {/* Navy header band, then the shapes of the credit card and lists. */}
        <View style={s.skeletonHeader} />
        <SkeletonGroup style={s.skeleton}>
          <SkeletonBalanceCard light />
          <SkeletonBlock width="55%" height={18} />
          <SkeletonList rows={2} />
          <SkeletonBlock width="40%" height={18} />
          <SkeletonList rows={1} />
        </SkeletonGroup>
      </View>
    )
  }

  const firstName = currentUser?.name?.split(' ')[0] || 'there'
  const country = getCountryByCode(currentUser?.countryCode ?? 'KE')
  const currency = country?.currencySymbol ?? 'Ksh.'
  const partnerId = currentUser?.financePartnerId ?? getFinancePartnerIdForCountry(currentUser?.countryCode)
  const partnerName = getFinancePartnerSummary(partnerId)?.name ?? 'your finance partner'
  const creditLimit = currentUser?.creditLimit ?? 0
  const creditAvailable = currentUser?.creditAvailable ?? 0
  const isLowBalance =
    creditStatus === 'approved' && isCreditRunningLow(creditAvailable, currentUser?.countryCode ?? 'KE')

  /* Open appointments that haven't happened yet, soonest first. A past date
     never counts as "next", even if the provider hasn't closed it out. */
  const dashAppointments: Appointment[] = (dashData as any)?.appointments ?? []
  const upcoming = (dashAppointments.length > 0 ? dashAppointments : allAppointments)
    .filter(a => {
      const st = getAppointmentDisplayStatus(a)
      return st !== 'completed' && st !== 'cancelled' && getDaysUntilAppointment(a.date) >= 0
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const nextApt = upcoming[0] ?? null
  const rescheduleApt = upcoming.find(
    a => getAppointmentDisplayStatus(a) === 'pending' && (a as any).rescheduledAt,
  )

  const pendingInvoice = (invoices as any[]).find(isActionablePendingInvoice)
  const activeLedgerGrants = ledgerStatus?.activeGrants ?? []

  const prescriptionRequests: PrescriptionRequest[] =
    (prescriptionRequestsData as PrescriptionRequest[] | undefined) ?? []
  const activeRx = prescriptionRequests
    .filter(rx => ACTIVE_RX_STATUSES.has(rx.status))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]

  /* ---------------------------------------------------------------- */
  /*  Needs your attention                                            */
  /* ---------------------------------------------------------------- */
  const dismissedBannerIds = viewedBannerIds ?? new Set<string>()
  const creditApprovalItems = getUnreadCreditApprovalItems(notifications)
  const apptConfirmedNotifItems = getUnreadConfirmedAppointmentItems(notifications)
  const apptCancelledItems = getUnreadProviderCancelledAppointmentItems(notifications)
  const prescriptionQuoteItems = buildPrescriptionQuoteBannerItems(notifications, prescriptionRequests, dismissedBannerIds)
  const prescriptionReadyItems = getUnreadPrescriptionReadyItems(notifications)
  const prescriptionInvoiceItems = getUnreadPrescriptionInvoiceItems(notifications)

  const dismissNotifItems = (items: NotifBannerItem[]) => {
    items.forEach(item => {
      if (item.notification) markNotificationRead.mutate(item.notification.id)
      else dismissBanner(item.id)
    })
  }

  const openNotifItems = (items: NotifBannerItem[]) => {
    dismissNotifItems(items)
    const target = items[0]
    if (!target) return
    if (target.notification) {
      openPatientNotification(navigation, target.notification)
    } else if (isSyntheticPrescriptionBannerId(target.id)) {
      navigation.navigate('ServicesTab', {
        initial: false,
        screen: 'PrescriptionDetail',
        params: { prescriptionId: target.id.replace(/^rx-/, '') },
      })
    }
  }

  const fromNotif = (
    item: NotifBannerItem,
    tone: AttentionItem['tone'],
    Icon: AttentionItem['Icon'],
    actionLabel?: string,
  ): AttentionItem => ({
    key: item.id,
    tone,
    Icon,
    title: item.headline,
    detail: item.detail,
    actionLabel,
    onPress: () => openNotifItems([item]),
    onDismiss: () => dismissNotifItems([item]),
  })

  // Low balance, credit under review and appointment reminders are not listed
  // here: the credit card and "Your care" already show them.
  const attention: AttentionItem[] = []
  apptCancelledItems.forEach(item => attention.push(fromNotif(item, 'alert', CalendarIcon, 'View')))

  const pendingInvoiceId = `pending-invoice-${pendingInvoice?.id ?? 'none'}`
  if (pendingInvoice && !isBannerViewed(pendingInvoiceId)) {
    attention.push({
      key: pendingInvoiceId,
      tone: 'action',
      Icon: InvoiceIcon,
      title: `Approve ${formatCurrency(pendingInvoice.amount, currency)} invoice`,
      detail: `${pendingInvoice.provider?.name ?? pendingInvoice.provider ?? 'Your provider'} is waiting for payment approval.`,
      actionLabel: 'Review',
      onPress: () =>
        navigation.navigate('InvoicesTab', {
          screen: 'InvoiceReview',
          params: { invoiceId: pendingInvoice.id },
          initial: false,
        }),
      onDismiss: () => dismissBanner(pendingInvoiceId),
    })
  }
  if (!pendingInvoice) {
    prescriptionInvoiceItems.forEach(item => attention.push(fromNotif(item, 'action', InvoiceIcon, 'Pay')))
  }

  const rescheduleId = `reschedule-${rescheduleApt?.id ?? 'none'}`
  if (rescheduleApt && !isBannerViewed(rescheduleId)) {
    attention.push({
      key: rescheduleId,
      tone: 'action',
      Icon: CalendarIcon,
      title: 'New appointment time proposed',
      detail: `${(rescheduleApt as any).provider ?? 'Your provider'} suggested a different time. Accept or decline it.`,
      actionLabel: 'Review',
      onPress: () => navigation.navigate('RescheduleReview', { appointmentId: String(rescheduleApt.id) }),
      onDismiss: () => dismissBanner(rescheduleId),
    })
  }
  prescriptionQuoteItems.forEach(item => attention.push(fromNotif(item, 'action', PharmacyIcon, 'Review')))
  prescriptionReadyItems.forEach(item => attention.push(fromNotif(item, 'good', PharmacyIcon)))

  const ledgerId = `ledger-access-${activeLedgerGrants.map(g => g.id).sort().join('|') || 'none'}`
  if (activeLedgerGrants.length > 0 && !isBannerViewed(ledgerId)) {
    attention.push({
      key: ledgerId,
      tone: 'info',
      Icon: LockIcon,
      title:
        activeLedgerGrants.length === 1
          ? `${activeLedgerGrants[0].provider.name} can see your health ledger`
          : `${activeLedgerGrants.length} providers can see your health ledger`,
      detail: 'Access ends 24 hours after unlock. You can revoke it anytime.',
      onPress: () => navigation.navigate('ProfileTab', { initial: false, screen: 'LedgerAccess' }),
      onDismiss: () => dismissBanner(ledgerId),
    })
  }
  creditApprovalItems.forEach(item => attention.push(fromNotif(item, 'good', CheckIcon)))
  apptConfirmedNotifItems.forEach(item => attention.push(fromNotif(item, 'good', CheckIcon)))
  // Array.prototype.sort is stable, so the order above holds within each tone.
  attention.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])

  /* ---------------------------------------------------------------- */
  /*  Get started (new accounts)                                      */
  /* ---------------------------------------------------------------- */
  const steps: GetStartedStep[] = [
    {
      key: 'account',
      title: 'Create account',
      detail: 'Your details are registered.',
      done: true,
      actionLabel: '',
      onPress: () => navigation.navigate('ProfileTab', { screen: 'Profile' }),
    },
    {
      key: 'email',
      title: 'Verify email',
      detail: 'Your email is confirmed.',
      done: true,
      actionLabel: '',
      onPress: () => navigation.navigate('ProfileTab', { screen: 'Profile' }),
    },
    {
      key: 'pin',
      title: 'Set your payment PIN',
      detail: 'A 4-digit PIN you enter to approve every payment. Nobody can be charged without it.',
      done: completedSteps.has(3),
      actionLabel: 'Set PIN',
      onPress: () => navigation.navigate('ProfileTab', { initial: false, screen: 'SecurityPIN' }),
    },
    {
      key: 'credit',
      title: 'Apply for healthcare credit',
      detail: 'Get care now and pay over time. Takes about 5 minutes.',
      done: completedSteps.has(4),
      actionLabel: 'Apply now',
      onPress: () => navigation.navigate('WalletTab', { initial: false, screen: 'CreditDisclaimer' }),
    },
    {
      key: 'visit',
      title: 'Book your first visit',
      detail: 'Find a verified clinic, lab or specialist near you.',
      done: completedSteps.has(5),
      actionLabel: 'Find care',
      onPress: () => navigation.navigate('ServicesTab', { screen: 'FindService' }),
    },
  ]
  const isSettingUp = steps.some(step => !step.done)

  /* ---------------------------------------------------------------- */
  /*  Your care                                                       */
  /* ---------------------------------------------------------------- */
  let visit: VisitSummary | null = null
  if (nextApt) {
    const date = new Date(nextApt.date)
    const days = getDaysUntilAppointment(nextApt.date)
    const isReschedule = Boolean((nextApt as any).rescheduledAt) && getAppointmentDisplayStatus(nextApt) === 'pending'
    visit = {
      dateLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: formatTime12h(nextApt.time),
      provider: (nextApt as any).provider ?? 'Provider',
      service: (nextApt as any).service,
      confirmed: getAppointmentDisplayStatus(nextApt) === 'confirmed',
      relative: relativeDay(days, date),
      onPress: () =>
        isReschedule
          ? navigation.navigate('RescheduleReview', { appointmentId: String(nextApt.id) })
          : navigation.navigate('Appointments'),
    }
  }
  const prescription: PrescriptionSummary | null = activeRx
    ? {
        provider: activeRx.provider,
        statusLabel: prescriptionStatusLabel(activeRx),
        ready: activeRx.status === 'ready',
        onPress: () =>
          navigation.navigate('ServicesTab', {
            initial: false,
            screen: 'PrescriptionDetail',
            params: { prescriptionId: activeRx.id },
          }),
      }
    : null

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <Screen headerPattern="dark-curve" curveDepth={250}>
      {/* Status-bar strip stays navy while the header scrolls away under it. */}
      <View style={{ height: insets.top, backgroundColor: colors.navy }} />

      <ScrollArea gap={24} px={16} py={0} refreshing={refreshing} onRefresh={onRefresh}>
        {/* === Header (scrolls away): brand bar, then the greeting === */}
        <View style={s.header}>
          <View style={s.brandRow}>
            <Image source={wordmark} style={s.wordmark} resizeMode="contain" accessibilityLabel="GG'APP" />
            <Pressable
              style={({ pressed }) => [s.bell, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <BellIcon size={20} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
          <Text style={s.greeting} numberOfLines={1}>
            {isSettingUp && userMode === 'new' ? `Welcome, ${firstName}` : `${getGreeting()}, ${firstName}`}
          </Text>
          <Text style={s.subGreeting}>
            {isSettingUp
              ? "Let's get your account ready for your first visit."
              : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* === Credit === */}
        <CreditSummaryCard
          status={creditStatus}
          available={creditAvailable}
          limit={creditLimit}
          currency={currency}
          isLow={isLowBalance}
          partnerId={partnerId}
          partnerName={partnerName}
          onApply={() => navigation.navigate('WalletTab', { initial: false, screen: 'CreditDisclaimer' })}
          onViewStatus={() => navigation.navigate('WalletTab', { initial: false, screen: 'CreditStatus' })}
          onRequestIncrease={() => navigation.navigate('WalletTab', { initial: false, screen: 'CreditIncrease' })}
          onOpenWallet={() => navigation.navigate('WalletTab', { screen: 'CreditWallet' })}
          onHistory={() => navigation.navigate('WalletTab', { initial: false, screen: 'TransactionHistory' })}
        />

        {/* === New accounts: setup first; everyone: what's waiting === */}
        <GetStartedCard steps={steps} />
        <AttentionList
          items={attention}
          expanded={showAllAlerts}
          onToggleExpanded={() => setShowAllAlerts(v => !v)}
        />

        {/* === Upcoming care === */}
        <CareSection
          visit={visit}
          prescription={prescription}
          onBook={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
          onViewAll={() => navigation.navigate('Appointments')}
        />

        {/* === Find care === */}
        <FindCare
          onSearch={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
          onCategory={category =>
            navigation.navigate('ServicesTab', { initial: false, screen: 'ProviderList', params: { category } })
          }
          onSeeAll={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
        />

        <HealthNewsSection />
        <AdBanner countryName={country?.name} />

        <View style={{ height: 24 }} />
      </ScrollArea>
    </Screen>
  )
}

export default DashboardScreen

const s = StyleSheet.create({
  skeleton: {
    padding: 16,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  skeletonHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  loadingText: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    color: colors.textSub,
  },
  header: {
    paddingTop: 8,
    marginBottom: -4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  wordmark: {
    width: 122,
    height: 26,
  },
  greeting: {
    fontFamily: fontWeights.extraBold,
    fontSize: 26,
    letterSpacing: -0.7,
    color: '#FFFFFF',
  },
  subGreeting: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.navy,
  },
  bellBadgeText: {
    fontFamily: fontWeights.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
})
