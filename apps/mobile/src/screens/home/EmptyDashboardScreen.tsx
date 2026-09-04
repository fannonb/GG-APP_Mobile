import React, { useMemo } from 'react'
import { View, Text, Image, Pressable, StyleSheet, type ViewStyle } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontWeights, radii } from '@/theme'
import { ScrollArea, MCard, MBtn, GGPill, AdBanner, NotifBanner } from '@/components'
import BellIcon from '@/icons/BellIcon'
import CreditIcon from '@/icons/CreditIcon'
import CheckIcon from '@/icons/CheckIcon'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import PharmacyIcon from '@/icons/PharmacyIcon'
import LaboratoryIcon from '@/icons/LaboratoryIcon'
import DoctorIcon from '@/icons/DoctorIcon'
import RadiologyIcon from '@/icons/RadiologyIcon'
import HospitalIcon from '@/icons/HospitalIcon'
import ClinicIcon from '@/icons/ClinicIcon'
import GlobeIcon from '@/icons/GlobeIcon'
import { useUserStore, useAuthStore, useNotificationsStore, deriveOnboardingStepStatus } from '@gg/shared-stores'
import { usePatientProfile, useCreditStatus, usePatientNotifications, usePatientAppointments, usePatientInvoices } from '@gg/shared-hooks'
import { getCountryByCode, SERVICE_CATEGORIES } from '@gg/shared-config'
import { derivePatientOnboardingCompletedSteps, formatTime12h, getAppointmentDisplayStatus, isActionablePendingInvoice } from '@gg/shared-utils'
import HealthNewsSection from '@/components/HealthNewsSection'

const appLogo = require('../../../assets/gg-logo.png')

/* ------------------------------------------------------------------ */
/*  Category icon map                                                  */
/* ------------------------------------------------------------------ */
const CAT_ICONS: Record<string, React.ReactNode> = {
  pharmacy:   <PharmacyIcon size={32} color={colors.blue} />,
  laboratory: <LaboratoryIcon size={32} color={colors.blue} />,
  doctor:     <DoctorIcon size={32} color={colors.blue} />,
  radiology:  <RadiologyIcon size={32} color={colors.blue} />,
  hospital:   <HospitalIcon size={32} color={colors.blue} />,
  clinic:     <ClinicIcon size={32} color={colors.blue} />,
}

/* ------------------------------------------------------------------ */
/*  Onboarding steps definition                                        */
/* ------------------------------------------------------------------ */
const ONBOARDING_STEPS = [
  { step: 1, title: 'Create Account',         desc: 'Personal details, email and password registered.' },
  { step: 2, title: 'Verify Email',           desc: 'Your email address has been confirmed.' },
  { step: 3, title: 'Set Payment PIN',        desc: 'A 4–6 digit PIN required before you can authorise payments.' },
  { step: 4, title: 'Apply for Credit',       desc: 'Submit your application so funds can be loaded to your wallet.' },
  { step: 5, title: 'Book First Appointment', desc: 'Find a verified provider near you and book your first visit.' },
]

