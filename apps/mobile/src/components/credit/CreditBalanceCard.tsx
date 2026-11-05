import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Pressable from '@/components/Pressable'
import { PartnerLogo } from '@/components/PartnerLogo'
import { colors, fontWeights, radii } from '@/theme'
import { formatCurrency } from '@gg/shared-utils'

/** Silver edge, so the card reads as a card on the grey backdrop. */
export const CARD_EDGE = '#C7CFDB'

/** Light grey-blue on navy: legible at small sizes (about 8:1). */
const SOFT_TEXT = '#C9D6EA'

export interface CardTag {
  text: string
  tone: 'info' | 'warning'
}

/**
 * The navy card face shared by every credit state. The financier's logo and
 * name sit at the top of the card, because the money is theirs.
 */
export function CreditCardFace({
  partnerId,
  partnerName,
  tag,
  topRight,
  children,
}: {
  partnerId?: string
  partnerName: string
  tag?: CardTag
  /** Shown top right when there is no tag, e.g. a "View allocation" link. */
  topRight?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <LinearGradient
      colors={['#091C44', '#132854']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.face}
    >
      <View style={styles.identityRow}>
        <PartnerLogo partnerId={partnerId} partnerName={partnerName} size="sm" />
        {tag ? (
          <View style={[styles.tag, tag.tone === 'warning' ? styles.tagWarning : styles.tagInfo]}>
            <Text style={[styles.tagText, tag.tone === 'warning' ? styles.tagTextWarning : styles.tagTextInfo]}>
              {tag.text}
            </Text>
          </View>
        ) : (
          topRight ?? null
        )}
      </View>
      <Text style={styles.financedBy} numberOfLines={1}>
        Financed by {partnerName}
      </Text>

      {children}
    </LinearGradient>
  )
}

/**
 * The approved balance, trimmed: the available amount, a usage bar and the
 * limit. Labels are not repeated, so "available" appears once.
 */
export function CreditBalanceCard({
  partnerId,
  partnerName,
  available,
  limit,
  currency,
  isLow,
  topRight,
  footer,
}: {
  partnerId?: string
  partnerName: string
  available: number
  limit: number
  currency: string
  isLow: boolean
  topRight?: React.ReactNode
  /** Card actions, set off by a hairline at the bottom of the card. */
  footer?: React.ReactNode
}) {
  const used = Math.max(0, limit - available)
  const usedPct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <CreditCardFace
      partnerId={partnerId}
      partnerName={partnerName}
      tag={isLow ? { text: 'Running low', tone: 'warning' } : undefined}
      topRight={topRight}
    >
      <View style={styles.figureRow}>
        <Text style={styles.figure} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(available, currency)}
        </Text>
        <Text style={styles.figureUnit}>available</Text>
      </View>

      <View style={styles.track}>
        <LinearGradient
          colors={isLow ? ['#F5B54A', '#E8962A'] : ['#5EC4FF', '#38B6FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.max(usedPct, usedPct > 0 ? 3 : 0)}%` }]}
        />
      </View>

      <View style={styles.captionRow}>
        <Text style={styles.caption}>of {formatCurrency(limit, currency)} limit</Text>
        <Text style={styles.caption}>{usedPct}% used</Text>
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </CreditCardFace>
  )
}

/** A compact button for the card footer: blue accent fill, or a translucent outline. */
export function CardAction({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
}) {
  const primary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, primary ? styles.actionPrimary : styles.actionSecondary]}
      accessibilityRole="button"
    >
      <Text style={[styles.actionText, primary ? styles.actionTextPrimary : styles.actionTextSecondary]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

/** A small text link for the card's top-right corner. */
export function CardLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.link} accessibilityRole="link">
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  face: {
    borderRadius: radii.large,
    borderWidth: 1.5,
    borderColor: CARD_EDGE,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#091C44',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  financedBy: {
    fontFamily: fontWeights.regular,
    fontSize: 12.5,
    color: SOFT_TEXT,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  tagInfo: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tagWarning: {
    backgroundColor: colors.warningBg,
  },
  tagText: {
    fontFamily: fontWeights.bold,
    fontSize: 12.5,
  },
  tagTextInfo: {
    color: '#FFFFFF',
  },
  tagTextWarning: {
    color: colors.warning,
  },
  figureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  figure: {
    flexShrink: 1,
    fontFamily: fontWeights.extraBold,
    fontSize: 28,
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  figureUnit: {
    fontFamily: fontWeights.semiBold,
    fontSize: 14,
    color: SOFT_TEXT,
    marginBottom: 4,
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 14,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: radii.full,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  caption: {
    fontFamily: fontWeights.medium,
    fontSize: 13,
    color: SOFT_TEXT,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  action: {
    flex: 1,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  // Navy text on the blue accent (white on blue is only 2.3:1).
  actionPrimary: {
    backgroundColor: colors.blue,
  },
  actionSecondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  actionText: {
    fontFamily: fontWeights.bold,
    fontSize: 14.5,
  },
  actionTextPrimary: {
    color: colors.navy900,
  },
  actionTextSecondary: {
    color: '#FFFFFF',
  },
  link: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  linkText: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
})
