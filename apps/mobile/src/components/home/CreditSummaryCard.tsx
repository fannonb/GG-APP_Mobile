import React from 'react'
import { Text, StyleSheet } from 'react-native'
import Pressable from '@/components/Pressable'
import { CardAction, CardLink, CreditBalanceCard, CreditCardFace } from '@/components/credit/CreditBalanceCard'
import { colors, fontWeights, radii } from '@/theme'
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

/**
 * The patient's credit at a glance, in the same navy card as the allocation. An
 * approved line shows the balance; new, pending and declined accounts see the
 * same card with the next step instead of a balance.
 */
export default function CreditSummaryCard(props: CreditSummaryCardProps) {
  const { status, partnerId, partnerName } = props

  if (status === 'approved') return <ActiveCredit {...props} />

  if (status === 'pending') {
    return (
      <CreditCardFace partnerId={partnerId} partnerName={partnerName} tag={{ text: 'Under review', tone: 'info' }}>
        <Text style={styles.title}>Your application is being reviewed</Text>
        <Text style={styles.body}>
          {partnerName} is reviewing your request. Your credit will appear here once approved.
        </Text>
        <CardButton label="View status" onPress={props.onViewStatus} variant="secondary" />
      </CreditCardFace>
    )
  }

  if (status === 'rejected') {
    return (
      <CreditCardFace partnerId={partnerId} partnerName={partnerName} tag={{ text: 'Not approved', tone: 'warning' }}>
        <Text style={styles.title}>No active allocation</Text>
        <Text style={styles.body}>Your last application wasn't approved. See the reason and when you can re-apply.</Text>
        <CardButton label="View decision" onPress={props.onViewStatus} variant="secondary" />
      </CreditCardFace>
    )
  }

  return (
    <CreditCardFace partnerId={partnerId} partnerName={partnerName}>
      <Text style={styles.title}>Get care now, pay over time</Text>
      <Text style={styles.body}>
        Apply once and pay any verified clinic, lab or pharmacy on GG'APP without paying at the counter.
      </Text>
      <CardButton label="Apply for an allocation" onPress={props.onApply} />
    </CreditCardFace>
  )
}

/**
 * Actions live in the card's own footer, so the whole unit sits inside the
 * navy header instead of the buttons straddling its edge.
 */
function ActiveCredit(props: CreditSummaryCardProps) {
  const { partnerId, partnerName, available, limit, currency, isLow, onOpenWallet, onRequestIncrease, onHistory } = props
  return (
    <CreditBalanceCard
      partnerId={partnerId}
      partnerName={partnerName}
      available={available}
      limit={limit}
      currency={currency}
      isLow={isLow}
      topRight={<CardLink label="View allocation" onPress={onOpenWallet} />}
      footer={
        <>
          <CardAction label={isLow ? 'Request increase' : 'Increase limit'} onPress={onRequestIncrease} />
          <CardAction label="History" onPress={onHistory} variant="secondary" />
        </>
      }
    />
  )
}

/** Buttons inside the navy card: blue accent fill, or a translucent outline. */
function CardButton({
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
      style={[styles.cardButton, primary ? styles.cardButtonPrimary : styles.cardButtonSecondary]}
      accessibilityRole="button"
    >
      <Text style={[styles.cardButtonText, primary ? styles.cardButtonTextPrimary : styles.cardButtonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fontWeights.extraBold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  body: {
    fontFamily: fontWeights.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: '#C9D6EA',
    marginTop: 6,
    marginBottom: 14,
  },
  cardButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cardButtonPrimary: {
    backgroundColor: colors.blue,
  },
  cardButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardButtonText: {
    fontFamily: fontWeights.bold,
    fontSize: 15.5,
  },
  // Navy text on the blue accent (white on blue is only 2.3:1).
  cardButtonTextPrimary: {
    color: colors.navy900,
  },
  cardButtonTextSecondary: {
    color: '#FFFFFF',
  },
})
