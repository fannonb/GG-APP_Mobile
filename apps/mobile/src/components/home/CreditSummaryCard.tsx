import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Pressable from '@/components/Pressable'
import FinancePartnerLogo from '@/components/FinancePartnerLogo'
import { colors, fontWeights, radii } from '@/theme'
import { formatCurrency } from '@gg/shared-utils'
import type { CreditStatus } from '@gg/shared-types'

interface CreditSummaryCardProps {
  status: CreditStatus
  available: number
  limit: number
  currency: string
  isLow: boolean
  partnerId?: string
  partnerName: string
  onApply: () => void
  onViewStatus: () => void
  onRequestIncrease: () => void
  onOpenWallet: () => void
  onHistory: () => void
}

/** Deep end of the logo cyan: white text on it passes AA, unlike the bright accent. */
const CYAN_DEEP = '#0B72BB'

/**
 * The patient's credit at a glance, matching the web wallet card: a light
 * card-face with the finance partner's logo, what's left to spend and how much
 * of the limit is used. New, pending and declined accounts see the same card
 * with the next step instead of a balance.
 */
export default function CreditSummaryCard(props: CreditSummaryCardProps) {
  const { status, partnerName } = props

  if (status === 'approved') return <ActiveCredit {...props} />

  if (status === 'pending') {
    return (
      <Face {...props} tag={{ text: 'Under review', tone: 'info' }}>
        <Text style={styles.title}>Your application is being reviewed</Text>
        <Text style={styles.body}>
          {partnerName} is reviewing your request. Your credit will appear here once approved.
        </Text>
        <Button label="View status" onPress={props.onViewStatus} variant="secondary" />
      </Face>
    )
  }

  if (status === 'rejected') {
    return (
      <Face {...props} tag={{ text: 'Not approved', tone: 'warning' }}>
        <Text style={styles.title}>No active credit line</Text>
        <Text style={styles.body}>Your last application wasn't approved. See the reason and when you can re-apply.</Text>
        <Button label="View decision" onPress={props.onViewStatus} variant="secondary" />
      </Face>
    )
  }

  return (
    <Face {...props}>
      <Text style={styles.title}>Get care now, pay over time</Text>
      <Text style={styles.body}>
        Apply once and pay any verified clinic, lab or pharmacy on GG'APP without paying at the counter.
      </Text>
      <Button label="Apply for credit" onPress={props.onApply} />
    </Face>
  )
}

