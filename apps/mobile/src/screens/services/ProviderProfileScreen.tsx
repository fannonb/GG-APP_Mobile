import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  Image,
} from 'react-native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { colors, fontWeights, radii } from '@/theme'
import { Screen, ScrollArea, AppBar, MCard, MBtn, MAvatar, GGPill, Stars } from '@/components'
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
import { formatPhone, getAppointmentDisplayStatus } from '@gg/shared-utils'
import type { Appointment, PatientInvoice, Provider, ProviderCategory, ProviderReview } from '@gg/shared-types'

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */
function MapPinIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}

function ClockIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={6} x2={12} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={12} y1={12} x2={16} y2={14} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function PhoneIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.35 1.9.68 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.33 1.85.56 2.81.68a2 2 0 011.72 2.04z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function InfoIcon({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={16} x2={12} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={1} fill={color} />
    </Svg>
  )
}

function GlobeIcon({ size = 14, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}

function CalendarSmIcon({ size = 14, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ShieldIcon({ size = 14, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

function UploadIcon({ size = 14, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 16V4M7 9l5-5 5 5M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

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
  const { display: phoneDisplay, tel: phoneTel } = formatPhone(
    p.phone ?? '',
    p.country,
    p.address,
  )
  const pharmacyOnly = isPharmacyOnlyProvider(p)
  const pharmacyMultiCategory = isPharmacyMultiCategoryProvider(p)

  return (
    <Screen>
      <AppBar title={p.name} subtitle={p.address} />

      <Modal
        visible={logoPopupOpen && Boolean(p.logoUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoPopupOpen(false)}
      >
        <Pressable style={st.logoModalBackdrop} onPress={() => setLogoPopupOpen(false)}>
          {/* Inner Pressable absorbs presses so they don't dismiss via the backdrop.
              RN press events don't reliably expose stopPropagation(). */}
          <Pressable style={st.logoModalCard} onPress={() => {}}>
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
        {/* === 1. Header Card === */}
        <MCard padding={16}>
          <View style={st.headerRow}>
            <Pressable
              disabled={!p.logoUrl}
              onPress={() => p.logoUrl && setLogoPopupOpen(true)}
            >
              {p.logoUrl ? (
                <Image source={{ uri: p.logoUrl }} style={st.providerLogo} />
              ) : (
                <MAvatar name={p.name} size={60} bg={colors.navy} />
              )}
            </Pressable>
            <View style={st.headerInfo}>
              <Text style={st.providerName}>{p.name}</Text>
              <Text style={st.categoryAddress} numberOfLines={2}>
                {p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : ''} · {p.address}
              </Text>
              <View style={st.pillRow}>
                <GGPill type={p.status === 'open' ? 'open' : 'closed'}>
                  {p.status === 'open' ? 'Open' : 'Closed'}
                </GGPill>
                <GGPill type="info">Verified</GGPill>
              </View>
              <Stars rating={rating} count={reviewCount} />
            </View>
          </View>

          {/* Info panel */}
          <View style={st.infoPanel}>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Status</Text>
              <GGPill type={p.status === 'open' ? 'open' : 'closed'}>
                {p.status === 'open' ? 'Open' : 'Closed'}
              </GGPill>
            </View>
            <View style={st.infoDivider} />
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Distance</Text>
              <Text style={st.infoValue}>{getLabel(p)}</Text>
            </View>
            <View style={st.infoDivider} />
            <Pressable
              style={st.infoRow}
              onPress={() => phoneTel && Linking.openURL(`tel:${phoneTel}`)}
              disabled={!phoneTel}
            >
              <Text style={st.infoLabel}>Phone</Text>
              <View style={st.phoneRow}>
                <PhoneIcon size={14} color={colors.blue} />
                <Text style={st.phoneLinkText}>
                  {phoneTel ? phoneDisplay : 'Unavailable'}
                </Text>
              </View>
            </Pressable>
          </View>
        </MCard>

        {/* === 2. About Us === */}
        {p.about ? (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>About Us</Text>
            <Text style={st.aboutText}>{p.about}</Text>

            <View style={st.infoPills}>
              {p.establishedYear ? (
                <View style={st.infoPill}>
                  <CalendarSmIcon size={13} color={colors.blue} />
                  <Text style={st.infoPillText}>Established {p.establishedYear}</Text>
                </View>
              ) : null}
              {p.languages && p.languages.length > 0 ? (
                <View style={st.infoPill}>
                  <GlobeIcon size={13} color={colors.blue} />
                  <Text style={st.infoPillText}>{p.languages.join(' · ')}</Text>
                </View>
              ) : null}
              {p.license ? (
                <View style={st.infoPill}>
                  <ShieldIcon size={13} color={colors.blue} />
                  <Text style={st.infoPillText}>Lic: {p.license}</Text>
                </View>
              ) : null}
            </View>
          </MCard>
        ) : null}

        {/* === 3. Services Offered === */}
        <MCard padding={16}>
          <Text style={st.sectionTitle}>Services Offered</Text>
          <View style={st.serviceTagsWrap}>
            {(p.services ?? []).map((svc: string) => (
              <View key={svc} style={st.serviceTag}>
                <Text style={st.serviceTagText}>{svc}</Text>
              </View>
            ))}
          </View>
        </MCard>

        {pharmacyOnly ? (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>Upload a Prescription</Text>
            <Pressable
              style={st.actionOptionCard}
              onPress={() => navigation.navigate('PrescriptionRequest', { providerId })}
            >
              <View style={st.actionOptionIcon}>
                <UploadIcon size={16} color={colors.blue} />
              </View>
              <View style={st.actionOptionBody}>
                <Text style={st.actionOptionTitle}>Upload a Prescription</Text>
                <Text style={st.actionOptionText}>
                  Submit your prescription for medication review, pickup, or delivery.
                </Text>
              </View>
            </Pressable>
          </MCard>
        ) : pharmacyMultiCategory ? (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>Choose a Service Option</Text>
            <View style={st.actionOptions}>
              <Pressable
                style={st.actionOptionCard}
                onPress={() => navigation.navigate('PrescriptionRequest', { providerId })}
              >
                <View style={st.actionOptionIcon}>
                  <UploadIcon size={16} color={colors.blue} />
                </View>
                <View style={st.actionOptionBody}>
                  <Text style={st.actionOptionTitle}>Upload a Prescription</Text>
                  <Text style={st.actionOptionText}>
                    Submit your prescription for medication review, pickup, or delivery.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={st.actionOptionCard}
                onPress={() => navigation.navigate('BookingForm', { providerId })}
              >
                <View style={st.actionOptionIcon}>
                  <CalendarSmIcon size={16} color={colors.blue} />
                </View>
                <View style={st.actionOptionBody}>
                  <Text style={st.actionOptionTitle}>Book an Appointment</Text>
                  <Text style={st.actionOptionText}>
                    Request a consultation, vaccination, or in-person pharmacy visit.
                  </Text>
                </View>
              </Pressable>
            </View>
          </MCard>
        ) : (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>Book a Visit</Text>
            <Text style={st.bookingIntro}>
              Schedule an appointment with {p.name} for the services listed above.
            </Text>
            <MBtn
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate('BookingForm', { providerId })}
            >
              Book an Appointment
            </MBtn>
          </MCard>
        )}

        {/* === 4. Location Card === */}
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

        {/* === 5. Opening Hours === */}
        {hoursRows ? (
          <MCard padding={16}>
            <Text style={st.sectionTitle}>Opening Hours</Text>
            {hoursRows.map((row, idx) => {
              const isToday = row.day === todayAbbr
              return (
                <View key={row.day} style={[st.hoursRow, idx < hoursRows.length - 1 && st.hoursRowBorder]}>
                  <Text style={[st.hoursDay, isToday && st.hoursTodayDay]}>{row.day}</Text>
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

        {/* === 6. Credit Notice === */}
        <View style={st.creditBanner}>
          <InfoIcon size={18} color={colors.blue} />
          <Text style={st.creditBannerText}>
            GG'APP credit accepted. No upfront payment required at this provider.
          </Text>
        </View>

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
            <Text style={st.sectionTitle}>Patient Reviews</Text>
            <Text style={st.reviewCount}>{reviewCount} reviews</Text>
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
            <Text style={st.emptyText}>No reviews yet</Text>
          )}
        </MCard>
      </ScrollArea>
    </Screen>
  )
}

export default ProviderProfileScreen

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */
const st = StyleSheet.create({
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

  infoPanel: { backgroundColor: colors.bg, borderRadius: radii.default, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoDivider: { height: 1, backgroundColor: colors.border },
  infoLabel: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.textSub },
  infoValue: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneLinkText: { fontSize: 13, fontFamily: fontWeights.bold, color: colors.blue },

  sectionTitle: { fontSize: 15, fontFamily: fontWeights.bold, color: colors.text, marginBottom: 12 },

  aboutText: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 20, marginBottom: 14 },
  infoPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1, borderColor: colors.blue, backgroundColor: colors.blue3 },
  infoPillText: { fontSize: 11, fontFamily: fontWeights.semiBold, color: colors.blue },

  serviceTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  serviceTagText: { fontSize: 12, fontFamily: fontWeights.medium, color: colors.text },
  actionOptions: { gap: 10 },
  actionOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.bg,
    padding: 14,
  },
  actionOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionBody: { flex: 1, gap: 4 },
  actionOptionTitle: { fontSize: 14, fontFamily: fontWeights.bold, color: colors.text },
  actionOptionText: { fontSize: 12, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 18 },
  bookingIntro: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    color: colors.textSub,
    lineHeight: 18,
    marginBottom: 14,
  },

  locationAddress: { fontSize: 13, fontFamily: fontWeights.regular, color: colors.textSub, lineHeight: 20, marginBottom: 14 },
  mapBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  mapHint: { fontSize: 11, fontFamily: fontWeights.regular, color: colors.textLight, lineHeight: 16 },

  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  hoursRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  hoursDay: { fontSize: 13, fontFamily: fontWeights.medium, color: colors.text },
  hoursValue: { fontSize: 13, fontFamily: fontWeights.semiBold, color: colors.textSub },
  hoursTodayDay: { color: colors.blue, fontFamily: fontWeights.bold },
  hoursTodayValue: { color: colors.blue, fontFamily: fontWeights.bold },
  hoursClosed: { fontSize: 13, fontFamily: fontWeights.semiBold, color: colors.error },

  creditBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.blue3, borderRadius: radii.default, padding: 14 },
  creditBannerText: { flex: 1, fontSize: 12, fontFamily: fontWeights.medium, color: colors.navy, lineHeight: 18 },

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
