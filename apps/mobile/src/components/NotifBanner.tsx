import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, fontWeights, radii } from '@/theme'

export type NotifTone = 'success' | 'info' | 'warning' | 'error' | 'purple' | 'brand' | 'navy'

/**
 * Tone drives the whole banner, not just the icon chip. Previously the
 * container, title, body and CTA were hardcoded teal, so a low-balance warning
 * and a credit approval looked identical apart from a 36px square.
 *
 * `ink` is used for the title and CTA fill and is AA on `fill`; `body` is the
 * same hue lightened only as far as it can go while staying AA.
 */
const TONES: Record<NotifTone, { ink: string; fill: string; edge: string }> = {
  success: { ink: colors.blueInk, fill: '#F0F8FF', edge: 'rgba(11,114,187,0.2)' },
  info:    { ink: colors.blueInk, fill: '#F0F8FF', edge: 'rgba(11,114,187,0.2)' },
  warning: { ink: colors.navy, fill: '#FFF8E6', edge: 'rgba(9,28,68,0.15)' },
  error:   { ink: colors.navy, fill: '#F0F4FA', edge: 'rgba(9,28,68,0.2)' },
  purple:  { ink: colors.purple, fill: colors.purpleBg, edge: 'rgba(91,63,191,0.22)' },
  brand:   { ink: colors.blueInk, fill: '#E6F4FF', edge: 'rgba(11,114,187,0.25)' },
  navy:    { ink: colors.navy, fill: '#F0F4FA', edge: 'rgba(9,28,68,0.18)' },
}

interface NotifBannerProps {
  icon: React.ReactNode
  tone?: NotifTone
  title: string
  body: string
  sub?: string
  cta?: string
  onCta?: () => void
  onDismiss?: () => void
  /** Called once after this banner is rendered as viewed. */
  onViewed?: () => void
}

export default function NotifBanner({
  icon,
  tone = 'info',
  title,
  body,
  sub,
  cta,
  onCta,
  onDismiss,
  onViewed,
}: NotifBannerProps) {
  const viewedRef = useRef(false)
  const t = TONES[tone] ?? TONES.info

  useEffect(() => {
    if (viewedRef.current || !onViewed) return
    viewedRef.current = true
    onViewed()
  }, [onViewed])

  return (
    <View style={[styles.container, { backgroundColor: t.fill, borderColor: t.edge }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.ink }]}>{icon}</View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSub }]}>{body}</Text>
        {sub ? <Text style={[styles.sub, { color: t.ink }]}>{sub}</Text> : null}
      </View>

      <View style={styles.right}>
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            style={[styles.dismissBtn, { borderColor: t.edge }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
          >
            <Text style={[styles.dismissText, { color: t.ink }]}>✕</Text>
          </Pressable>
        )}
        {cta && onCta && (
          <Pressable
            onPress={onCta}
            style={[styles.ctaBtn, { backgroundColor: t.ink }]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>{cta}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radii.large,
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: fontWeights.bold,
  },
  body: {
    fontSize: 12,
    fontFamily: fontWeights.regular,
    lineHeight: 17,
  },
  sub: {
    fontSize: 12,
    fontFamily: fontWeights.bold,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
  },
  ctaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  ctaText: {
    fontSize: 11,
    fontFamily: fontWeights.bold,
    color: '#FFFFFF',
  },
})
