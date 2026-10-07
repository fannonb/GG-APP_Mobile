import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights, radii } from '@/theme'
import CalendarIcon from '@/icons/CalendarIcon'
import PharmacyIcon from '@/icons/PharmacyIcon'
import SectionHeader from './SectionHeader'

export interface VisitSummary {
  /** e.g. "Thu, Oct 8" */
  dateLabel: string
  time: string
  provider: string
  service?: string
  confirmed: boolean
  /** "Today" / "Tomorrow" / "In 3 days" */
  relative: string
  onPress: () => void
}

export interface PrescriptionSummary {
  provider: string
  statusLabel: string
  ready: boolean
  onPress: () => void
}

/**
 * What's coming up in the patient's care: the next visit and any medication
 * order in progress. With nothing booked, it offers to book instead of
 * showing a dead "No upcoming appointments" card.
 */
export default function CareSection({
  visit,
  prescription,
  onBook,
  onViewAll,
}: {
  visit: VisitSummary | null
  prescription: PrescriptionSummary | null
  onBook: () => void
  onViewAll: () => void
}) {
  return (
    <View>
      <SectionHeader title="Your care" action="Appointments" onAction={onViewAll} />
      <View style={styles.stack}>
        {visit ? (
          <Pressable
            onPress={visit.onPress}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Next visit ${visit.relative}, ${visit.dateLabel} at ${visit.time} with ${visit.provider}. ${visit.confirmed ? 'Confirmed' : 'Waiting for confirmation'}`}
          >
            <View style={styles.dateBlock}>
              <Text style={styles.dateRelative}>{visit.relative}</Text>
              <Text style={styles.dateTime}>{visit.time}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.kicker}>Next visit · {visit.dateLabel}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {visit.provider}
              </Text>
              {visit.service ? (
                <Text style={styles.detail} numberOfLines={1}>
                  {visit.service}
                </Text>
              ) : null}
              <View style={[styles.status, visit.confirmed ? styles.statusGood : styles.statusWait]}>
                <Text style={[styles.statusText, visit.confirmed ? styles.statusTextGood : styles.statusTextWait]}>
                  {visit.confirmed ? 'Confirmed' : 'Waiting for provider'}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <CalendarIcon size={20} color={colors.blueInk} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>No visits booked</Text>
              <Text style={styles.detail}>Book with a verified clinic, lab or specialist near you.</Text>
            </View>
            <Pressable
              onPress={onBook}
              style={({ pressed }) => [styles.bookButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.bookText}>Book</Text>
            </Pressable>
          </View>
        )}

        {prescription ? (
          <Pressable
            onPress={prescription.onPress}
            style={({ pressed }) => [styles.rxCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Prescription at ${prescription.provider}: ${prescription.statusLabel}`}
          >
            <View style={[styles.rxIcon, prescription.ready && styles.rxIconReady]}>
              <PharmacyIcon size={18} color={prescription.ready ? colors.success : colors.blueInk} />
            </View>
            <View style={styles.body}>
              <Text style={styles.kicker}>Prescription</Text>
              <Text style={styles.title} numberOfLines={1}>
                {prescription.statusLabel}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {prescription.provider}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  // Same pale-blue tile as the category icons, so the home has one accent.
  dateBlock: {
    width: 76,
    borderRadius: 16,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dateRelative: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: colors.blueInk,
  },
  dateTime: {
    fontFamily: fontWeights.extraBold,
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    color: colors.textSub,
  },
  title: {
    fontFamily: fontWeights.bold,
    fontSize: 16,
    color: colors.text,
  },
  detail: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSub,
  },
  status: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusGood: {
    backgroundColor: colors.successBg,
  },
  statusWait: {
    backgroundColor: colors.warningBg,
  },
  statusText: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
  },
  statusTextGood: {
    color: colors.success,
  },
  statusTextWait: {
    color: colors.warning,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.full,
  },
  bookText: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  rxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  rxIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxIconReady: {
    backgroundColor: colors.successBg,
  },
})
