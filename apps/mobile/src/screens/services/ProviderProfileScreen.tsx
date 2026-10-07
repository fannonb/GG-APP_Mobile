import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  Image,
} from 'react-native'
import Pressable from '@/components/Pressable'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, MAvatar, GGPill, Stars, ActionBar } from '@/components'
import { ProviderLocationMap } from '@/components/provider/ProviderLocationMap'
import type { ServicesScreenProps } from '@/navigation/types'
import {
  useProvider,
  useProviderReviews,
  useDrivingDistances,
  useSubmitReviewMutation,
  usePatientInvoices,
  usePatientAppointments,
} from '@gg/shared-hooks'
import { useLocationStore } from '@gg/shared-stores'
import { formatPhone, getAppointmentDisplayStatus, getProviderHoursSummary } from '@gg/shared-utils'
import { animateNextLayout } from '@/lib/motion'
import type { Appointment, PatientInvoice, Provider, ProviderCategory, ProviderReview } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */








/* ------------------------------------------------------------------ */
/*  Opening hours helpers                                              */
/* ------------------------------------------------------------------ */
const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getTodayAbbr(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}

type DayRow = { day: string; open: boolean; from: string; to: string }

function parseOpeningHours(
  openingHours?: Record<string, { open: boolean; from: string; to: string }>,
): DayRow[] | null {
  if (!openingHours) return null
  return DAYS_ORDER.map(d => {
    const h = openingHours[d]
    return h ? { day: d, open: h.open, from: h.from, to: h.to } : { day: d, open: false, from: '', to: '' }
  })
}

function getProviderCategories(provider: Provider): ProviderCategory[] {
  if (provider.categories && provider.categories.length > 0) {
    return provider.categories
  }
  return provider.category ? [provider.category] : []
}

/** Pharmacy as the sole registered category — prescription upload only. */
function isPharmacyOnlyProvider(provider: Provider): boolean {
  const categories = getProviderCategories(provider)
  return categories.length === 1 && categories[0] === 'pharmacy'
}

/** Pharmacy plus at least one other category — prescription and booking. */
function isPharmacyMultiCategoryProvider(provider: Provider): boolean {
  const categories = getProviderCategories(provider)
  return categories.includes('pharmacy') && categories.length > 1
}

/* ------------------------------------------------------------------ */
/*  Maps helpers                                                       */
/* ------------------------------------------------------------------ */
function openDirections(p: Provider) {
  const dest = p.lat != null && p.lng != null
    ? `${p.lat},${p.lng}`
    : encodeURIComponent(`${p.name}, ${p.address}`)

  const url = Platform.select({
    android: `google.navigation:q=${dest}`,
    ios: `maps:?daddr=${dest}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
  })

  Linking.canOpenURL(url!).then(supported => {
    if (supported) {
      Linking.openURL(url!)
    } else {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`)
    }
  })
}

function CheckSmIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5 9-9" stroke={colors.success} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ProviderProfileScreen({ route, navigation }: ServicesScreenProps<'ProviderProfile'>) {
  const { providerId } = route.params
  const { data: provider, isLoading } = useProvider(providerId)
  const { data: reviews = [] } = useProviderReviews(providerId)
  const { data: invoices = [] } = usePatientInvoices()
  const { data: appointmentsData } = usePatientAppointments()
  const position = useLocationStore(s => s.position)
  const providerList = useMemo(() => provider ? [provider as Provider] : [], [provider])
  const { getLabel } = useDrivingDistances(position, providerList)
  const submitReview = useSubmitReviewMutation()

  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [logoPopupOpen, setLogoPopupOpen] = useState(false)
  const [showAllHours, setShowAllHours] = useState(false)

  const appointments = useMemo(
    () => [...(appointmentsData?.upcoming ?? []), ...(appointmentsData?.past ?? [])],
    [appointmentsData],
  )

  /** Completed visits at this provider that still need a review. */
  const reviewableVisit = useMemo(() => {
    if (!provider) return null

    const completedForProvider = appointments.filter(
      (apt: Appointment) =>
        String(apt.providerId) === String(providerId) &&
        getAppointmentDisplayStatus(apt) === 'completed',
    )
    if (completedForProvider.length === 0) return null

    const unreviewedInvoices = (invoices as PatientInvoice[]).filter(
      inv =>
        String(inv.providerId ?? '') === String(providerId) &&
        (inv.status === 'authorized' || inv.status === 'paid') &&
        !inv.reviewSubmitted,
    )
    if (unreviewedInvoices.length === 0) return null

    // Prefer invoices explicitly linked to a completed appointment.
    for (const apt of completedForProvider) {
      const linked = unreviewedInvoices.find(
        inv => inv.appointmentId && String(inv.appointmentId) === String(apt.id),
      )
      if (linked) return { invoice: linked, appointment: apt }
    }

    // Invoices that carry appointment metadata from the API (appointment-backed visits).
    const appointmentBacked = unreviewedInvoices.filter(
      inv => Boolean(inv.appointmentId || inv.appointmentDate || inv.appointmentService),
    )
    for (const inv of appointmentBacked) {
      const apt =
        completedForProvider.find(a => String(a.id) === String(inv.appointmentId)) ??
        completedForProvider.find(
          a =>
            inv.appointmentService &&
            a.service?.toLowerCase() === inv.appointmentService.toLowerCase(),
        ) ??
        completedForProvider[0]
      return { invoice: inv, appointment: apt }
    }

    // No appointment-linked invoice — don't prompt for a review yet.
    return null
  }, [appointments, invoices, provider, providerId])

  const reviewVisitLabel = useMemo(() => {
    if (!reviewableVisit) return null
    const { invoice, appointment } = reviewableVisit
    const service =
      appointment?.service ||
      invoice.appointmentService ||
      invoice.services?.[0]?.name ||
      'your visit'
    const dateSource = appointment?.date || invoice.appointmentDate || invoice.date
    let dateLabel = ''
    try {
      dateLabel = new Date(dateSource).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      dateLabel = ''
    }
    const time = appointment?.time || invoice.appointmentTime || ''
    const forWhom = appointment?.for
      ? appointment.for
      : invoice.serviceFor?.type === 'beneficiary'
        ? invoice.serviceFor.name
        : 'yourself'
    return { service, dateLabel, time, forWhom }
  }, [reviewableVisit])

  if (isLoading || !provider) {
    return (
      <Screen>
        <AppBar title="Provider" subtitle="Loading..." />
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={st.loadingText}>Loading provider...</Text>
        </View>
      </Screen>
    )
  }

  const p = provider as Provider
  const rating = p.rating ?? 4.5
  const reviewCount = p.reviews ?? reviews.length
  const todayAbbr = getTodayAbbr()
  const hoursRows = parseOpeningHours(p.openingHours)
  const { tel: phoneTel } = formatPhone(
    p.phone ?? '',
    p.country,
    p.address,
  )
  const categoryName = p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : ''
  const todayRow = hoursRows?.find(row => row.day === todayAbbr)
  const aboutFacts = [
    p.establishedYear ? `Established ${p.establishedYear}` : null,
    p.languages && p.languages.length > 0 ? `Speaks ${p.languages.join(', ')}` : null,
    p.license ? `Licence ${p.license}` : null,
  ].filter(Boolean) as string[]
  const pharmacyOnly = isPharmacyOnlyProvider(p)
  const pharmacyMultiCategory = isPharmacyMultiCategoryProvider(p)

  return (
    <Screen>
      <AppBar title={categoryName || 'Provider'} />

      <Modal
        visible={logoPopupOpen && Boolean(p.logoUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoPopupOpen(false)}
      >
        <Pressable style={st.logoModalBackdrop} onPress={() => setLogoPopupOpen(false)} feedback="none">
          {/* Inner Pressable absorbs presses so they don't dismiss via the backdrop.
              RN press events don't reliably expose stopPropagation(). */}
          <Pressable style={st.logoModalCard} onPress={() => {}} feedback="none">
            <Pressable style={st.logoModalClose} onPress={() => setLogoPopupOpen(false)}>
              <Text style={st.logoModalCloseText}>✕</Text>
            </Pressable>
            {p.logoUrl ? (
              <Image source={{ uri: p.logoUrl }} style={st.logoModalImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollArea gap={14} px={16} py={14}>
        {/* === 1. Who, where, and whether you can go now === */}
        <MCard padding={16}>
          <View style={st.headerRow}>
            <Pressable
              disabled={!p.logoUrl}
              onPress={() => p.logoUrl && setLogoPopupOpen(true)}
              accessibilityRole={p.logoUrl ? 'imagebutton' : undefined}
              accessibilityLabel={p.logoUrl ? `${p.name} logo, tap to enlarge` : undefined}
            >
              {p.logoUrl ? (
                <Image source={{ uri: p.logoUrl }} style={st.providerLogo} />
              ) : (
                <MAvatar name={p.name} size={60} bg={colors.navy} />
              )}
            </Pressable>
            <View style={st.headerInfo}>
              <Text style={st.providerName} accessibilityRole="header">{p.name}</Text>
              <Text style={st.categoryAddress} numberOfLines={2}>
                {[categoryName, p.address].filter(Boolean).join(' · ')}
              </Text>
              <View style={st.pillRow}>
                <Stars rating={rating} count={reviewCount} />
                <GGPill type="info">Verified</GGPill>
              </View>
            </View>
          </View>

          {/* One status line instead of a Status/Distance/Phone table. */}
          <View style={st.statusLine}>
            <View style={[st.statusDot, p.status === 'open' ? st.statusDotOpen : st.statusDotClosed]} />
            <Text style={st.statusText}>
              {[getProviderHoursSummary(p), getLabel(p)].filter(Boolean).join(' · ')}
            </Text>
          </View>

          <View style={st.creditBadge}>
            <CheckSmIcon />
            <Text style={st.creditBadgeText}>GG'APP credit accepted · no upfront payment</Text>
          </View>

          <View style={st.quickActions}>
            {phoneTel ? (
              <MBtn variant="secondary" sm style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${phoneTel}`)}>
                Call
              </MBtn>
            ) : null}
            <MBtn variant="secondary" sm style={{ flex: 1 }} onPress={() => openDirections(p)}>
              Directions
            </MBtn>
          </View>
        </MCard>

        {/* === 2. Services === */}
        {(p.services ?? []).length > 0 ? (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>Services</Text>
            <View style={st.serviceTagsWrap}>
              {(p.services ?? []).map((svc: string) => (
                <View key={svc} style={st.serviceTag}>
                  <Text style={st.serviceTagText}>{svc}</Text>
                </View>
              ))}
            </View>
          </MCard>
        ) : null}

        {/* === 3. Hours: today first, the week on demand === */}
        {hoursRows ? (
          <MCard padding={16}>
            <View style={st.hoursHeader}>
              <Text style={st.sectionTitle}>Opening hours</Text>
              <Pressable
                onPress={() => {
                  animateNextLayout()
                  setShowAllHours(v => !v)
                }}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={st.hoursToggle}>{showAllHours ? 'Show less' : 'See all hours'}</Text>
              </Pressable>
            </View>
            {(showAllHours ? hoursRows : todayRow ? [todayRow] : hoursRows.slice(0, 1)).map((row, idx, list) => {
              const isToday = row.day === todayAbbr
              return (
                <View key={row.day} style={[st.hoursRow, idx < list.length - 1 && st.hoursRowBorder]}>
                  <Text style={[st.hoursDay, isToday && st.hoursTodayDay]}>{isToday ? `Today (${row.day})` : row.day}</Text>
                  {row.open ? (
                    <Text style={[st.hoursValue, isToday && st.hoursTodayValue]}>
                      {row.from} – {row.to}
                    </Text>
                  ) : (
                    <Text style={st.hoursClosed}>Closed</Text>
                  )}
                </View>
              )
            })}
          </MCard>
        ) : null}

        {/* === 4. Location === */}
        <MCard padding={16}>
          <ProviderLocationMap
            location={{
              name: p.name,
              address: p.address,
              lat: p.lat,
              lng: p.lng,
            }}
            onDirections={() => openDirections(p)}
          />
        </MCard>

        {/* === 5. About: plain facts, not button-like pills === */}
        {p.about || aboutFacts.length > 0 ? (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>About</Text>
            {p.about ? <Text style={st.aboutText}>{p.about}</Text> : null}
            {aboutFacts.map(fact => (
              <Text key={fact} style={st.aboutFact}>
                {fact}
              </Text>
            ))}
          </MCard>
        ) : null}

        {/* === 7. Write a Review (completed appointment reminder) === */}
        {reviewableVisit && reviewVisitLabel && !reviewSubmitted && (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>Write a Review</Text>
            <View style={st.reviewReminderBox}>
              <Text style={st.reviewReminderTitle}>Remind me — leave feedback for this visit</Text>
              <Text style={st.reviewReminderDetail}>
                {reviewVisitLabel.service}
                {reviewVisitLabel.dateLabel ? ` · ${reviewVisitLabel.dateLabel}` : ''}
                {reviewVisitLabel.time ? ` · ${reviewVisitLabel.time}` : ''}
              </Text>
              <Text style={st.reviewReminderFor}>
                Appointment for {reviewVisitLabel.forWhom}
              </Text>
            </View>
            <Text style={st.reviewFormSub}>
              How was your experience with {p.name}?
            </Text>

            <View style={st.starsInput}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setReviewRating(star)} hitSlop={6}>
                  <Text style={[st.starBtn, star <= reviewRating && st.starBtnActive]}>
                    {star <= reviewRating ? '★' : '☆'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {reviewRating > 0 && (
              <>
                <TextInput
                  style={st.reviewInput}
                  placeholder="Tell others about this appointment..."
                  placeholderTextColor={colors.textLight}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <MBtn
                  variant="primary"
                  fullWidth
                  disabled={submitReview.isPending}
                  onPress={() => {
                    submitReview.mutate(
                      {
                        providerId: Number(providerId),
                        invoiceId: reviewableVisit.invoice.id,
                        rating: reviewRating,
                        text: reviewText || undefined,
                        providerName: p.name,
                      },
                      { onSuccess: () => setReviewSubmitted(true) },
                    )
                  }}
                >
                  {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
                </MBtn>
              </>
            )}
          </MCard>
        )}

        {reviewSubmitted && (
          <View style={st.reviewSuccessBanner}>
            <Text style={st.reviewSuccessText}>Thank you for your review!</Text>
          </View>
        )}

        {/* === 8. Patient Reviews === */}
        <MCard padding={16}>
          <View style={st.reviewsHeader}>
            <Text style={st.sectionTitle}>Patient reviews</Text>
            {reviewCount > 0 ? (
              <Text style={st.reviewCount}>
                ★ {rating.toFixed(1)} · {reviewCount} {reviews.length > 0 ? (reviewCount === 1 ? 'review' : 'reviews') : reviewCount === 1 ? 'rating' : 'ratings'}
              </Text>
            ) : null}
          </View>

          {reviews.length > 0 ? (
            reviews.slice(0, 5).map((rev: ProviderReview, idx: number) => (
              <View key={idx} style={[st.reviewItem, idx < Math.min(reviews.length, 5) - 1 && st.reviewBorder]}>
                <View style={st.reviewTopRow}>
                  <MAvatar name={rev.name ?? 'Patient'} size={36} bg={colors.blue400} />
                  <View style={st.reviewInfo}>
                    <Text style={st.reviewName}>{rev.name ?? 'Patient'}</Text>
                    <Text style={st.reviewDate}>{rev.date ?? ''}</Text>
                  </View>
                  <Stars rating={rev.rating ?? 5} />
                </View>
                <Text style={st.reviewText}>{rev.text ?? ''}</Text>
              </View>
            ))
          ) : (
            <Text style={st.emptyText}>
              {reviewCount > 0 ? 'No written reviews yet. Ratings from past visits are counted above.' : 'No reviews yet'}
            </Text>
          )}
        </MCard>
      </ScrollArea>

      {/* Main action pinned above the tab bar, never buried below the map and hours. */}
      <ActionBar aboveTabBar>
        {pharmacyOnly ? (
          <MBtn variant="primary" style={{ flex: 1 }} onPress={() => navigation.navigate('PrescriptionRequest', { providerId })}>
            Upload a prescription
          </MBtn>
        ) : pharmacyMultiCategory ? (
          <>
            <MBtn variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('BookingForm', { providerId })}>
              Book visit
            </MBtn>
            <MBtn variant="primary" style={{ flex: 1.4 }} onPress={() => navigation.navigate('PrescriptionRequest', { providerId })}>
              Upload prescription
            </MBtn>
          </>
        ) : (
          <MBtn variant="primary" style={{ flex: 1 }} onPress={() => navigation.navigate('BookingForm', { providerId })}>
            Book an appointment
          </MBtn>
        )}
      </ActionBar>
    </Screen>
  )
}

export default ProviderProfileScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const st = StyleSheet.create({
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOpen: {
    backgroundColor: colors.success,
  },
  statusDotClosed: {
    backgroundColor: colors.textLight,
  },
  statusText: {
    flex: 1,
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.successBg,
  },
  creditBadgeText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.success,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hoursToggle: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.blueInk,
  },
  aboutFact: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSub,
    marginTop: 4,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: fontWeights.medium, color: colors.textSub },

  headerRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  providerLogo: { width: 60, height: 60, borderRadius: 12, backgroundColor: colors.bg },
  logoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,30,66,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.large,
    padding: 16,
    alignItems: 'center',
  },
  logoModalClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoModalCloseText: { fontSize: 16, color: colors.textSub },
  logoModalImage: { width: '100%', height: 280 },
  headerInfo: { flex: 1, gap: 5 },
  providerName: { fontSize: 16, fontFamily: fontWeights.extraBold, color: colors.text },
  categoryAddress: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 17 },
  pillRow: { flexDirection: 'row', gap: 6 },


  sectionTitle: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.text, marginBottom: 12 },

  aboutText: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 20, marginBottom: 14 },

  serviceTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  serviceTagText: { fontSize: 12, fontFamily: fontWeights.medium, color: colors.text },


  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  hoursRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  hoursDay: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.text },
  hoursValue: { fontSize: 13, fontFamily: fontWeights.semiBold, color: colors.textSub },
  hoursTodayDay: { color: colors.blueInk, fontFamily: fontWeights.bold },
  hoursTodayValue: { color: colors.blueInk, fontFamily: fontWeights.bold },
  hoursClosed: { fontSize: 13, fontFamily: fontWeights.semiBold, color: colors.error },


  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewCount: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub },
  reviewItem: { paddingVertical: 12, gap: 8 },
  reviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewInfo: { flex: 1, gap: 2 },
  reviewName: { fontSize: 13, fontFamily: fontWeights.semiBold, color: colors.text },
  reviewDate: { fontSize: 11, fontFamily: fontWeights.regular, color: colors.textLight },
  reviewText: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 18, marginLeft: 46 },
  emptyText: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, textAlign: 'center', paddingVertical: 16 },

  reviewFormSub: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, marginBottom: 14 },
  reviewReminderBox: {
    backgroundColor: colors.blue3,
    borderRadius: radii.default,
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  reviewReminderTitle: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    color: colors.navy,
  },
  reviewReminderDetail: {
    fontSize: 13,
    fontFamily: fontWeights.semiBold,
    color: colors.text,
    lineHeight: 18,
  },
  reviewReminderFor: {
    fontSize: 11,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
  },
  starsInput: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  starBtn: { fontSize: 32, color: colors.border },
  starBtnActive: { color: colors.blueInk },
  reviewInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontWeights.regular, fontSize: 14, color: colors.text, backgroundColor: colors.bg, minHeight: 70, marginBottom: 14 },
  reviewSuccessBanner: { backgroundColor: colors.successBg, borderRadius: radii.default, padding: 14, alignItems: 'center' },
  reviewSuccessText: { fontSize: 14, fontFamily: fontWeights.bold, color: colors.success },
})