function ActiveCredit(props: CreditSummaryCardProps) {
  const { available, limit, currency, isLow, onRequestIncrease, onOpenWallet, onHistory } = props
  const used = Math.max(0, limit - available)
  const usedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return (
    <Face {...props} tag={isLow ? { text: 'Running low', tone: 'warning' } : undefined} onWallet={onOpenWallet}>
      {/* The balance opens the wallet; the buttons below are siblings, never nested. */}
      <Pressable
        onPress={onOpenWallet}
        accessibilityRole="button"
        accessibilityLabel={`Available to spend ${formatCurrency(available, currency)}. ${formatCurrency(used, currency)} used of ${formatCurrency(limit, currency)} limit. Opens your wallet.`}
      >
        <Text style={styles.amountLabel}>Available to spend</Text>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(available, currency)}
        </Text>
        <View style={styles.track}>
          <LinearGradient
            colors={isLow ? ['#F5B54A', '#E8962A'] : ['#5EC4FF', '#1A9BE6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${Math.max(usedPct, usedPct > 0 ? 3 : 0)}%` }]}
          />
        </View>
        <View style={styles.usageRow}>
          <Text style={styles.usage}>
            <Text style={styles.usageStrong}>{formatCurrency(used, currency)}</Text> used
          </Text>
          <Text style={styles.usage}>
            of <Text style={styles.usageStrong}>{formatCurrency(limit, currency)}</Text> limit
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button label={isLow ? 'Request increase' : 'Increase limit'} onPress={onRequestIncrease} flex />
        <Button label="History" onPress={onHistory} variant="secondary" flex />
      </View>
    </Face>
  )
}

/** The card face: gradient, soft rings, and the partner's logo on a white chip. */
function Face({
  partnerId,
  partnerName,
  tag,
  onWallet,
  children,
}: CreditSummaryCardProps & {
  tag?: { text: string; tone: 'info' | 'warning' }
  onWallet?: () => void
  children: React.ReactNode
}) {
  return (
    <LinearGradient
      colors={['#F2FAFF', '#DDF1FF', '#C9E9FF']}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Concentric rings, like the face of a payment card. Decoration only. */}
      <View pointerEvents="none" style={styles.ringOuter} />
      <View pointerEvents="none" style={styles.ringInner} />

      <View style={styles.topRow}>
        <View style={styles.partnerChip} accessible accessibilityLabel={`Credit by ${partnerName}`}>
          {partnerId ? (
            <FinancePartnerLogo partnerId={partnerId} height={partnerId === 'equity' ? 28 : 24} />
          ) : (
            <Text style={styles.partnerText}>{partnerName}</Text>
          )}
        </View>
        {tag ? (
          <View style={[styles.tag, tag.tone === 'warning' ? styles.tagWarning : styles.tagInfo]}>
            <Text style={[styles.tagText, tag.tone === 'warning' ? styles.tagTextWarning : styles.tagTextInfo]}>
              {tag.text}
            </Text>
          </View>
        ) : onWallet ? (
          <Pressable onPress={onWallet} hitSlop={8} style={styles.walletLink} accessibilityRole="link">
            <Text style={styles.walletLinkText}>View wallet</Text>
          </Pressable>
        ) : null}
      </View>

      {children}
    </LinearGradient>
  )
}

function Button({
  label,
  onPress,
  variant = 'primary',
  flex,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  flex?: boolean
}) {
  const primary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary, flex ? { flex: 1 } : styles.buttonInline]}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: 'rgba(56,182,255,0.28)',
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#0B72BB',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ringOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    right: -110,
    bottom: -160,
    borderRadius: 150,
    borderWidth: 40,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  ringInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    right: -36,
    bottom: -84,
    borderRadius: 80,
    backgroundColor: 'rgba(56,182,255,0.12)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  partnerChip: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    shadowColor: '#0B72BB',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  partnerText: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
    color: colors.text,
  },
  walletLink: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  walletLinkText: {
    fontFamily: fontWeights.bold,
    fontSize: 13,
    color: CYAN_DEEP,
  },
  amountLabel: {
    fontFamily: fontWeights.semiBold,
    fontSize: 13,
    color: CYAN_DEEP,
  },
  amount: {
    fontFamily: fontWeights.extraBold,
    fontSize: 34,
    letterSpacing: -1.2,
    color: colors.text,
    marginTop: 4,
  },
  track: {
    height: 10,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    marginTop: 16,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: radii.full,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  usage: {
    fontFamily: fontWeights.regular,
    fontSize: 13,
    color: colors.textSub,
  },
  usageStrong: {
    fontFamily: fontWeights.bold,
    color: colors.text,
  },
  title: {
    fontFamily: fontWeights.extraBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.text,
  },
  body: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSub,
    marginTop: 6,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  button: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInline: {
    alignSelf: 'flex-start',
  },
  // Navy, like every other primary button on home; blue stays the accent.
  buttonPrimary: {
    backgroundColor: colors.navy,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontFamily: fontWeights.bold,
    fontSize: 14,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  tagInfo: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  tagWarning: {
    backgroundColor: colors.warningBg,
  },
  tagText: {
    fontFamily: fontWeights.bold,
    fontSize: 12,
  },
  tagTextInfo: {
    color: CYAN_DEEP,
  },
  tagTextWarning: {
    color: colors.warning,
  },
})
