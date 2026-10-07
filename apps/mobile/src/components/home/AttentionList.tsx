import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { animateNextLayout } from '@/lib/motion'
import { colors, fontWeights, radii } from '@/theme'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import SectionHeader from './SectionHeader'

/** alert = something went wrong · action = waiting on you · info = in progress · good = good news */
export type AttentionTone = 'alert' | 'action' | 'info' | 'good'

export interface AttentionItem {
  key: string
  tone: AttentionTone
  /** Icon component; receives the tone's ink colour. */
  Icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  detail: string
  onPress: () => void
  /** Short verb shown as a button on the top item, e.g. "Review". */
  actionLabel?: string
  onDismiss?: () => void
}

export const TONE_RANK: Record<AttentionTone, number> = { alert: 0, action: 1, info: 2, good: 3 }

const TONES: Record<AttentionTone, { ink: string; bg: string }> = {
  alert: { ink: colors.error, bg: colors.errorBg },
  action: { ink: colors.warning, bg: colors.warningBg },
  info: { ink: colors.blueInk, bg: colors.blue100 },
  good: { ink: colors.success, bg: colors.successBg },
}

/**
 * Everything waiting on the patient as one compact, ranked list instead of a
 * stack of full-width banners. Only the most urgent row carries a button; the
 * rest open on tap.
 */
export default function AttentionList({
  items,
  limit = 3,
  expanded,
  onToggleExpanded,
}: {
  items: AttentionItem[]
  limit?: number
  expanded: boolean
  onToggleExpanded: () => void
}) {
  if (items.length === 0) return null
  const visible = expanded ? items : items.slice(0, limit)
  const hidden = items.length - visible.length

  return (
    <View>
      <SectionHeader
        title="Needs your attention"
        count={items.length}
        action={items.length > limit ? (expanded ? 'Show less' : `See all`) : undefined}
        onAction={() => {
          animateNextLayout()
          onToggleExpanded()
        }}
      />
      <View style={styles.card}>
        {visible.map((item, i) => (
          <Row key={item.key} item={item} first={i === 0} last={i === visible.length - 1 && hidden === 0} />
        ))}
        {hidden > 0 ? (
          <Pressable
            onPress={() => {
              animateNextLayout()
              onToggleExpanded()
            }}
            style={styles.moreRow}
            accessibilityRole="button"
          >
            <Text style={styles.moreText}>
              {hidden} more {hidden === 1 ? 'update' : 'updates'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function Row({ item, first, last }: { item: AttentionItem; first: boolean; last: boolean }) {
  const tone = TONES[item.tone]
  const showButton = first && Boolean(item.actionLabel)
  // The row and its dismiss button are siblings: nested buttons confuse screen readers.
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.detail}${showButton ? `. ${item.actionLabel}` : ''}`}
      >
        <View style={[styles.iconChip, { backgroundColor: tone.bg }]}>
          <item.Icon size={20} color={tone.ink} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.detail} numberOfLines={2}>
            {item.detail}
          </Text>
          {showButton ? (
            <View style={[styles.button, { backgroundColor: colors.navy }]}>
              <Text style={styles.buttonText}>{item.actionLabel}</Text>
            </View>
          ) : null}
        </View>
        {item.onDismiss ? null : <ChevronRightIcon size={16} color={colors.textLight} />}
      </Pressable>
      {item.onDismiss ? (
        <Pressable
          onPress={() => {
            animateNextLayout()
            item.onDismiss?.()
          }}
          hitSlop={12}
          style={styles.dismiss}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss: ${item.title}`}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 14,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fontWeights.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  detail: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSub,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  buttonText: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dismiss: {
    marginTop: 14,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 13,
    color: colors.textLight,
    fontFamily: fontWeights.bold,
  },
  moreRow: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moreText: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.blueInk,
  },
})
