import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { SkeletonBalanceCard, SkeletonBlock, SkeletonGroup, SkeletonList } from '@/components/Skeleton'
import { Screen, ScrollArea, AdBanner } from '@/components'
import type { HeaderGreeting } from '@/components/AppHeader'
import CreditSummaryCard from '@/components/home/CreditSummaryCard'
import AttentionList, { TONE_RANK, type AttentionItem } from '@/components/home/AttentionList'
import GetStartedCard, { type GetStartedStep } from '@/components/home/GetStartedCard'
import CareSection, { type PrescriptionSummary, type VisitSummary } from '@/components/home/CareSection'
import FindCare from '@/components/home/FindCare'
import HealthNewsSection from '@/components/HealthNewsSection'
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
import { useAdSessionStore } from '@/lib/ad-session'
import { useAttentionDismissals } from '@/lib/useAttentionDismissals'
import {
  creditReviewNotice,
  findPendingVisit,
  lowBalanceNotice,
  pendingAppointmentNotice,
  pendingInvoiceNotice,
  rescheduleNotice,
} from '@/lib/home-attention'
import CreditIcon from '@/icons/CreditIcon'
import WalletIcon from '@/icons/WalletIcon'
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


/** Navy depth before the credit card has been measured: about its middle on a typical phone. The measured value replaces it on first layout. */
const DEFAULT_CURVE_DEPTH = 200

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

  /* Keep the shared stores in sync with the freshest server data so every
     screen (profile, security, allocation) reflects completed actions. */
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
  /* The navy header ends at the middle of the credit card, so its top half sits on navy
     and its bottom half over the page. Measured, so it holds whatever the card's height
     (balance, pending, apply) or the user's font size. */
  const [curveDepth, setCurveDepth] = useState(DEFAULT_CURVE_DEPTH)
  const onCreditLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout
    const next = Math.round(y + height / 2)
    setCurveDepth(prev => (prev === next ? prev : next))
  }, [])
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  /* The ad carousel stays hidden for the rest of the app session once closed. */
  const adsClosed = useAdSessionStore(s => s.adsClosed)
  const closeAds = useAdSessionStore(s => s.closeAds)

  /* Dismissals are per account and reappear when a notice's text changes.
     Alerts are only ever suppressed after an explicit dismiss, never on render. */
  const attentionDismissals = useAttentionDismissals()

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
      <Screen header="tabRoot">
        {/* The shapes of the credit card and lists, under the app bar. */}
        <SkeletonGroup style={s.skeleton}>
          <SkeletonBalanceCard light />
          <SkeletonBlock width="55%" height={18} />
          <SkeletonList rows={2} />
          <SkeletonBlock width="40%" height={18} />
          <SkeletonList rows={1} />
        </SkeletonGroup>
      </Screen>
    )
  }

  const firstName = currentUser?.name?.split(' ')[0] || ''
  const country = getCountryByCode(currentUser?.countryCode ?? '')
  const currency = country?.currencySymbol ?? ''
  const partnerId = currentUser?.financePartnerId ?? getFinancePartnerIdForCountry(currentUser?.countryCode)
  const partnerName = getFinancePartnerSummary(partnerId)?.name ?? 'your finance partner'
  const creditLimit = currentUser?.creditLimit ?? 0
  const creditAvailable = currentUser?.creditAvailable ?? 0
  const isLowBalance =
    creditStatus === 'approved' && isCreditRunningLow(creditAvailable, currentUser?.countryCode ?? '')

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

  const pendingInvoices = (invoices as any[]).filter(isActionablePendingInvoice)
  const pendingInvoice = pendingInvoices[0]
  const activeLedgerGrants = ledgerStatus?.activeGrants ?? []

  const prescriptionRequests: PrescriptionRequest[] =
    (prescriptionRequestsData as PrescriptionRequest[] | undefined) ?? []
  const activeRx = prescriptionRequests
    .filter(rx => ACTIVE_RX_STATUSES.has(rx.status))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]

  /* ---------------------------------------------------------------- */
  /*  Needs your attention                                            */
  /* ---------------------------------------------------------------- */
  const creditApprovalItems = getUnreadCreditApprovalItems(notifications)
  const apptConfirmedNotifItems = getUnreadConfirmedAppointmentItems(notifications)
  const apptCancelledItems = getUnreadProviderCancelledAppointmentItems(notifications)
  const prescriptionQuoteItems = buildPrescriptionQuoteBannerItems(notifications, prescriptionRequests)
  const prescriptionReadyItems = getUnreadPrescriptionReadyItems(notifications)
  const prescriptionInvoiceItems = getUnreadPrescriptionInvoiceItems(notifications)

  // Notification-backed items are marked read; synthetic ones are dismissed by id and text.
  const dismissNotifItems = (items: NotifBannerItem[]) => {
    items.forEach(item => {
      if (item.notification) markNotificationRead.mutate(item.notification.id)
      else attentionDismissals.dismiss({ id: item.id, title: item.headline, detail: item.detail })
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
    blocksAd = false,
  ): AttentionItem => ({
    id: item.id,
    tone,
    Icon,
    title: item.headline,
    detail: item.detail,
    actionLabel,
    onPress: () => openNotifItems([item]),
    onDismiss: () => dismissNotifItems([item]),
    blocksAd,
  })

  // The same list as the PWA's patient home. The credit card and "Your care" show
  // some of the same state; these notices repeat it so it can be dismissed.
  const attention: AttentionItem[] = []
  apptCancelledItems.forEach(item => attention.push(fromNotif(item, 'alert', CalendarIcon, 'View')))

  if (pendingInvoice) {
    attention.push({
      ...pendingInvoiceNotice({
        invoiceId: String(pendingInvoice.id),
        count: pendingInvoices.length,
        providerName: pendingInvoice.provider?.name ?? pendingInvoice.provider ?? 'Your provider',
        amount: pendingInvoice.amount,
        format: amount => formatCurrency(amount, currency),
      }),
      tone: 'action',
      Icon: InvoiceIcon,
      onPress: () =>
        pendingInvoices.length > 1
          ? navigation.navigate('InvoicesTab', { screen: 'InvoiceList' })
          : navigation.navigate('InvoicesTab', {
              screen: 'InvoiceReview',
              params: { invoiceId: pendingInvoice.id },
              initial: false,
            }),
      blocksAd: true,
    })
  }
  if (!pendingInvoice) {
    prescriptionInvoiceItems.forEach(item => attention.push(fromNotif(item, 'action', InvoiceIcon, 'Pay', true)))
  }

  if (rescheduleApt) {
    attention.push({
      ...rescheduleNotice(rescheduleApt, formatTime12h),
      tone: 'action',
      Icon: CalendarIcon,
      onPress: () => navigation.navigate('RescheduleReview', { appointmentId: String(rescheduleApt.id) }),
      blocksAd: true,
    })
  }

  // Web's patient home: the same ids, conditions and copy.
  const creditPartnerName =
    getFinancePartnerSummary(getFinancePartnerIdForCountry(currentUser?.countryCode))?.name ?? 'your finance partner'
  const pendingVisit = findPendingVisit(dashAppointments, appointment => getAppointmentDisplayStatus(appointment))
  const pendingVisitNotice = pendingVisit ? pendingAppointmentNotice(pendingVisit, formatTime12h) : null
  if (pendingVisitNotice) {
    attention.push({
      id: pendingVisitNotice.id,
      tone: 'info',
      Icon: CalendarIcon,
      title: pendingVisitNotice.title,
      detail: pendingVisitNotice.detail,
      actionLabel: pendingVisitNotice.actionLabel,
      onPress: () => navigation.navigate('Appointments'),
      blocksAd: true,
    })
  }
  const creditReview = creditReviewNotice({
    creditStatus,
    applicationType: (creditData as any)?.application?.type,
    partnerName: creditPartnerName,
  })
  if (creditReview) {
    attention.push({
      id: creditReview.id,
      tone: 'info',
      Icon: CreditIcon,
      title: creditReview.title,
      detail: creditReview.detail,
      actionLabel: creditReview.actionLabel,
      onPress: () =>
        navigation.navigate('WalletTab', {
          initial: false,
          screen: 'CreditStatus',
          ...(creditReview.increase ? { params: { requestType: 'increase' } } : {}),
        }),
      blocksAd: true,
    })
  }
  const lowBalance = lowBalanceNotice({
    creditStatus,
    available: creditAvailable,
    countryCode: currentUser?.countryCode ?? '',
    format: amount => formatCurrency(amount, currency),
  })
  if (lowBalance) {
    attention.push({
      id: lowBalance.id,
      tone: 'info',
      Icon: WalletIcon,
      title: lowBalance.title,
      detail: lowBalance.detail,
      actionLabel: lowBalance.actionLabel,
      onPress: () => navigation.navigate('WalletTab', { initial: false, screen: 'CreditIncrease' }),
    })
  }

  prescriptionQuoteItems.forEach(item => attention.push(fromNotif(item, 'action', PharmacyIcon, 'Review', true)))
  prescriptionReadyItems.forEach(item => attention.push(fromNotif(item, 'good', PharmacyIcon, undefined, true)))

  const ledgerId = `ledger-access-${activeLedgerGrants.map(g => g.id).sort().join('|') || 'none'}`
  if (activeLedgerGrants.length > 0) {
    attention.push({
      id: ledgerId,
      tone: 'info',
      Icon: LockIcon,
      title:
        activeLedgerGrants.length === 1
          ? `${activeLedgerGrants[0].provider.name} can see your health ledger`
          : `${activeLedgerGrants.length} providers can see your health ledger`,
      detail: 'Access ends 24 hours after unlock. You can revoke it anytime.',
      onPress: () => navigation.navigate('ProfileTab', { initial: false, screen: 'LedgerAccess' }),
    })
  }
  creditApprovalItems.forEach(item => attention.push(fromNotif(item, 'good', CheckIcon)))
  apptConfirmedNotifItems.forEach(item => attention.push(fromNotif(item, 'good', CheckIcon)))
  // Array.prototype.sort is stable, so the order above holds within each tone.
  attention.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
  const visibleAttention = attentionDismissals.filterVisible(attention)

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
      title: 'Apply for a healthcare allocation',
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
  // A request has no pharmacy until one is chosen, and expired requests are not in ACTIVE_RX_STATUSES.
  const prescription: PrescriptionSummary | null = activeRx
    ? {
        provider: activeRx.provider ?? 'Nearby pharmacies',
        statusLabel:
          !activeRx.provider && activeRx.status === 'submitted'
            ? 'Waiting for quotes'
            : prescriptionStatusLabel(activeRx),
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
  /* The greeting sits in the navy app bar: "Good evening, Fannon" and the short date.
     A new account's setup sub-line is left out there, so it just sees the date. */
  const today = new Date()
  const salutation = isSettingUp && userMode === 'new' ? 'Welcome' : getGreeting()
  const greetingLine = firstName ? `${salutation}, ${firstName}` : salutation
  const headerGreeting: HeaderGreeting = {
    line1: greetingLine,
    line2: today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    accessibilityLabel: `${greetingLine}. ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
  }

  return (
    <Screen header="tabRoot" curveDepth={curveDepth} headerGreeting={headerGreeting}>
      <ScrollArea gap={24} px={16} py={0} refreshing={refreshing} onRefresh={onRefresh}>
        {/* === Credit: the first item under the app bar. The navy header ends mid-card, so the card straddles its bottom edge. === */}
        <View onLayout={onCreditLayout} style={s.creditSlot}>
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
        </View>

        {/* === New accounts: setup first; everyone: what's waiting === */}
        <GetStartedCard steps={steps} />
        <AttentionList
          items={visibleAttention}
          expanded={showAllAlerts}
          onToggleExpanded={() => setShowAllAlerts(v => !v)}
          onDismiss={item => attentionDismissals.dismiss(item)}
        />

        {/* === Ads: after the wallet and what needs attention, before the care sections. Closed, it takes no space. === */}
        {adsClosed ? null : (
          <AdBanner
            onClose={closeAds}
            onSampleAdPress={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
          />
        )}

        {/* === Upcoming care === */}
        <CareSection
          visit={visit}
          prescription={prescription}
          onBook={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
          onViewAll={() => navigation.navigate('Appointments')}
        />

        {/* === Find care: the main way into care, so it sits above the news === */}
        <FindCare
          onSearch={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
          onCategory={category =>
            // Pharmacy: the prescription goes to nearby pharmacies, so there's no pharmacy to pick first.
            category === 'pharmacy'
              ? navigation.navigate('ServicesTab', { initial: false, screen: 'PrescriptionRequest' })
              : navigation.navigate('ServicesTab', { initial: false, screen: 'ProviderList', params: { category } })
          }
          onSeeAll={() => navigation.navigate('ServicesTab', { screen: 'FindService' })}
        />

        {/* === Health news === */}
        <HealthNewsSection />

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
  loadingText: {
    fontFamily: fontWeights.medium,
    fontSize: 15.5,
    color: colors.textSub,
  },
  // The card is the first item under the app bar: 16 px of top gap. The ScrollArea's section gap separates it from what follows.
  creditSlot: {
    marginTop: 16,
  },
})
