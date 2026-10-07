import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { colors, fontWeights, radii } from '@/theme'
import CheckIcon from '@/icons/CheckIcon'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import SectionHeader from './SectionHeader'

export interface GetStartedStep {
  key: string
  title: string
  detail: string
  done: boolean
  actionLabel: string
  onPress: () => void
}

/**
 * The new-account checklist. Completed steps collapse into the progress line,
 * the next step is highlighted with a button, later steps stay tappable rows.
 * The card disappears once every step is done.
 */
export default function GetStartedCard({ steps }: { steps: GetStartedStep[] }) {
  const doneCount = steps.filter(s => s.done).length
  if (doneCount === steps.length) return null

  const remaining = steps.filter(s => !s.done)
  const [next, ...later] = remaining
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <View>
      <SectionHeader title="Get started" />
      <View style={styles.card}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {doneCount} of {steps.length} done
          </Text>
          <Text style={styles.progressHint}>{remaining.length === 1 ? 'Last step' : `${remaining.length} steps left`}</Text>
        </View>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: steps.length, now: doneCount }}
        >
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>

        {/* Done steps, as a compact recap */}
        <View style={styles.doneList}>
          {steps
            .filter(s => s.done)
            .map(s => (
              <View key={s.key} style={styles.doneItem}>
                <View style={styles.doneDot}>
                  <CheckIcon size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.doneText}>{s.title}</Text>
              </View>
            ))}
        </View>

        {/* The one thing to do now */}
        <View style={styles.next}>
          <Text style={styles.nextLabel}>Next step</Text>
          <Text style={styles.nextTitle}>{next.title}</Text>
          <Text style={styles.nextDetail}>{next.detail}</Text>
          <Pressable
            onPress={next.onPress}
            style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.nextButtonText}>{next.actionLabel}</Text>
          </Pressable>
        </View>

        {/* Steps after that */}
        {later.map((step, i) => (
          <Pressable
            key={step.key}
            onPress={step.onPress}
            style={({ pressed }) => [
              styles.laterRow,
              i < later.length - 1 && styles.laterDivider,
              pressed && styles.laterPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${step.title}. ${step.detail}`}
          >
            <View style={styles.laterDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.laterTitle}>{step.title}</Text>
              <Text style={styles.laterDetail} numberOfLines={1}>
                {step.detail}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={colors.textLight} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressText: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    color: colors.text,
  },
  progressHint: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: colors.textSub,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    marginTop: 8,
    overflow: 'hidden',
  },
  // Blue like the credit card's bar: one accent across home.
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  doneList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  doneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.blue100,
  },
  doneDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.blueInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.blueInk,
  },
  next: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.blue100,
  },
  nextLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 12,
    color: colors.blueInk,
  },
  nextTitle: {
    fontFamily: fontWeights.bold,
    fontSize: 17,
    color: colors.text,
    marginTop: 2,
  },
  nextDetail: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSub,
    marginTop: 4,
  },
  nextButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.navy,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  pressed: {
    opacity: 0.88,
  },
  nextButtonText: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  laterDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  laterPressed: {
    opacity: 0.6,
  },
  laterDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  laterTitle: {
    fontFamily: fontWeights.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  laterDetail: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
    marginTop: 1,
  },
})