const FLAG_EMOJI: Record<string, string> = {
  KE: '\u{1F1F0}\u{1F1EA}',
  ZW: '\u{1F1FF}\u{1F1FC}',
  ZM: '\u{1F1FF}\u{1F1F2}',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function EmptyDashboardScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const storedUser = useUserStore(s => s.user)
  const completedSteps = useAuthStore(s => s.onboardingCompletedSteps)
  const patientNotifs = useNotificationsStore(s => s.patientNotifs)
  const { data: profileData } = usePatientProfile()
  const { data: creditData } = useCreditStatus()
  const { data: appointmentsData } = usePatientAppointments()
  const { data: invoices = [] } = usePatientInvoices()
  const { data: fetchedNotifs } = usePatientNotifications()
  const notifications = fetchedNotifs ?? patientNotifs
  const unreadCount = notifications.filter(n => !n.read).length

  /* Prefer live profile data over the local store so completed actions
     (PIN set, credit applied) are reflected as soon as they're refetched. */
  const u = profileData?.user ?? storedUser
  const creditStatus =
    profileData?.user?.creditStatus ??
    (creditData as any)?.creditStatus ??
    u?.creditStatus
  const hasPaymentPin =
    profileData?.user?.hasPaymentPin ?? u?.hasPaymentPin ?? false

  /* Steps 3 (PIN) and 4 (credit) are derived from backend truth as well as the
     local checklist, so they never revert after an action succeeds. */
  const appointments = [
    ...(appointmentsData?.upcoming ?? []),
    ...(appointmentsData?.past ?? []),
  ]
  const appointmentCount = appointments.length
  const nextApt = (appointmentsData?.upcoming ?? [])[0]
  const effectiveCompletedSteps = useMemo(() => {
    const fromAccount = derivePatientOnboardingCompletedSteps(
      { hasPaymentPin, creditStatus: creditStatus ?? 'not_applied' },
      appointmentCount,
    )
    return [...new Set([...completedSteps, ...fromAccount])].sort((a, b) => a - b)
  }, [completedSteps, hasPaymentPin, creditStatus, appointmentCount])

  const firstName = u?.name?.split(' ')[0] || 'there'
  const flag = FLAG_EMOJI[u?.countryCode ?? 'KE'] ?? ''
  const country = getCountryByCode(u?.countryCode ?? 'KE')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <View style={s.root}>
      {/* === Navy Header === */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.decoCircle1} />
        <View style={s.decoCircle2} />

        <View style={s.headerRow}>
          <Image source={appLogo} style={s.headerLogo} resizeMode="contain" />
          <View style={s.headerLeft}>
            <Text style={s.greetLabel}>Welcome to GG'APP</Text>
            <Text style={s.greetDate}>{today}</Text>
          </View>

          <Pressable
            style={s.bellWrap}
            onPress={() => navigation.navigate('Notifications')}
          >
            <BellIcon size={18} color="#FFFFFF" />
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

      {/* Scrollable body */}
      <ScrollArea gap={14} px={16} py={14}>
        {/* === Greeting === */}
        <Text style={s.greetingLine}>
          {getGreeting()}, {firstName}! {flag}
        </Text>

        {/* === Credit application submitted / under review banner === */}
        {creditStatus === 'pending' && (
          <NotifBanner
            icon={<CheckIcon size={18} color="#FFFFFF" />}
            tone="info"
            title="Credit Application Under Review"
            body="Your credit application is being reviewed. You'll be notified once a decision is made."
            cta="View Status"
            onCta={() => navigation.navigate('WalletTab', { screen: 'CreditStatus' })}
          />
        )}

        {/* === 1. Stat Tiles === */}
        <View style={s.statsGrid}>
          <View style={s.statsTopRow}>
            <Pressable
              style={s.statCard}
              onPress={() =>
                creditStatus === 'pending' || creditStatus === 'approved'
                  ? navigation.navigate('WalletTab', { screen: creditStatus === 'pending' ? 'CreditStatus' : 'CreditWallet' })
                  : navigation.navigate('WalletTab', { screen: 'CreditDisclaimer' })
              }
            >
              <Text style={s.statLabel}>AVAILABLE BALANCE</Text>
              <Text style={s.statValueMuted}>
                {creditStatus === 'pending'
                  ? 'Under Review'
                  : creditStatus === 'rejected'
                    ? 'Not approved'
                    : creditStatus === 'approved'
                      ? 'Active'
                      : 'Not Applied'}
              </Text>
              <Text style={s.statCta}>
                {creditStatus === 'pending'
                  ? 'View Status →'
                  : creditStatus === 'approved'
                    ? 'Open wallet →'
                    : creditStatus === 'rejected'
                      ? 'Apply again →'
                      : 'Apply for credit →'}
              </Text>
            </Pressable>

            <View style={s.statCard}>
              <Text style={s.statLabel}>SPENT THIS MONTH</Text>
              <Text style={s.statValueDash}>—</Text>
              <Text style={s.statSubMuted}>No transactions yet</Text>
            </View>
          </View>

          <Pressable
            style={s.statCardFull}
            onPress={() =>
              nextApt
                ? getAppointmentDisplayStatus(nextApt) === 'pending' && (nextApt as any).rescheduledAt
                  ? navigation.navigate('HomeTab', { screen: 'RescheduleReview', params: { appointmentId: String(nextApt.id) } })
                  : navigation.navigate('HomeTab', { screen: 'Appointments' })
                : navigation.navigate('ServicesTab', { screen: 'FindService' })
            }
          >
            <View style={s.statCardFullInner}>
              <View style={{ flex: 1 }}>
                <Text style={s.statLabel}>NEXT APPOINTMENT</Text>
                <Text style={s.statValueMuted}>
                  {nextApt
                    ? `${nextApt.provider} · ${formatTime12h(nextApt.time)}`
                    : 'None booked'}
                </Text>
              </View>
              <Text style={s.statCta}>{nextApt ? 'View →' : 'Find a service →'}</Text>
            </View>
          </Pressable>
        </View>

        {/* === 2. Getting Started — Redesigned with navy/blue theme === */}
        <View style={s.stepsCard}>
          <View style={s.stepsHeader}>
            <Text style={s.stepsTitle}>Getting Started</Text>
            <View style={s.stepsBadge}>
              <Text style={s.stepsBadgeText}>
                {effectiveCompletedSteps.length}/5 done
              </Text>
            </View>
          </View>

          <View style={s.stepsContainer}>
            {ONBOARDING_STEPS.map((item, index) => {
              const status = deriveOnboardingStepStatus(item.step, effectiveCompletedSteps)
              const isDone = status === 'done'
              const isAction = status === 'action'
              const isNext = status === 'next'
              const isLast = index === ONBOARDING_STEPS.length - 1

              let ctaText = ''
              let ctaTarget: any = null
              if (item.step === 3) { ctaText = 'Set Up PIN →'; ctaTarget = () => navigation.navigate('ProfileTab', { screen: 'Profile', params: { openSection: 'security' } }) }
              if (item.step === 4) { ctaText = 'Apply Now →'; ctaTarget = () => navigation.navigate('WalletTab', { screen: 'CreditDisclaimer' }) }
              if (item.step === 5) { ctaText = 'Browse Providers →'; ctaTarget = () => navigation.navigate('ServicesTab', { screen: 'FindService' }) }

              return (
                <View key={item.step}>
                  <View style={s.stepRow}>
                    {/* Timeline dot + line */}
                    <View style={s.stepTimeline}>
                      <View
                        style={[
                          s.stepDot,
                          isDone && s.stepDotDone,
                          isAction && s.stepDotAction,
                          isNext && s.stepDotNext,
                        ]}
                      >
                        {isDone ? (
                          <CheckIcon size={12} color="#FFFFFF" />
                        ) : (
                          <Text style={[s.stepNum, (isAction || isNext) && s.stepNumActive]}>
                            {item.step}
                          </Text>
                        )}
                      </View>
                      {!isLast && (
                        <View style={[s.stepLine, isDone && s.stepLineDone]} />
                      )}
                    </View>

                    {/* Step content */}
                    <View style={[s.stepContent, isLast && { paddingBottom: 0 }]}>
                      <View style={s.stepTitleRow}>
                        <Text style={[s.stepTitle, isDone && s.stepTitleDone]}>{item.title}</Text>
                        {isDone && (
                          <View style={s.doneBadge}>
                            <Text style={s.doneBadgeText}>DONE</Text>
                          </View>
                        )}
                        {(isAction || isNext) && (
                          <View style={s.upNextBadge}>
                            <Text style={s.upNextBadgeText}>UP NEXT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.stepDesc}>{item.desc}</Text>
                      {(isAction || isNext) && ctaText && ctaTarget && (
                        <Pressable onPress={ctaTarget} style={s.stepCta}>
                          <Text style={s.stepCtaText}>{ctaText.replace(' →', '')}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* === 3. Find a Service (same grid as main dashboard) === */}
        <MCard padding={16}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Find a Service</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('ServicesTab', { screen: 'FindService' })
              }
            >
              <Text style={s.seeAll}>{'See all →'}</Text>
            </Pressable>
          </View>

          <View style={s.catGrid}>
            {SERVICE_CATEGORIES.filter(c => !c.isComingSoon).map(cat => (
              <Pressable
                key={cat.id}
                style={s.catItem}
                onPress={() => {
                  navigation.navigate('ServicesTab', {
                    screen: 'ProviderList',
                    params: { category: cat.id },
                  })
                }}
              >
                <View style={s.catIconWrap}>
                  {CAT_ICONS[cat.id] ?? <PharmacyIcon size={32} color={colors.blue} />}
                </View>
                <Text style={s.catLabel} numberOfLines={1}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Global Specialists row */}
          <Pressable style={s.globalRow}>
            <View style={s.globalLeft}>
              <View style={s.catIconWrap}>
                <GlobeIcon size={32} color={colors.blue} />
              </View>
              <View>
                <Text style={s.catLabel}>Global Specialists</Text>
                <Text style={s.globalDesc}>International tertiary care</Text>
              </View>
            </View>
            <View style={s.comingSoonPill}>
              <Text style={s.comingSoonText}>Coming Soon</Text>
            </View>
          </Pressable>
        </MCard>

        {(!hasPaymentPin || invoices.some(isActionablePendingInvoice)) ? null : <HealthNewsSection />}

        {(!hasPaymentPin || invoices.some(isActionablePendingInvoice)) ? null : (
          <AdBanner countryName={country?.name} />
        )}

        {/* bottom spacer for tab bar */}
        <View style={{ height: 24 }} />
      </ScrollArea>
    </View>
  )
}

export default EmptyDashboardScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const HEADER_BG = colors.navy

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* ---- header ---- */
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(47,155,255,0.08)',
    right: -80,
    top: -80,
  },
  decoCircle2: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(47,155,255,0.05)',
    right: -80,
    top: -80,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  headerLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  headerLeft: { flex: 1, gap: 2 },
  greetLabel: {
    fontSize: 13,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.4)',
  },
  greetName: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  greetDate: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  bellWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },

  /* ---- greeting ---- */
  greetingLine: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },

  /* ---- stat tiles ---- */
  statsGrid: {
    gap: 10,
  },
  statsTopRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardFull: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardFullInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
    letterSpacing: 0.8,
  },
  statFlag: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.textSub,
  },
  statValueMuted: {
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: colors.textLight,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statValueDash: {
    fontSize: 22,
    fontFamily: fontWeights.extraBold,
    color: colors.textLight,
    marginTop: 6,
    marginBottom: 4,
  },
  statSubMuted: {
    fontSize: 10,
    fontFamily: fontWeights.regular,
    color: colors.textLight,
  },
  statCta: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },

  /* ---- getting started ---- */
  stepsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 17,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  stepsBadge: {
    backgroundColor: colors.blue3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(47,155,255,0.2)',
  },
  stepsBadgeText: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  stepsContainer: {},
  stepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stepTimeline: {
    alignItems: 'center',
    width: 36,
    flexShrink: 0,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  stepDotAction: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  stepDotNext: {
    backgroundColor: colors.bg,
    borderColor: colors.blue,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  stepLineDone: {
    backgroundColor: colors.navy,
  },
  stepNum: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.textLight,
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    marginLeft: 14,
    paddingBottom: 22,
    borderBottomWidth: 0,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  stepTitleDone: {
    color: colors.navy,
  },
  doneBadge: {
    backgroundColor: 'rgba(13,30,66,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  doneBadgeText: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  upNextBadge: {
    backgroundColor: colors.blue3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  upNextBadgeText: {
    fontSize: 9,
    fontFamily: fontWeights.bold,
    color: colors.blue,
    letterSpacing: 0.5,
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
  },
  stepCta: {
    marginTop: 8,
  },
  stepCtaText: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },

  /* ---- health news carousel ---- */
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveFeed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: colors.success,
  },
  newsCarousel: {
    gap: 12,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  indicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  indicatorActive: {
    width: 20,
    backgroundColor: colors.blue,
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
  newsCardTitleFeatured: {
    color: '#FFFFFF',
  },
  newsCardBody: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
    marginBottom: 14,
  },
  newsCardBodyFeatured: {
    color: 'rgba(255,255,255,0.5)',
  },
  newsCardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  newsCardFooterFeatured: {
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  newsSourceWrap: {},
  newsSourceLabel: {
    fontSize: 8,
    fontFamily: fontWeights.bold,
    color: colors.textLight,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  newsSourceLabelFeatured: {
    color: 'rgba(255,255,255,0.3)',
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  newsSourceName: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.textSub,
  },
  newsSourceNameFeatured: {
    color: 'rgba(255,255,255,0.6)',
  },
  newsDateInline: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textLight,
    marginTop: 4,
  },
  newsDateInlineFeatured: {
    color: 'rgba(255,255,255,0.4)',
  },
  newsDateBadge: {
    backgroundColor: colors.blue3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newsDateBadgeFeatured: {
    backgroundColor: 'rgba(47,155,255,0.2)',
  },
  newsDateText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.blue,
  },
  newsDateTextFeatured: {
    color: colors.blue400,
  },

  /* ---- find a service ---- */
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontWeights.extraBold,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: colors.blue,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  catItem: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },
  catIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 11,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    textAlign: 'center',
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  globalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  globalDesc: {
    fontSize: 10,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 2,
  },
  comingSoonPill: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: fontWeights.bold,
    color: colors.warning,
  },

  /* ---- news modal ---- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,21,40,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fontWeights.extraBold,
    color: '#FFFFFF',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalSourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSourceLabel: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginBottom: 2,
  },
  modalSourceName: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  modalSourceDate: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    marginTop: 1,
  },
  modalVisitBtn: {
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalVisitText: {
    fontSize: 12,
    fontFamily: fontWeights.semiBold,
    color: '#FFFFFF',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  modalParagraph: {
    fontSize: 14,
    fontFamily: fontWeights.regular,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})
