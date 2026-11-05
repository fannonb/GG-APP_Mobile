import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { animateNextLayout } from '@/lib/motion'
import { colors, fontWeights, radii } from '@/theme'
import ChevronRightIcon from '@/icons/ChevronRightIcon'
import type { DismissibleAttentionItem } from '@/lib/attention-dismissals'
import SectionHeader from './SectionHeader'

/** alert = something went wrong · action = waiting on you · info = in progress · good = good news */
export type AttentionTone = 'alert' | 'action' | 'info' | 'good'

export interface AttentionItem extends DismissibleAttentionItem {
  tone: AttentionTone
  /** Icon component; receives the tone's ink colour. */
  Icon: React.ComponentType<{ size?: number; color?: string }>
  onPress: () => void
  /** Short verb shown as a button on the top item, e.g. "Review". */
  actionLabel?: string
  /** The item's own side effect on dismiss, e.g. marking a notification read. */
  onDismiss?: () => void
  /** While this item is visible the home promo strip stays hidden (web's hasUnresolvedAction). */
  blocksAd?: boolean
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
 * rest open on tap. Pass `items` already filtered to the visible ones: when
 * none are left the whole card, header included, is not rendered.
 */
export default function AttentionList({
  items,
  limit = 3,
  expanded,
  onToggleExpanded,
  onDismiss,
}: {
  items: AttentionItem[]
  limit?: number
  expanded: boolean
  onToggleExpanded: () => void
  /** Persists a dismissal. When given, every row gets a dismiss button. */
  onDismiss?: (item: AttentionItem) => void
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
          <Row
            key={item.id}
            item={item}
            first={i === 0}
            last={i === visible.length - 1 && hidden === 0}
            onDismiss={onDismiss}
          />
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

function Row({
  item,
  first,
  last,
  onDismiss,
}: {
  item: AttentionItem
  first: boolean
  last: boolean
  onDismiss?: (item: AttentionItem) => void
}) {
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
        {onDismiss ? null : <ChevronRightIcon size={16} color={colors.textLight} />}
      </Pressable>
      {onDismiss ? (
        <Pressable
          onPress={() => {
            animateNextLayout()
            onDismiss(item)
            item.onDismiss?.()
          }}
          style={styles.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          accessibilityHint={`Hides: ${item.title}`}
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
    paddingRight: 4,
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
    fontSize: 16,
    lineHeight: 21,
    color: colors.text,
  },
  detail: {
    fontFamily: fontWeights.regular,
    fontSize: 14.5,
    lineHeight: 20,
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
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  // 44pt touch target; the visible glyph is centred in it and the box is pulled up to line up with the title.
  dismiss: {
    marginTop: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14.5,
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
    fontSize: 15.5,
    color: colors.blueInk,
  },
})
